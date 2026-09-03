import type { Artigo, Categoria } from "@/data/ementa";
import { ementa } from "@/data/ementa";

/**
 * # O que da ementa se pode encomendar, e em que quantidade
 *
 * ## ⚠️ Isto toca no aviso mais forte do AGENTS.md, e toca de propósito
 *
 * O aviso é este: **não juntar a encomenda à ementa**, porque um kit para
 * setenta pessoas ao lado de um croissant é o que leva alguém a aparecer ao
 * sábado à espera de o levar debaixo do braço. Continua a valer, e a separação
 * das duas páginas mantém-se.
 *
 * O que muda é que **encomendar da ementa passa a ser possível — com regras que
 * dizem em voz alta que é uma encomenda.** A regra que impede o mal-entendido é
 * a **quantidade mínima**: ninguém encomenda *um* croissant, encomenda uma dúzia
 * com antecedência. Um artigo que só se pode pedir à dúzia nunca se confunde com
 * um artigo que se tira da vitrine.
 *
 * É também como o resto do mercado o faz: a concorrência em Ermesinde vende as
 * miniaturas ao quilo e à caixa, nunca à unidade.
 *
 * ## ⚠️ E há categorias que **não** se encomendam
 *
 * Um galão não se encomenda para sexta-feira. As bebidas, os pratos do almoço e
 * a pausa ficam de fora, e não é esquecimento: são coisas que se consomem no
 * sítio ou que se levam na hora, e pô-las aqui era prometer um serviço que a
 * casa não tem. **Uma lista completa demais mente mais do que uma curta.**
 */

/**
 * A regra por categoria. `null` quer dizer que a categoria não se encomenda.
 *
 * É uma tabela em código e não um campo nos 95 artigos do JSON porque **é uma
 * regra do negócio e não um dado do artigo**: no dia em que a casa disser que o
 * mínimo passa a ser meia dúzia, muda-se aqui uma vez em vez de em trinta e
 * duas linhas de JSON — e trinta e duas linhas de JSON é onde se esquece uma.
 */
type Regra = {
  /** Quantidade mínima. Abaixo disto o artigo sai do cesto. */
  minimo: number;
  /** De quanto em quanto sobe. À dúzia sobe de seis em seis, não de um em um. */
  passo: number;
};

const REGRAS: Partial<Record<Categoria, Regra>> = {
  /* Doces e salgados vendem-se à unidade ao balcão e **à dúzia** por encomenda.
     O passo de 6 é a meia dúzia, que é como as pessoas contam pastéis. */
  doces: { minimo: 12, passo: 6 },
  salgados: { minimo: 12, passo: 6 },
  /* ⚠️ Um bolo inteiro tem `unidade: "kg"`, e por isso **a quantidade são
     quilos e não bolos**. O mínimo é 1 kg e o passo é meio quilo — que é a
     precisão a que uma pastelaria trabalha, e a razão de o passo não ser 1. */
  "bolos-inteiros": { minimo: 1, passo: 0.5 },
  /* O chocolate do Dubai. Tem variantes de peso e por isso a quantidade é a
     unidade da variante escolhida. */
  formatos: { minimo: 1, passo: 1 },
};

/** A regra de um artigo, ou `null` se ele não se encomenda. */
export const regraDe = (artigo: Artigo): Regra | null =>
  REGRAS[artigo.categoria] ?? null;

export const encomendavel = (artigo: Artigo): boolean => regraDe(artigo) !== null;

/** Os artigos da ementa que se podem encomendar, pela ordem em que lá estão. */
export const artigosEncomendaveis = (): Artigo[] => ementa.filter(encomendavel);

/**
 * As categorias com artigos encomendáveis, dentro de uma carta.
 *
 * Sai daqui e não do enum das categorias pela mesma razão que a navegação da
 * ementa: uma secção sem artigos desaparece sozinha em vez de deixar um título
 * a apontar para o vazio.
 */
export const categoriasEncomendaveis = (carta: string): Categoria[] => {
  const vistas: Categoria[] = [];
  for (const artigo of artigosEncomendaveis()) {
    if (artigo.carta !== carta) continue;
    if (!vistas.includes(artigo.categoria)) vistas.push(artigo.categoria);
  }
  return vistas;
};

/** As cartas que têm alguma coisa para encomendar. */
export const cartasEncomendaveis = (): string[] => {
  const vistas: string[] = [];
  for (const artigo of artigosEncomendaveis()) {
    if (!vistas.includes(artigo.carta)) vistas.push(artigo.carta);
  }
  return vistas;
};

export const daCartaECategoria = (carta: string, categoria: Categoria): Artigo[] =>
  artigosEncomendaveis().filter(
    (a) => a.carta === carta && a.categoria === categoria,
  );
