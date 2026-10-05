"use server";

import { definicoesLoja } from "@/lib/dados";
import { quandoVoltaALoja } from "@/lib/pedidos";

/**
 * Se a loja está em pausa, e até quando — já escrito na língua da página. O
 * balcão pausa quando a cozinha está cheia (`painel-balcao.md`), e o site tem de
 * o dizer e de não aceitar pedidos (revisão do #66). Lê-se ao abrir a página de
 * compra; o `enviarCompra` confirma outra vez ao enviar. Nunca em cache.
 */
export async function pausaDaLoja(locale: string): Promise<string | null> {
  const { pausaAte } = await definicoesLoja();
  return quandoVoltaALoja(pausaAte, new Date(), locale);
}
