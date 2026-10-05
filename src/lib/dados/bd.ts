import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  colunasDasDefinicoes,
  colunasDosHorarios,
  colunasEditaveis,
  lerCasa,
  lerProdutos,
  linhaParaCasa,
  produtoParaLinhas,
  type BaseDeDados,
  type DadosDaCasa,
} from "@/db/catalogo";
import { casa as tabelaCasa, produtos, variantes } from "@/db/esquema";
import type { ExecutarLote } from "@/db/lote";
import { diaDeLisboa } from "@/lib/painel";
import { comIds, cotarLinhas, emId, invalido, livre, naoExiste } from "./regras";
import {
  EsquemaDefinicoes,
  EsquemaEntradaProduto,
  EsquemaHorarios,
  EsquemaLinhaCesto,
  EsquemaProduto,
  type FonteDeDados,
  type Produto,
  type ResultadoPainel,
} from "./tipos";

/**
 * # A fonte sobre a base de dados (#29, #31)
 *
 * A mesma `FonteDeDados` que o `json.ts`, com a base de dados do outro lado. As
 * páginas não dão pela troca: é a mesma interface, e as regras partilhadas
 * (`regras.ts`) são as mesmas.
 *
 * ⚠️ **Ainda só a metade do catálogo e da casa.** Os pedidos esperam pelas
 * tabelas deles (`docs/loja/base-de-dados.md` › Em aberto), e esta fonte ainda
 * não está ligada ao site: liga-se no `index.ts` quando houver conta Neon
 * (`docs/loja/ligar-a-neon.md`). Até lá vive testada ao lado da dos JSON.
 *
 * ⚠️ **Nada daqui vai para cache** por iniciativa própria. As páginas públicas
 * são estáticas e revalidam-se quando a gerente grava (`painel-gerente.md`); as
 * vagas, o checkout e o painel leem sempre (`robustez.md` › Cache).
 */

export type FonteBd = Pick<
  FonteDeDados,
  // A loja: as leituras e o preço do cesto.
  | "listarProdutos"
  | "produtoPorId"
  | "ordemDaEmenta"
  | "configuracaoDaCasa"
  | "definicoesLoja"
  | "cotarCesto"
  // O painel: os produtos.
  | "produtosDoPainel"
  | "configuracaoDoPainel"
  | "criarProduto"
  | "editarProduto"
  | "arquivarProduto"
  | "marcarEsgotadoHoje"
  | "tirarDeVenda"
  // O painel: a casa.
  | "guardarHorarios"
  | "guardarDefinicoes"
  | "pausarLoja"
>;

/* Um id já usado por outro produto: o Postgres chama-lhe 23505. Vem como causa
   do erro do Drizzle, ou como o próprio erro, conforme o driver. */
const violouChave = (erro: unknown, restricao: string): boolean => {
  const causa = ((erro as { cause?: unknown }).cause ?? erro) as { code?: string; constraint?: string };
  return causa.code === "23505" && causa.constraint === restricao;
};

/**
 * A fonte sobre a base de dados. O `emLote` é a forma de gravar tudo ou nada
 * do driver que está do outro lado (`src/db/lote.ts`): um lote na Neon, uma
 * transação no PGlite.
 */
