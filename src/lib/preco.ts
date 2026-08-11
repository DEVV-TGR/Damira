import type { Locale } from "@/i18n/routing";

/**
 * Um sítio só a decidir como se escreve dinheiro.
 *
 * O `Intl` trata das duas convenções sozinho: `11,85 €` em português (símbolo à
 * direita, vírgula decimal) e `€11.85` em inglês. Escrever `${preco}€` à mão
 * dava a versão portuguesa a um inglês, que lê `11,85` como onze mil.
 *
 * **Duas casas decimais sempre**, mesmo num preço redondo — o impresso escreve
 * "7€" e aqui sai "7,00 €". É deliberado: numa lista de mais de cem artigos
 * alinhados à direita, uns com cêntimos e outros sem, a coluna fica aos saltos.
 */
export function formatarPreco(preco: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(preco);
}
