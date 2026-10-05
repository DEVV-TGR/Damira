"use server";

import { cotarCesto } from "@/lib/dados";
import type { ResultadoCotacao } from "@/lib/dados/tipos";

/**
 * O preço do cesto, **de agora**, calculado no servidor. A página de compra
 * mostra este total, e não o do browser, e compara linha a linha com o que o
 * cesto guardou ao juntar: se a gerente mudou um preço entretanto, o cliente vê
 * «o preço mudou» antes de enviar — nunca descobre depois (`painel-gerente.md`).
 * Nunca em cache.
 */
export async function cotarPedido(linhas: unknown): Promise<ResultadoCotacao> {
  return cotarCesto(linhas);
}
