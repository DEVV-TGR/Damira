import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

/**
 * ⚠️ **As duas fontes são aproximações.** O impresso usa um display condensado
 * com textura gasta e um sans humanista, e nenhum dos dois se identifica a
 * partir de um PDF achatado. Quando aparecer o manual de marca, trocam-se aqui e
 * mudam em todo o lado.
 *
 * A **Bricolage Grotesque** entrou por ter eixos de largura e de tamanho ótico:
 * dá para abrir um título gigante e apertar uma etiqueta de 12 px sem trocar de
 * família, e é isso que mantém a página coerente. A Anton, que aqui esteve
 * antes, é uma fonte de póster — puxava a página para o registo gritado do
 * impresso, que é justamente o que esta direção não quer.
 *
 * `next/font` descarrega-as no `build` e serve-as do próprio domínio, que é o
 * que permite ao `font-src 'self'` da CSP ser tão fechado.
 *
 * Vivem aqui, e não no layout da loja, porque o painel (`src/app/painel/`) tem
 * o seu próprio layout raiz: declaradas duas vezes, eram dois pedidos de fonte.
 */
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--fonte-display",
  display: "swap",
});

export const corpo = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});
