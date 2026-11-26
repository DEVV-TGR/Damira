import { headers } from "next/headers";
import { contadorEmMemoria, receberFotoDoBolo } from "@/lib/fotos-bolo";
import { emModoDeTeste } from "@/lib/modo-teste";

/**
 * O envio das fotos do bolo personalizado (`src/lib/fotos-bolo.ts`). Pública:
 * quem monta o bolo não tem conta, e a conta nunca é obrigatória (AGENTS.md).
 * Por isso tem limite por IP.
 */
export const dynamic = "force-dynamic";

const contarEnvio = contadorEmMemoria();

export async function POST(pedido: Request) {
  const cabecalhos = await headers();
  /* Na Vercel, o primeiro IP do `x-forwarded-for` é o do cliente. */
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  return receberFotoDoBolo(pedido, ip, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    modoDeTeste: emModoDeTeste(),
    contarEnvio,
  });
}
