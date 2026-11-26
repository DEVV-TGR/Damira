import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { head, put } from "@vercel/blob";

/**
 * # As fotos do bolo personalizado, do lado do servidor
 *
 * O cliente reduz a foto no browser (`reduzirFoto`, 1600 px) e manda-a para
 * `/api/bolos/fotos`. Aqui ela vai para o **Vercel Blob**, em `bolos/<uuid>`; e
 * o pedido guarda só esse caminho (`FORMATO_FOTO_BOLO`).
 *
 * ⚠️ **Sem o token do Blob, só no modo de teste**, a foto fica numa pasta
 * temporária do servidor, para o fluxo inteiro se experimentar em local. Fora
 * do modo de teste, sem Blob, o envio responde que não está configurado: uma
 * foto guardada num disco que a Vercel apaga era um bolo sem a foto do
 * aniversariante.
 *
 * ⚠️ **As fotos são dados pessoais** (`bolos-personalizados.md`): o nome é um
 * UUID, nunca o do ficheiro do cliente, e não se listam em lado nenhum.
 */

export const TIPOS_ACEITES = { "image/webp": "webp", "image/jpeg": "jpg" } as const;
/** Depois de reduzida a 1600 px fica abaixo de 1 MB; 3 MB é folga, não um alvo. */
export const MAXIMO_POR_FOTO = 3 * 1024 * 1024;
/** 3 de referência e 1 para imprimir, com folga para trocar. */
export const ENVIOS_POR_HORA = 12;

const NOME = /^[a-f0-9-]{36}\.(webp|jpg)$/;
export const PASTA_DE_TESTE = path.join(tmpdir(), "damira-bolos");

export type DependenciasFotosBolo = {
  token: string | undefined;
  modoDeTeste: boolean;
  /** Quantos envios este IP já fez na última hora (e conta este). */
  contarEnvio: (ip: string) => number;
};

/**
 * ⚠️ **Provisório: um contador em memória.** O `robustez.md` pede-o na base de
 * dados — na Vercel cada pedido pode cair numa instância diferente, e em memória
 * o limite multiplica-se pelas instâncias. Chega para travar um ciclo de um
 * script; a tabela dos contadores vem com o PR de esquema.
 */
export function contadorEmMemoria(agora: () => number = Date.now) {
  const envios = new Map<string, number[]>();
  return (ip: string): number => {
    const hora = agora() - 60 * 60_000;
    const recentes = (envios.get(ip) ?? []).filter((t) => t > hora);
    recentes.push(agora());
    envios.set(ip, recentes);
    return recentes.length;
  };
}

const json = (corpo: unknown, estado = 200) =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Recebe uma foto (`foto`, num `FormData`) e devolve `{ foto: "bolos/<uuid>.webp" }`. */
export async function receberFotoDoBolo(pedido: Request, ip: string, deps: DependenciasFotosBolo): Promise<Response> {
  if (!deps.token && !deps.modoDeTeste) return json({ erro: "nao-configurado" }, 503);
  if (deps.contarEnvio(ip) > ENVIOS_POR_HORA) return json({ erro: "demasiados-envios" }, 429);

  let ficheiro: FormDataEntryValue | null = null;
  try {
    ficheiro = (await pedido.formData()).get("foto");
  } catch {
    return json({ erro: "invalido" }, 400);
  }
  if (!(ficheiro instanceof Blob)) return json({ erro: "invalido" }, 400);
  const extensao = TIPOS_ACEITES[ficheiro.type as keyof typeof TIPOS_ACEITES];
  if (!extensao) return json({ erro: "tipo" }, 415);
  if (ficheiro.size === 0 || ficheiro.size > MAXIMO_POR_FOTO) return json({ erro: "tamanho" }, 413);

  const nome = `${randomUUID()}.${extensao}`;
  if (deps.token) {
    await put(`bolos/${nome}`, ficheiro, {
      access: "public",
      contentType: ficheiro.type,
      addRandomSuffix: false,
      token: deps.token,
    });
  } else {
    await mkdir(PASTA_DE_TESTE, { recursive: true });
    await writeFile(path.join(PASTA_DE_TESTE, nome), Buffer.from(await ficheiro.arrayBuffer()));
  }
  return json({ foto: `bolos/${nome}` });
}

/**
 * Mostra uma foto: com o Blob, redireciona para ele; no modo de teste sem Blob,
 * lê-a da pasta temporária. ⚠️ Nunca em cache partilhada, e fora dos motores de
 * busca: é a cara de alguém.
 */
export async function mostrarFotoDoBolo(nome: string, deps: Omit<DependenciasFotosBolo, "contarEnvio">): Promise<Response> {
  if (!NOME.test(nome)) return new Response(null, { status: 404 });
  const privado = { "cache-control": "private, no-store", "x-robots-tag": "noindex" };
  if (deps.token) {
    try {
      const { url } = await head(`bolos/${nome}`, { token: deps.token });
      return new Response(null, { status: 302, headers: { ...privado, location: url } });
    } catch {
      return new Response(null, { status: 404, headers: privado });
    }
  }
  if (!deps.modoDeTeste) return new Response(null, { status: 404, headers: privado });
  try {
    const conteudo = await readFile(path.join(PASTA_DE_TESTE, nome));
    const tipo = nome.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(conteudo), { headers: { ...privado, "content-type": tipo } });
  } catch {
    return new Response(null, { status: 404, headers: privado });
  }
}
