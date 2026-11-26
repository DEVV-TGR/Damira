import type { EscolhaBolo, OpcaoBolo, OpcaoComCoberturas, OpcoesBolo } from "@/lib/dados/tipos";
import { URL_SITE } from "@/lib/site";

/**
 * # As regras do bolo personalizado
 *
 * O configurador (no browser) e o servidor usam **as mesmas funções**: o
 * configurador para mostrar só o que é possível, o servidor para recusar o que
 * não é (`bolos-personalizados.md` › Combinações). Por isso este ficheiro não
 * importa dados nenhuns — recebe as opções por argumento.
 *
 * A regra da casa, tal como veio no PDF: **a massa decide as coberturas**, e o
 * recheio, o «à volta» e o topping têm cada um a sua lista de coberturas (hoje,
 * todas). A cobertura é o eixo: escolhida a massa, escolhe-se a cobertura, e é
 * ela que filtra o resto.
 */

/** As listas que dependem da cobertura, pela ordem do configurador. */
export const GRUPOS_DO_BOLO = ["recheios", "aVolta", "toppings"] as const;
export type GrupoDoBolo = (typeof GRUPOS_DO_BOLO)[number];

export const ativas = <T extends { ativa: boolean }>(lista: readonly T[]): T[] => lista.filter((o) => o.ativa);

/** As coberturas que a casa faz com esta massa, ligadas e pela ordem da casa. */
export function coberturasDaMassa(opcoes: OpcoesBolo, massaId: string | null): OpcaoBolo[] {
  const massa = opcoes.massas.find((m) => m.id === massaId && m.ativa);
  if (!massa) return [];
  return ativas(opcoes.coberturas).filter((c) => massa.coberturas.includes(c.id));
}

/** As opções de uma lista que vão com esta cobertura. */
export function comCobertura(
  lista: readonly OpcaoComCoberturas[],
  coberturaId: string | null,
): OpcaoComCoberturas[] {
  if (!coberturaId) return [];
  return ativas(lista).filter((o) => o.coberturas.includes(coberturaId));
}

/** Se este topping pede a foto para imprimir. */
export const imprimeFoto = (opcoes: OpcoesBolo, toppingId: string | null): boolean =>
  toppingId !== null && opcoes.fotos.toppingQueImprime === toppingId;

/**
 * Porque é que um bolo foi recusado. O nome é o do campo que falhou, para o
 * configurador o poder marcar.
 */
export type ErroBolo =
  | "tamanho"
  | "massa"
  | "cobertura"
  | "recheio"
  | "a-volta"
  | "topping"
  | "fotos-referencia"
  | "foto-imprimir"
  | "autorizacao";

/**
 * Confere um bolo contra as opções da casa. `null` é válido.
 *
 * ⚠️ **Uma opção desligada é recusada** mesmo que o cesto a tenha guardado ontem:
 * a casa deixou de a fazer.
 */
