"use server";

import { headers } from "next/headers";
import { sessao } from "@/lib/sessao-painel";
import type { AmbitoSaida, ContextoEntrada } from "@/lib/sessao-painel/tipos";

/**
 * As ações da entrada no painel. Só passam à `sessao` o que o browser mandou e
 * o que o servidor sabe (a hora, o IP) — quem decide se entra é ela.
 * Devolvem resultados e nunca rebentam para o browser (`robustez.md`).
 */

async function contexto(): Promise<ContextoEntrada> {
  const cabecalhos = await headers();
  /* O primeiro da lista é o do cliente; os outros são proxies pelo caminho.
     Serve para contar tentativas na entrada verdadeira (#33). */
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return { agora: new Date(), ip };
}

export async function entrarComPin(pin: string) {
  return sessao.entrarComPin(pin, await contexto());
}

export async function pedirCodigo(email: string) {
  return sessao.pedirCodigo(email, await contexto());
}

export async function entrarComCodigo(email: string, codigo: string, lembrar: boolean) {
  return sessao.entrarComCodigo(email, codigo, lembrar, await contexto());
}

export async function sair(ambito: AmbitoSaida) {
  await sessao.sair(ambito === "gerente" ? "gerente" : "dispositivo");
}