export function criarFonteBd(db: BaseDeDados, emLote: ExecutarLote): FonteBd {
  const lerUm = async (id: string): Promise<Produto | undefined> =>
    (await lerProdutos(db, eq(produtos.id, id)))[0];

  /* Os três interruptores de um produto — arquivado, fora de venda, esgotado —
     mudam uma coluna, numa instrução só, e só se o produto existir. */
  const mudar = async (
    id: string,
    valor: unknown,
    campo: string,
    mudanca: Partial<typeof produtos.$inferInsert>,
  ): Promise<ResultadoPainel<Produto>> => {
    if (typeof valor !== "boolean") return { ok: false, erro: "dados-invalidos", campos: [campo] };
    const mudados = await db.update(produtos).set(mudanca).where(eq(produtos.id, id)).returning({ id: produtos.id });
    if (mudados.length === 0) return naoExiste;
    return { ok: true, valor: (await lerUm(id))! };
  };

  /* Sem a linha da casa a base de dados não foi importada, e não há horário
     nenhum para mostrar: rebenta a dizer o que falta, em vez de inventar um. */
  const casa = async (): Promise<DadosDaCasa> => {
    const lida = await lerCasa(db);
    if (!lida) {
      throw new Error(
        "src/lib/dados/bd.ts: a base de dados não tem a casa — falta importar o catálogo " +
          "(docs/loja/ligar-a-neon.md).",
      );
    }
    return lida;
  };

  /* A casa muda-se numa instrução só, que devolve a linha já mudada. Sem linha,
     a base de dados não foi importada — o mesmo erro das leituras. */
  const mudarCasa = async (mudanca: Partial<typeof tabelaCasa.$inferInsert>): Promise<DadosDaCasa> => {
    const [linha] = await db.update(tabelaCasa).set(mudanca).where(eq(tabelaCasa.id, 1)).returning();
    if (!linha) return casa();
    return linhaParaCasa(linha);
  };

  return {
    async listarProdutos(filtro = {}) {
      /* O `and` ignora os `undefined`: um filtro que não vem não filtra. */
      return lerProdutos(
        db,
        and(
          filtro.incluirArquivados ? undefined : eq(produtos.arquivado, false),
          filtro.origem === undefined ? undefined : eq(produtos.origem, filtro.origem),
          filtro.familia === undefined ? undefined : eq(produtos.familia, filtro.familia),
          filtro.aVendaOnline === undefined ? undefined : eq(produtos.aVendaOnline, filtro.aVendaOnline),
          filtro.apareceNaEmenta === undefined ? undefined : eq(produtos.apareceNaEmenta, filtro.apareceNaEmenta),
        ),
      );
    },

    async produtoPorId(id) {
      const [produto] = await lerProdutos(db, and(eq(produtos.id, id), eq(produtos.arquivado, false)));
      return produto ?? null;
    },

    async ordemDaEmenta() {
      return (await casa()).ordem;
    },

    async configuracaoDaCasa() {
      return (await casa()).configuracao;
    },

    async definicoesLoja() {
      return (await casa()).definicoes;
    },

    async cotarCesto(entrada) {
      const lido = EsquemaLinhaCesto.array().max(50).safeParse(entrada);
      if (!lido.success) return { ok: false, erro: "dados-invalidos" };

      /* Só os produtos do cesto, numa consulta — e com os arquivados e os
         tirados de venda, que o `cotarLinhas` recusa com o erro certo em vez de
         «produto desconhecido». */
      const ids = [...new Set(lido.data.map((linha) => linha.produtoId))];
      const doCesto = await lerProdutos(db, inArray(produtos.id, ids));
      const porId = new Map(doCesto.map((produto) => [produto.id, produto]));
      return { ok: true, cotacao: cotarLinhas(lido.data, (id) => porId.get(id)) };
    },

    // ——— O painel: os produtos ———

    async produtosDoPainel() {
      return lerProdutos(db);
    },

    /* A casa como está gravada. A camada do modo de teste (`comExemplo`) só tapa
       o `configuracaoDaCasa` da loja, e nunca este: é o que a gerente edita. */
    async configuracaoDoPainel() {
      return (await casa()).configuracao;
    },

    async criarProduto(entrada) {
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      const base = emId(lido.data.nome.pt) || "produto";

      /* O id é o primeiro livre de `base`, `base-2`… Entre ler os ocupados e
         gravar, outro produto com o mesmo nome pode entrar primeiro: a chave
         primária recusa o segundo, e tenta-se o id seguinte. */
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const ocupados = new Set(
          (
            await db
              .select({ id: produtos.id })
              .from(produtos)
              .where(or(eq(produtos.id, base), like(produtos.id, `${base}-%`)))
          ).map((linha) => linha.id),
        );
        const produto = EsquemaProduto.parse({
          ...lido.data,
          id: livre(base, (candidato) => ocupados.has(candidato)),
          variantes: comIds(lido.data.variantes),
          arquivado: false,
          foraDeVenda: false,
          esgotadoNoDia: null,
        });
        const linhas = produtoParaLinhas(produto, 0);
        try {
          await emLote((d) => [
            /* Para o fim do catálogo, contado na própria instrução. */
            d.insert(produtos).values({
              ...linhas.produto,
              posicao: sql`(select coalesce(max(${produtos.posicao}), -1) + 1 from ${produtos})`,
            }),
            d.insert(variantes).values(linhas.variantes),
          ]);
          return { ok: true, valor: (await lerUm(produto.id))! };
        } catch (erro) {
          if (!violouChave(erro, "produtos_pkey")) throw erro;
        }
      }
      throw new Error(`src/lib/dados/bd.ts: não foi possível dar um id livre a «${lido.data.nome.pt}».`);
    },

    async editarProduto(id, entrada) {
      const atual = await lerUm(id);
      if (!atual) return naoExiste;
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      /* Um id de variante que o produto não tem não se aceita: era o browser a
         inventar ids, e são eles que os cestos guardam. Uma variante que falte
         na entrada sai. (A mesma regra do `json-painel.ts`.) */
      const existentes = new Set(atual.variantes.map((v) => v.id));
      if (lido.data.variantes.some((v) => v.id !== undefined && !existentes.has(v.id))) {
        return { ok: false, erro: "dados-invalidos", campos: ["variantes"] };
      }

      const produto = EsquemaProduto.parse({ ...atual, ...lido.data, variantes: comIds(lido.data.variantes) });
      const linhas = produtoParaLinhas(produto, 0);
      await emLote((d) => [
        /* ⚠️ Só as colunas que a entrada traz: sem os interruptores do balcão,
           que a gerente não pode desfazer por gravar um preço. */
        d.update(produtos).set(colunasEditaveis(produto)).where(eq(produtos.id, id)),
        /* As variantes trocam-se inteiras: os pedidos guardam o texto delas, e
           não apontam para estas linhas (`pedidos.md` › fotografia do momento). */
        d.delete(variantes).where(eq(variantes.produtoId, id)),
        d.insert(variantes).values(linhas.variantes),
      ]);
      return { ok: true, valor: (await lerUm(id))! };
    },

    async arquivarProduto(id, arquivado) {
      return mudar(id, arquivado, "arquivado", { arquivado });
    },

    async marcarEsgotadoHoje(id, esgotado, { agora }) {
      return mudar(id, esgotado, "esgotado", { esgotadoNoDia: esgotado ? diaDeLisboa(agora) : null });
    },

    async tirarDeVenda(id, fora) {
      return mudar(id, fora, "foraDeVenda", { foraDeVenda: fora });
    },

    // ——— O painel: a casa ———

    async guardarHorarios(entrada) {
      /* O mesmo esquema que valida a casa ao ler: o que se grava é o que se lê. */
      const lido = EsquemaHorarios.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      return { ok: true, valor: (await mudarCasa(colunasDosHorarios(lido.data))).configuracao };
    },

    async guardarDefinicoes(entrada) {
      const lido = EsquemaDefinicoes.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      return { ok: true, valor: (await mudarCasa(colunasDasDefinicoes(lido.data))).definicoes };
    },

    async pausarLoja(ate, { agora }) {
      /* Uma pausa que já acabou não é pausa: é um relógio errado algures. E o
         que vem do browser pode nem ser uma data. */
      if (ate !== null && (!(ate instanceof Date) || Number.isNaN(ate.getTime()) || ate.getTime() <= agora.getTime())) {
        return { ok: false, erro: "dados-invalidos", campos: ["pausaAte"] };
      }
      return { ok: true, valor: (await mudarCasa({ pausaAte: ate })).definicoes };
    },
  };
}
