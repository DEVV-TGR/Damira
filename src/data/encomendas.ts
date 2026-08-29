import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./encomendas.json";

/**
 * O que a Damira faz **por encomenda**: os kits de festa, os kits de bolo
 * decorado e as boxes para dias especiais.
 *
 * ## Porque é que isto não está na ementa
 *
 * Um croissant pede-se ao balcão e leva-se. Um kit para setenta pessoas é uma
 * conversa: tem antecedência, tem uma data, tem morada de entrega e o preço
 * muda com o número de pessoas. São duas coisas diferentes com o mesmo aspeto —
 * uma lista de comida com um número ao lado — e misturá-las na mesma página
 * levava alguém a aparecer ao sábado à espera de levar um Kit Premium debaixo
 * do braço.
 *
 * A diferença aparece no site como duas páginas (`/ementa` e `/encomendas`) e
 * aqui como dois ficheiros.
 *
 * As fontes são `Kit Festas Damira (out2025).pdf` e
 * `Boxes Dias Especiais Damira.pdf`, em `referencias/`.
 */

const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1) });

/**
 * Uma linha de conteúdo de um kit: o que é e quanto vem.
 *
 * A quantidade é **texto** e não número, de propósito. O impresso escreve
 * "40 unidades", "3 pacotes", "1 unidade (800gr)" e "1kg" — quatro grandezas
 * diferentes na mesma coluna. Reduzi-las a um número obrigava a inventar uma
 * unidade para cada linha e a formatá-las de volta, e a primeira que não
 * encaixasse (o "800gr" entre parênteses) rebentava a conversão nos dois
 * sentidos.
 */
const Linha = z.object({
  nome: Texto,
  quantidade: Texto,
});

/**
 * Um escalão de um kit: o número de pessoas, o preço e o que leva.
 *
 * ⚠️ **O preço é por escalão e não por pessoa.** O impresso anuncia "20 👥 —
 * 335€", e dividir para mostrar "16,75 € por pessoa" seria simpático e seria
 * errado: os escalões não são proporcionais (o Premium de 40 custa 650 € e o de
 * 20 custa 335 €, que não é metade), e o número por pessoa dava a entender uma
 * conta que a casa não faz.
 */
const Escalao = z.object({
  pessoas: z.number().int().positive(),
  preco: z.number().positive(),
  salgados: z.array(Linha).min(1),
  doces: z.array(Linha).min(1),
});

const Kit = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: Texto,
  /** Uma frase, quando o impresso a tem. O Kit Festas não tem; os de bolo têm. */
  resumo: Texto.nullable().default(null),
  escaloes: z.array(Escalao).min(1),
});

const KitBolo = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: Texto,
  resumo: Texto,
  preco: z.number().positive(),
  itens: z.array(Linha).min(1),
});

const Box = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: Texto,
  preco: z.number().positive(),
  vegan: z.boolean().default(false),
  /** Aqui a quantidade vem colada ao nome no impresso ("2 Croissants"), e é uma
      lista corrida — não uma tabela de duas colunas como nos kits. */
  itens: z.array(Texto).min(1),
});

const EsquemaEncomendas = z.object({
  kitsFesta: z.array(Kit).min(1),
  kitsBolo: z.array(KitBolo).min(1),
  boxes: z.array(Box).min(1),
});

export type Linha = z.infer<typeof Linha>;
export type Escalao = z.infer<typeof Escalao>;
export type Kit = z.infer<typeof Kit>;
export type KitBolo = z.infer<typeof KitBolo>;
export type Box = z.infer<typeof Box>;

const resultado = EsquemaEncomendas.safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/encomendas.json", resultado.error, dados);
}

export const encomendas = resultado.data;

/**
 * Os números de pessoas que os kits de festa servem, sem repetições e por
 * ordem.
 *
 * A página das encomendas deixa escolher primeiro **quantas pessoas** e só
 * depois a gama, que é a ordem por que a pergunta se faz na vida real. Sai
 * daqui em vez de estar escrito à mão para não haver um "70" no seletor no dia
 * em que a casa deixar de fazer kits para setenta.
 */
export const escaloesDisponiveis = (): number[] =>
  [
    ...new Set(
      encomendas.kitsFesta.flatMap((kit) => kit.escaloes.map((e) => e.pessoas)),
    ),
  ].sort((a, b) => a - b);

/** O escalão de um kit para um número de pessoas, se existir. */
export const escalaoDe = (kit: Kit, pessoas: number) =>
  kit.escaloes.find((e) => e.pessoas === pessoas);

/** O preço mais baixo a que um kit começa. É o que a homepage anuncia. */
export const desdeQuanto = (kit: Kit) =>
  Math.min(...kit.escaloes.map((e) => e.preco));
