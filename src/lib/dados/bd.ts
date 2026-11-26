import { criarEmailsBd } from "./bd-emails";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  categoriaNova,
  colunasDasDefinicoes,
  colunasDosHorarios,
  colunasEditaveis,
  gravarPecas,
  lerCasa,
  lerProdutos,
  linhaParaCasa,
  produtoParaLinhas,
  type BaseDeDados,
  type DadosDaCasa,
} from "@/db/catalogo";
import { OPCOES_BOLO } from "@/data/bolos-personalizados";
import { casa as tabelaCasa, categorias, familias as tabelaFamilias, produtos, variantes } from "@/db/esquema";
import { erroDoPostgres, violouChave } from "@/db/erros";
import { arvoreDaLoja, planearFamilias, type ArvoreGravada } from "./familias";
import type { ExecutarLote } from "@/db/lote";
import { diaDeLisboa } from "@/lib/painel";
import { criarPedidosDoPainelBd } from "./bd-painel-pedidos";
import { criarPedidosBd, type LeituraDoPedido, type OpcoesDosPedidos } from "./bd-pedidos";
import { cotarLinhas, emId, invalido, livre, naoExiste, prepararProduto, simplesLevados } from "./regras";
import {
  EsquemaDefinicoes,
  EsquemaEntradaProduto,
  EsquemaHorarios,
  EsquemaLinhaCesto,
  EsquemaOrdemCategorias,
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
 * Aqui vivem o catálogo e a casa. Os pedidos da loja — criar, a ocupação, a
 * referência — estão em `bd-pedidos.ts`, e os do painel em
 * `bd-painel-pedidos.ts`. Quem junta tudo é o `montarFonteBd`, e
 * quem a escolhe para o site é o `fonteDoAmbiente`, quando há `DATABASE_URL`
 * (`docs/loja/ligar-a-neon.md`).
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
  | "familias"
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
  | "guardarOrdemCategorias"
  | "guardarFamilias"
  // Os bolos personalizados.
  | "opcoesDoBolo"
  | "guardarOpcoesDoBolo"
>;

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

  /* ⚠️ Uma categoria que não está na ordem ficava órfã: fora da `/ementa`, e sem
     a gerente a poder lá pôr, porque a ordem só aceita uma permutação das que
     existem (#87). A mesma regra do `json-painel.ts`. Ler e depois gravar chega
     aqui: a ordem muda de sítio, mas nunca ganha nem perde categorias. */
  const foraDaOrdem = async (categoria: string | null) =>
    categoria !== null && !(await casa()).ordem.categorias.includes(categoria);
  const categoriaDesconhecida: ResultadoPainel<never> = {
    ok: false,
    erro: "dados-invalidos",
    campos: ["categoria"],
  };

  /* A árvore como está gravada, arquivadas incluídas: é o que a gravação confere. */
  const lerArvore = async (): Promise<ArvoreGravada> => {
    const [fs, cs] = await Promise.all([db.select().from(tabelaFamilias), db.select().from(categorias)]);
    const nome = (l: { nomePt: string; nomeEn: string | null }) => ({ pt: l.nomePt, en: l.nomeEn });
    return {
      familias: fs.map((f) => ({ id: f.id, nome: nome(f), posicao: f.posicao, arquivada: f.arquivada })),
      categorias: cs.map((c) => ({
        id: c.id,
        nome: nome(c),
        posicao: c.posicao,
        arquivada: c.arquivada,
        familiaId: c.familiaId,
      })),
    };
  };

  /* ⚠️ Escolher a categoria no editor (26/11) é escolher uma que existe e está
     em uso. Sem isto, a chave estrangeira recusava a que não existe, mas uma
     arquivada passava — e o produto desaparecia da loja sem aviso. */
  const categoriaEscolhidaInvalida = async (categoriaId: string | undefined) => {
    if (categoriaId === undefined) return false;
    const [linha] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.id, categoriaId), eq(categorias.arquivada, false)));
    return !linha;
  };
  const categoriaEscolhidaRecusada: ResultadoPainel<never> = {
    ok: false,
    erro: "dados-invalidos",
    campos: ["categoriaId"],
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

    async familias() {
      return arvoreDaLoja(await lerArvore());
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
      /* Os simples que os compostos levam, para as variâncias deles: mais uma
         consulta, e só se houver compostos. */
      const levados = simplesLevados(doCesto).filter((id) => !ids.includes(id));
      const dentro = levados.length > 0 ? await lerProdutos(db, inArray(produtos.id, levados)) : [];
      const porId = new Map([...doCesto, ...dentro].map((produto) => [produto.id, produto]));
      return { ok: true, cotacao: cotarLinhas(lido.data, (id) => porId.get(id), OPCOES_BOLO) };
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
      if (await foraDaOrdem(lido.data.categoria)) return categoriaDesconhecida;
      if (await categoriaEscolhidaInvalida(lido.data.categoriaId)) return categoriaEscolhidaRecusada;
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
        const preparado = prepararProduto(lido.data, await lerProdutos(db), null);
        if (!preparado.ok) return preparado.resultado;
        const produto = EsquemaProduto.parse({
          ...lido.data,
          id: livre(base, (candidato) => ocupados.has(candidato)),
          ...preparado.campos,
          arquivado: false,
          foraDeVenda: false,
          esgotadoNoDia: null,
        });
        const linhas = produtoParaLinhas(produto, 0);
        try {
          await emLote((d) => [
            ...(linhas.categoria ? [categoriaNova(d, linhas.categoria)] : []),
            /* Para o fim do catálogo, contado na própria instrução. */
            d.insert(produtos).values({
              ...linhas.produto,
              posicao: sql`(select coalesce(max(${produtos.posicao}), -1) + 1 from ${produtos})`,
            }),
            d.insert(variantes).values(linhas.variantes),
            ...gravarPecas(d, linhas),
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
      if (await foraDaOrdem(lido.data.categoria)) return categoriaDesconhecida;
      if (await categoriaEscolhidaInvalida(lido.data.categoriaId)) return categoriaEscolhidaRecusada;
      /* As variantes, as peças partilhadas e o que os grupos levam conferem-se
         contra o catálogo inteiro: a mesma regra do `json-painel.ts`. */
      const preparado = prepararProduto(lido.data, await lerProdutos(db), atual);
      if (!preparado.ok) return preparado.resultado;

      /* A categoria é a que vem; sem ela, sai outra vez da família, da carta e
         da categoria (`categoriaDoProduto`) — e não fica a gravada, senão mudar
         a carta num editor antigo deixava o produto onde estava. */
      const produto = EsquemaProduto.parse({
        ...atual,
        ...lido.data,
        categoriaId: lido.data.categoriaId,
        ...preparado.campos,
      });
      const linhas = produtoParaLinhas(produto, 0);
      await emLote((d) => [
        ...(linhas.categoria ? [categoriaNova(d, linhas.categoria)] : []),
        /* ⚠️ Só as colunas que a entrada traz: sem os interruptores do balcão,
           que a gerente não pode desfazer por gravar um preço. */
        d.update(produtos).set(colunasEditaveis(produto)).where(eq(produtos.id, id)),
        /* As variantes trocam-se inteiras: os pedidos guardam o texto delas, e
           não apontam para estas linhas (`pedidos.md` › fotografia do momento). */
        d.delete(variantes).where(eq(variantes.produtoId, id)),
        d.insert(variantes).values(linhas.variantes),
        ...gravarPecas(d, linhas),
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

    /* ⚠️ **Até ao PR de esquema, as opções do bolo leem-se dos JSON** (o PDF da
       casa), e gravar responde `indisponivel`: não há tabela onde as pôr, e
       fingir que gravou era a gerente a perder o que mudou no deploy seguinte. */
    async opcoesDoBolo() {
      return OPCOES_BOLO;
    },

    async guardarOpcoesDoBolo() {
      return { ok: false, erro: "indisponivel" };
    },

    async guardarFamilias(entrada) {
      const atual = await lerArvore();
      const usadas = await db.selectDistinct({ id: produtos.categoriaId }).from(produtos);
      const planeado = planearFamilias(entrada, atual, new Set(usadas.map((u) => u.id)));
      if (!planeado.ok) return planeado;
      const { plano } = planeado;

      const linhaFamilia = (f: (typeof plano.familias)[number]) => ({
        id: f.id,
        nomePt: f.nome.pt,
        nomeEn: f.nome.en,
        posicao: f.posicao,
        arquivada: false,
      });
      const substituir = <T extends Record<string, unknown>>(colunas: T) =>
        Object.fromEntries(Object.entries(colunas).map(([chave, nome]) => [chave, sql.raw(`excluded."${nome}"`)]));

      try {
        await emLote((d) => [
          /* As famílias primeiro: as categorias novas apontam para elas. E as
             categorias que saem antes das famílias que saem, pela mesma razão. */
          d
            .insert(tabelaFamilias)
            .values(plano.familias.map(linhaFamilia))
            .onConflictDoUpdate({
              target: tabelaFamilias.id,
              set: substituir({ nomePt: "nome_pt", nomeEn: "nome_en", posicao: "posicao", arquivada: "arquivada" }),
            }),
          ...(plano.categorias.length > 0
            ? [
                d
                  .insert(categorias)
                  .values(
                    plano.categorias.map((c) => ({ ...linhaFamilia(c), familiaId: c.familiaId })),
                  )
                  .onConflictDoUpdate({
                    target: categorias.id,
                    set: substituir({
                      nomePt: "nome_pt",
                      nomeEn: "nome_en",
                      posicao: "posicao",
                      familiaId: "familia_id",
                    }),
                  }),
              ]
            : []),
          ...(plano.apagarCategorias.length > 0
            ? [d.delete(categorias).where(inArray(categorias.id, plano.apagarCategorias))]
            : []),
          ...(plano.arquivarFamilias.length > 0
            ? [
                d
                  .update(tabelaFamilias)
                  .set({ arquivada: true })
                  .where(inArray(tabelaFamilias.id, plano.arquivarFamilias)),
              ]
            : []),
          ...(plano.apagarFamilias.length > 0
            ? [d.delete(tabelaFamilias).where(inArray(tabelaFamilias.id, plano.apagarFamilias))]
            : []),
        ]);
      } catch (erro) {
        /* Um nome que a base recusou (dois trocados entre si, que a regra de
           unicidade confere linha a linha) ou um produto que entrou numa
           categoria a apagar entre a leitura e a gravação: não grava nada, e a
           gerente tenta outra vez. */
        const { code, constraint } = erroDoPostgres(erro);
        if (code === "23505" || code === "23503") {
          return { ok: false, erro: "dados-invalidos", campos: [constraint?.startsWith("familias") ? "familias" : "categorias"] };
        }
        throw erro;
      }
      return { ok: true, valor: arvoreDaLoja(await lerArvore()) };
    },

    async guardarOrdemCategorias(entrada) {
      /* Um campo só: seja o que for que falhe, é a lista que se marca. */
      const recusada: ResultadoPainel<never> = { ok: false, erro: "dados-invalidos", campos: ["categorias"] };
      const lido = EsquemaOrdemCategorias.safeParse(entrada);
      if (!lido.success) return recusada;
      const nova = JSON.stringify(lido.data.categorias);

      /* Uma permutação das que estão gravadas, e quem o confere é a própria
         instrução: as mesmas categorias nos dois sentidos e o mesmo tamanho. As
         repetidas já o esquema recusou. Ler e comparar no código deixava outra
         gravação passar pelo meio. Só as categorias mudam: as cartas e os
         títulos das bebidas ficam como estão. */
      /* Entre parênteses: o `->` e o `@>` têm a mesma precedência, e sem eles o
         `nova @> atuais` lia-se `(nova @> casa) -> 'categorias'`. */
      const atuais = sql`(${tabelaCasa.ordemEmenta} -> 'categorias')`;
      const [linha] = await db
        .update(tabelaCasa)
        .set({ ordemEmenta: sql`jsonb_set(${tabelaCasa.ordemEmenta}, '{categorias}', ${nova}::jsonb)` })
        .where(
          and(
            eq(tabelaCasa.id, 1),
            sql`${atuais} @> ${nova}::jsonb`,
            sql`${nova}::jsonb @> ${atuais}`,
            sql`jsonb_array_length(${atuais}) = jsonb_array_length(${nova}::jsonb)`,
          ),
        )
        .returning();
      if (linha) return { ok: true, valor: linhaParaCasa(linha).ordem };
      /* Nenhuma linha: ou não era uma permutação, ou falta importar a casa — e
         aí o `casa()` rebenta a dizê-lo, como nas leituras. */
      await casa();
      return recusada;
    },
  };
}

export type OpcoesDaFonteBd = Omit<OpcoesDosPedidos, "leitura"> & {
  /**
   * Por onde o `criarPedido` lê os produtos, a casa e as vagas. Sem ela, pela
   * própria fonte; com o modo de teste, quem monta passa a vista com os
   * exemplos por cima (`fonteDoAmbiente`).
   */
  leitura?: () => LeituraDoPedido;
};

/**
 * A fonte inteira sobre a base de dados: o catálogo e a casa, os pedidos da
 * loja, e o que falta do painel. É a mesma no site (`fonteDaNeon`) e nos testes.
 */
export function montarFonteBd(db: BaseDeDados, emLote: ExecutarLote, opcoes: OpcoesDaFonteBd): FonteDeDados {
  const fonte: FonteDeDados = {
    ...criarFonteBd(db, emLote),
    ...criarEmailsBd(db),
    ...criarPedidosBd(db, emLote, { ...opcoes, leitura: opcoes.leitura ?? (() => fonte) }),
    ...criarPedidosDoPainelBd(db, {
      /* Como está gravada, e nunca a de exemplo: é a mesma que a gerente vê
         (`configuracaoDoPainel`). */
      configuracao: (ctx) => fonte.configuracaoDoPainel(ctx),
      ocupacao: (desde, ate) => fonte.ocupacao(desde, ate),
    }),
  };
  return fonte;
}

