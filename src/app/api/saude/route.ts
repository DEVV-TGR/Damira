import { NextResponse } from "next/server";

/**
 * O que o monitor de uptime pergunta (`robustez.md` › Monitorização): só se a
 * aplicação está de pé.
 *
 * ⚠️ **Não consulta a base de dados, nem nada que a consulte** (regra 6 do
 * `AGENTS.md`). Um monitor de 5 em 5 minutos mantinha-a acordada para sempre. Os
 * erros da base de dados veem-se noutro sítio.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
