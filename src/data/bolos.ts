import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./bolos.json";

/**
 * O catálogo do bolo por medida: massas, recheios, coberturas, decoração e o
 * acabamento à volta.
 *
 * ## Isto não tem preços, e é isso que decide a página
 *
 * O impresso (`Massas bolos (24_25).pdf`) é uma lista de escolhas e **nenhuma
 * delas tem número**. O preço de um bolo da Damira sai do peso, do trabalho e
 * do que leva dentro, e é dito por telefone.
 *
 * A tentação é preencher: pôr "desde 17 €/kg" ao lado, porque é o que os bolos
 * vegan custam. **Não se faz.** Os 17 €/kg são o preço dos bolos vegan de
 * catálogo, não de um bolo de três andares com placas de chocolate à volta, e
 * um número a mais aqui é uma discussão ao balcão.
 *
 * A página trata isto pelo que é: um **configurador que termina num pedido de
 * orçamento**, e não uma tabela de preços. Ver `/encomendas`.
 *
 * ## Duas linhas, uma lista
 *
 * O impresso traz o catálogo duas vezes — o normal e o vegan —, e mais de
 * metade das opções repete-se nos dois. Guardá-las duas vezes garantia que uma
 * correção só entrava numa: por isso cada opção diz **em que linhas existe**,
 * em vez de haver duas listas paralelas.
 */

const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1) });

export const LINHAS = ["classica", "vegan"] as const;

export type Linha = (typeof LINHAS)[number];

/**
 * A ordem do enum **é** a ordem por que as escolhas se fazem, e é a ordem do
 * impresso: de dentro para fora — a massa, o que leva lá dentro, o que a cobre,
 * o que se lhe põe em cima e o que a rodeia. É também a ordem por que faz
 * sentido perguntar.
 */
export const GRUPOS = [
  "massas",
  "recheios",
  "coberturas",
  "decoracao",
  "a-volta",
] as const;

export type Grupo = (typeof GRUPOS)[number];

const Opcao = z.object({
  nome: Texto,
  /** O "tipo Ferrero" e o "soja" que o impresso escreve em letra pequena. */
  nota: Texto.nullable().default(null),
  linhas: z.array(z.enum(LINHAS)).min(1),
});

const EsquemaBolos = z.object({
  grupos: z
    .array(
      z.object({
        id: z.enum(GRUPOS),
        opcoes: z.array(Opcao).min(1),
      }),
    )
    .min(1),
});

export type Opcao = z.infer<typeof Opcao>;

const resultado = EsquemaBolos.safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/bolos.json", resultado.error, dados);
}

export const bolos = resultado.data;

/* Um grupo a mais ou a menos do que o enum é sinal de que alguém acrescentou
   uma escolha ao JSON e se esqueceu do enum — ou o contrário. Falha aqui, no
   `build`, e não na página, onde apareceria uma secção vazia sem título. */
const emFalta = GRUPOS.filter((g) => !bolos.grupos.some((x) => x.id === g));

if (emFalta.length > 0) {
  throw new Error(`src/data/bolos.json: grupos em falta — ${emFalta.join(", ")}`);
}

/** As opções de um grupo numa das linhas, pela ordem do impresso. */
export const opcoesDe = (grupo: Grupo, linha: Linha): Opcao[] =>
  bolos.grupos
    .find((g) => g.id === grupo)
    ?.opcoes.filter((o) => o.linhas.includes(linha)) ?? [];

/** Quantas escolhas a linha oferece ao todo. É o número que a página anuncia. */
export const quantasOpcoes = (linha: Linha): number =>
  GRUPOS.reduce((n, grupo) => n + opcoesDe(grupo, linha).length, 0);
