import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { Papel } from "@/lib/dados/tipos";

/**
 * # As fotos dos produtos, no Vercel Blob (#32)
 *
 * ⚠️ **A foto vai diretamente do browser para o Blob, sem passar pelo nosso
 * servidor.** Uma foto de telemóvel tem 3–8 MB e as funções da Vercel recusam
 * pedidos acima de ~4,5 MB (`painel-gerente.md` › Fotos). O servidor só faz uma
 * coisa: decide quem pode enviar, e dá-lhe um token curto que deixa enviar uma
 * foto, e mais nada.
 *
 * ⚠️ **Sem `onUploadCompleted`.** O Blob chamava-nos de volta, de um servidor sem
 * o cookie da sessão, e o endereço teria de ser público. Não faz falta: o browser
 * recebe o endereço da foto e grava-o com o produto, pelas ações do painel.
 */

/** Reduzida no browser, tem muito menos; é o teto para o caso de a redução falhar. */
export const MAXIMO_POR_FOTO = 8 * 1024 * 1024;

const TIPOS_DE_FOTO = ["image/webp", "image/jpeg"];
const VALIDADE_DO_TOKEN_MS = 10 * 60_000;

/* Sem `..` nem outras pastas: o token só serve para isto. */
const FORMATO_DO_CAMINHO = /^produtos\/[a-z0-9][a-z0-9-]*\.(webp|jpe?g)$/i;

/* O domínio de uma loja pública do Blob. */
const DOMINIO_DO_BLOB = ".public.blob.vercel-storage.com";

export type DependenciasDoEnvio = {
  /** O `BLOB_READ_WRITE_TOKEN`. Sem ele, o envio não está configurado. */
  token: string | undefined;
  /** O papel da sessão, lido no servidor. `null` sem sessão (regra 8 do `AGENTS.md`). */
  papel: () => Promise<Papel | null>;
  agora: () => Date;
};

const responder = (status: number, corpo: Record<string, unknown>) =>
  Response.json(corpo, { status, headers: { "Cache-Control": "no-store" } });

/** O pedido de um token, de quem o pode ter. O envio em si é entre o browser e o Blob. */
export async function tratarEnvioDeFoto(pedido: Request, deps: DependenciasDoEnvio): Promise<Response> {
  if ((await deps.papel()) !== "gerente") return responder(403, { erro: "sem-permissao" });

  if (!deps.token) {
    console.error("[fotos] falta o BLOB_READ_WRITE_TOKEN");
    return responder(503, { erro: "por-configurar" });
  }

  let corpo: HandleUploadBody;
  try {
    corpo = (await pedido.json()) as HandleUploadBody;
  } catch {
    return responder(400, { erro: "dados-invalidos" });
  }
  if (corpo?.type !== "blob.generate-client-token" || !FORMATO_DO_CAMINHO.test(corpo.payload?.pathname ?? "")) {
    return responder(400, { erro: "dados-invalidos" });
  }

  const resposta = await handleUpload({
    token: deps.token,
    request: pedido,
    body: corpo,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: TIPOS_DE_FOTO,
      maximumSizeInBytes: MAXIMO_POR_FOTO,
      /* Um nome impossível de adivinhar, e nunca por cima de uma foto que já está
         no site: o endereço de cada foto fica em cache para sempre. */
      addRandomSuffix: true,
      validUntil: deps.agora().getTime() + VALIDADE_DO_TOKEN_MS,
    }),
  });
  return responder(200, resposta);
}

const eDoBlob = (endereco: string): boolean => {
  try {
    const { protocol, hostname } = new URL(endereco);
    return protocol === "https:" && hostname.endsWith(DOMINIO_DO_BLOB);
  } catch {
    return false;
  }
};

/**
 * As fotos que um produto deixou de usar. ⚠️ Só as do Blob: uma em `public/` ou
 * noutro sítio qualquer não é nossa para apagar.
 */
export const fotosQueSairam = (antes: readonly string[], depois: readonly string[]): string[] =>
  antes.filter((foto) => eDoBlob(foto) && !depois.includes(foto));

/**
 * Apaga as fotos que saíram. ⚠️ **Uma falha aqui não sobe**: o produto já está
 * gravado, e uma foto órfã custa uns cêntimos, enquanto dizer à gerente que a
 * gravação falhou a punha a repeti-la sem razão.
 */
export async function apagarFotos(
  fotos: readonly string[],
  apagar: (enderecos: string[]) => Promise<void> = (enderecos) => del(enderecos),
): Promise<void> {
  if (fotos.length === 0) return;
  try {
    await apagar([...fotos]);
  } catch (erro) {
    console.error(`[fotos] ficaram ${fotos.length} por apagar: ${erro instanceof Error ? erro.name : typeof erro}`);
  }
}
