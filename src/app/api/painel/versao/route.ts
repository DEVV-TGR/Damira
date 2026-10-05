import { NextResponse } from "next/server";
import { VERSAO_DO_SITE, versaoEmCache } from "@/lib/painel-versao";

/**
 * A pergunta do polling do painel. Pública de propósito: um número que sobe e a
 * versão do site não dizem nada sobre os pedidos (`painel.md`). A cache é a do
 * servidor (`painel-versao.ts`); ao browser vai sem cache, para ele perguntar
 * mesmo de 10 em 10 segundos.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { versao: await versaoEmCache(), site: VERSAO_DO_SITE },
    { headers: { "Cache-Control": "no-store" } },
  );
}