export function validarBolo(opcoes: OpcoesBolo, escolha: EscolhaBolo): ErroBolo | null {
  const tamanhos = ativas(opcoes.tamanhos);
  /* Sem tamanhos, não se escolhe nenhum; com tamanhos, escolhe-se um dos ligados. */
  if (tamanhos.length === 0 ? escolha.tamanhoId !== null : !tamanhos.some((t) => t.id === escolha.tamanhoId)) {
    return "tamanho";
  }
  if (!opcoes.massas.some((m) => m.id === escolha.massaId && m.ativa)) return "massa";
  if (!coberturasDaMassa(opcoes, escolha.massaId).some((c) => c.id === escolha.coberturaId)) return "cobertura";
  if (!comCobertura(opcoes.recheios, escolha.coberturaId).some((o) => o.id === escolha.recheioId)) return "recheio";
  if (!comCobertura(opcoes.aVolta, escolha.coberturaId).some((o) => o.id === escolha.aVoltaId)) return "a-volta";
  if (!comCobertura(opcoes.toppings, escolha.coberturaId).some((o) => o.id === escolha.toppingId)) return "topping";

  const referencia = escolha.fotosReferencia;
  if (referencia.length > opcoes.fotos.referenciaMaximo || new Set(referencia).size !== referencia.length) {
    return "fotos-referencia";
  }
  /* A foto para imprimir vem com o topping que a imprime, e só com ele: sem esse
     topping, uma foto ali era a cozinha a imprimir o que não lhe pediram; com
     ele e sem foto, a cozinha não tem o que imprimir. */
  const imprime = imprimeFoto(opcoes, escolha.toppingId);
  if (imprime !== (escolha.fotoImprimir !== null)) return "foto-imprimir";
  if (escolha.fotoImprimir !== null && referencia.includes(escolha.fotoImprimir)) return "foto-imprimir";
  /* Sem a autorização, a foto de uma pessoa não se imprime (#52). */
  if (escolha.fotoImprimir !== null && !escolha.autorizaFoto) return "autorizacao";
  return null;
}

/** O nome de uma opção, desligadas incluídas: um pedido antigo continua a dizer o que se pediu. */
const nomeDe = (lista: readonly OpcaoBolo[], id: string | null): string | null =>
  lista.find((o) => o.id === id)?.nome ?? null;

/** Os rótulos de cada campo, na língua de quem lê. */
export type RotulosDoBolo = Record<"tamanho" | "massa" | "cobertura" | "recheio" | "aVolta" | "topping", string>;

/**
 * O bolo escrito em linhas, «Massa: Red Velvet», pela ordem do configurador.
 * É o que vai no cesto, no email, no painel e no talão — sempre o mesmo texto.
 */
export function linhasDoBolo(opcoes: OpcoesBolo, escolha: EscolhaBolo, rotulos: RotulosDoBolo): string[] {
  const pares: [string, string | null][] = [
    [rotulos.tamanho, nomeDe(opcoes.tamanhos, escolha.tamanhoId)],
    [rotulos.massa, nomeDe(opcoes.massas, escolha.massaId)],
    [rotulos.cobertura, nomeDe(opcoes.coberturas, escolha.coberturaId)],
    [rotulos.recheio, nomeDe(opcoes.recheios, escolha.recheioId)],
    [rotulos.aVolta, nomeDe(opcoes.aVolta, escolha.aVoltaId)],
    [rotulos.topping, nomeDe(opcoes.toppings, escolha.toppingId)],
  ];
  return pares.flatMap(([rotulo, nome]) => (nome ? [`${rotulo}: ${nome}`] : []));
}

/** Os rótulos em português: o email, o painel e o talão são para a casa. */
export const ROTULOS_PT: RotulosDoBolo = {
  tamanho: "Tamanho",
  massa: "Massa",
  cobertura: "Cobertura",
  recheio: "Recheio",
  aVolta: "À volta",
  topping: "Topping",
};

/** O «a partir de» do tamanho escolhido. Só para mostrar: a linha entra sem preço. */
export const precoAPartirDe = (opcoes: OpcoesBolo, tamanhoId: string | null): number | null =>
  opcoes.tamanhos.find((t) => t.id === tamanhoId)?.precoCent ?? null;

/**
 * O caminho de uma foto do bolo no site. As fotos não se mostram pelo endereço
 * do Blob: passam pela rota `/api/bolos/fotos`, que no modo de teste sem Blob as
 * lê da pasta temporária. As do pedido de exemplo já são caminhos do site.
 */
export const caminhoDaFotoDoBolo = (foto: string): string =>
  foto.startsWith("/") ? foto : `/api/bolos/fotos/${foto.replace(/^bolos\//, "")}`;

/** O mesmo, com o domínio: é o que vai no email. */
export const urlDaFotoDoBolo = (foto: string): string => `${URL_SITE}${caminhoDaFotoDoBolo(foto)}`;
