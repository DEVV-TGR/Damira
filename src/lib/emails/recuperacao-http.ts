import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
import type { ResumoRecuperacao } from "./recuperacao";

const resposta = (status: number, corpo: unknown) => Response.json(corpo, { status, headers: { "Cache-Control": "no-store" } });
const hash = (texto: string) => createHash("sha256").update(texto).digest();

/** O chamador não pode escolher base, destinatários, limites ou instante pelo URL. */
export async function atenderRecuperacaoEmails(
  pedido: Request, ambiente: Ambiente,
  recuperar: (agora: Date) => Promise<ResumoRecuperacao>, agora = new Date(),
): Promise<Response> {
  const segredo = ambiente.CRON_SECRET;
  // Sem segredo válido nunca se importa a fonte nem se consulta a BD. Comparar hashes
  // de tamanho fixo evita que o prefixo do segredo influencie o tempo da comparação.
  if (!segredo || !/^[A-Za-z0-9_-]{32,256}$/.test(segredo) ||
    !timingSafeEqual(hash(pedido.headers.get("authorization") ?? ""), hash(`Bearer ${segredo}`))) {
    return resposta(401, { ok: false, erro: "nao-autorizado" });
  }
  if (ambiente.VERCEL_ENV !== "production") return resposta(404, { ok: false, erro: "recuperacao-so-em-producao" });
  if (ambiente.EMAILS_RECUPERACAO_ATIVA !== "1") return resposta(503, { ok: false, erro: "recuperacao-desligada" });
  let endereco: URL;
  try { endereco = new URL(ambiente.DATABASE_URL ?? ""); }
  catch { return resposta(503, { ok: false, erro: "sem-base-de-dados" }); }
  if (!["postgres:", "postgresql:"].includes(endereco.protocol) || !endereco.hostname.endsWith(".neon.tech") || !endereco.pathname.slice(1)) {
    return resposta(503, { ok: false, erro: "sem-base-de-dados" });
  }
  if (!ambiente.RESEND_API_KEY?.trim()) return resposta(503, { ok: false, erro: "sem-chave-resend" });
  if (!z.email().safeParse(ambiente.EMAIL_REMETENTE?.trim()).success) return resposta(503, { ok: false, erro: "sem-remetente" });
  const destino = ambiente.EMAILS_SO_PARA?.trim();
  if ((destino || emModoDeTeste(ambiente)) && !z.email().safeParse(destino).success) {
    return resposta(503, { ok: false, erro: "sem-destino-seguro" });
  }
  try {
    const resumo = await recuperar(agora);
    const ok = resumo.paragem === "sem-trabalho";
    console.info("[emails-recuperacao]", JSON.stringify(resumo));
    return resposta(ok ? 200 : 503, { ok, ...resumo });
  } catch {
    console.error("[emails-recuperacao] falha-interna");
    return resposta(503, { ok: false, erro: "falha-interna" });
  }
}
