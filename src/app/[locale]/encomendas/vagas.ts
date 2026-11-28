"use server";

import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { configuracaoDaCasa, cotarCesto, ocupacao, produtoPorId } from "@/lib/dados";
import { consultarCompraDoCesto, type ConsultaCompra } from "@/lib/vagas-servidor";

/**
 * Os preços e as vagas de levantamento para o cesto que o browser tem.
 * Recebe as linhas sem preços nem tempos e lê o instante aqui para todos
 * os cálculos da consulta. Cada chamada lê a ocupação de novo.
 */
export async function consultarCompra(linhas: unknown): Promise<ConsultaCompra> {
  return consultarCompraDoCesto(linhas, { configuracaoDaCasa, cotarCesto, ocupacao, produtoPorId }, new Date(), await getLocale() as Locale);
}
