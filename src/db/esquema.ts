import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { GrupoComposicao, OrdemEmenta } from "@/lib/dados/tipos";
import type { DiaFechado, HorarioSemanal } from "@/lib/horarios";

/**
 * # O esquema da base de dados
 *
 * O contrato de `src/lib/dados/tipos.ts` em tabelas. O porquê de cada decisão
 * está em `docs/loja/base-de-dados.md`; aqui fica só o que se lê melhor ao lado
 * da coluna.
 *
 * ⚠️ **As regras que nunca podem falhar vivem nas tabelas (`CHECK`)**, e não só
 * no código: um preço negativo ou meio tempo de produção são recusados pela base
 * de dados, venham de onde vierem — da fonte, de uma migração, de um script.
 *
 * Os nomes SQL estão escritos ao lado de cada coluna, em `snake_case`, para quem
 * revê ler aqui exatamente o que vai para a base de dados.
 */

/* Uma lista de valores permitidos, para os `CHECK`. Os valores são nossos, não
   do browser, por isso podem ir para o SQL escritos. */
const umDe = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

// ——— O catálogo ———

export const produtos = pgTable(
  "produtos",
  {
    /** O código (`nata`): vai no URL e nos cestos, e nunca muda. */
    id: text("id").primaryKey(),
    /** A ordem do catálogo. Um produto novo vai para o fim. */
    posicao: integer("posicao").notNull(),
    origem: text("origem").notNull(),
    familia: text("familia").notNull(),
    nomePt: text("nome_pt").notNull(),
    nomeEn: text("nome_en"),
    descricaoPt: text("descricao_pt"),
    descricaoEn: text("descricao_en"),
    carta: text("carta"),
    categoria: text("categoria"),
    subcategoria: text("subcategoria"),
    /** ⚠️ Em `kg`, o preço é ao quilo e a quantidade são quilos. */
    unidade: text("unidade").notNull(),
    escolhas: text("escolhas").array().notNull().default(sql`'{}'`),
    /** Os dois `null` é «por preencher»: a casa ainda não o deu. */
    tempoProducaoUnidade: text("tempo_producao_unidade"),
    tempoProducaoValor: numeric("tempo_producao_valor", { mode: "number" }),
    /* `numeric` e não `integer`: ao quilo pede-se meio quilo. */
    quantidadeMinima: numeric("quantidade_minima", { mode: "number" }).notNull(),
    multiplo: numeric("multiplo", { mode: "number" }).notNull(),
    aVendaOnline: boolean("a_venda_online").notNull(),
    apareceNaEmenta: boolean("aparece_na_ementa").notNull(),
    /**
     * ⚠️ Três estados: `NULL` é «por responder», `{}` é «sem alergénios»
     * marcado de propósito, e uma lista é a lista.
     */
    alergenios: text("alergenios").array(),
    vegan: boolean("vegan").notNull().default(false),
    semGluten: boolean("sem_gluten").notNull().default(false),
    /** Os URLs do Vercel Blob (#32). */
    fotos: text("fotos").array().notNull().default(sql`'{}'`),
    sinalPercent: integer("sinal_percent"),
    limiteQuantidade: integer("limite_quantidade"),
    limiteModo: text("limite_modo"),
    /** «Apagar» no painel. Os pedidos antigos continuam a apontar para ele. */
    arquivado: boolean("arquivado").notNull().default(false),
    foraDeVenda: boolean("fora_de_venda").notNull().default(false),
    /** O dia de Lisboa em que o balcão o esgotou. Amanhã já não vale. */
    esgotadoNoDia: date("esgotado_no_dia", { mode: "string" }),
  },
  (t) => [
    check("produtos_id_formato", sql`${t.id} ~ '^[a-z0-9-]+$'`),
    check("produtos_origem", sql`${t.origem} in (${umDe(["ementa", "encomendas"])})`),
    check("produtos_familia", sql`${t.familia} in (${umDe(["ementa", "festa", "bolo", "box", "medida"])})`),
    /* A família da ementa é a da origem da ementa, e só ela. */
    check("produtos_familia_da_origem", sql`(${t.origem} = 'ementa') = (${t.familia} = 'ementa')`),
    /* A ementa agrupa-se por `{carta}-{categoria}`: sem as duas, o artigo não
       tinha secção onde aparecer. */
    check(
      "produtos_ementa_com_carta",
      sql`${t.familia} <> 'ementa' or (${t.carta} is not null and ${t.categoria} is not null)`,
    ),
    check("produtos_unidade", sql`${t.unidade} in (${umDe(["un", "kg"])})`),
    /* O inglês pode faltar; o português não, se houver descrição. */
    check("produtos_descricao_pt", sql`${t.descricaoEn} is null or ${t.descricaoPt} is not null`),
    /* Meio par é um dado que ninguém sabe ler: os dois, ou nenhum. */
    check(
      "produtos_tempo_producao_par",
      sql`(${t.tempoProducaoUnidade} is null) = (${t.tempoProducaoValor} is null)`,
    ),
    check(
      "produtos_tempo_producao",
      sql`${t.tempoProducaoUnidade} in (${umDe(["horas", "dias"])}) and ${t.tempoProducaoValor} >= 0`,
    ),
    check("produtos_minimo_e_multiplo", sql`${t.quantidadeMinima} > 0 and ${t.multiplo} > 0`),
    check("produtos_sinal", sql`${t.sinalPercent} between 1 and 100`),
    check("produtos_limite_par", sql`(${t.limiteQuantidade} is null) = (${t.limiteModo} is null)`),
    check(
      "produtos_limite",
      sql`${t.limiteQuantidade} > 0 and ${t.limiteModo} in (${umDe(["porDia", "total"])})`,
    ),
    /* ⚠️ Fica de fora, de propósito, a regra «à venda online só com alergénios
       respondidos». É uma regra de **gravar** (o `EsquemaEntradaProduto` do
       contrato), não um facto de todas as linhas: 70 artigos estão hoje à venda
       com os alergénios por responder, e a migração tem de os trazer como estão.
       Quando a gerente gravar um produto, a fonte aplica-a. */
  ],
);

export const variantes = pgTable(
  "variantes",
  {
    produtoId: text("produto_id")
      .notNull()
      .references(() => produtos.id),
    /** `"unica"` num produto sem variantes; `"20"` no escalão de 20 pessoas. */
    id: text("id").notNull(),
    /** A ordem dos escalões. Numa tabela as linhas não têm ordem. */
    posicao: integer("posicao").notNull(),
    rotuloPt: text("rotulo_pt"),
    rotuloEn: text("rotulo_en"),
    pessoas: integer("pessoas"),
    /** ⚠️ `NULL` é **sob orçamento**, nunca zero. */
    precoCent: integer("preco_cent"),
    /**
     * O que leva: só se mostra, nunca se pesquisa, por isso vai inteiro. Valida-o
     * o `EsquemaGrupoComposicao` do contrato, ao gravar e ao ler.
     */
    composicao: jsonb("composicao").$type<GrupoComposicao[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [
    /* A `unica` repete-se em todos os produtos: a chave é o par. */
    primaryKey({ columns: [t.produtoId, t.id] }),
    check("variantes_rotulo_pt", sql`${t.rotuloEn} is null or ${t.rotuloPt} is not null`),
    check("variantes_pessoas", sql`${t.pessoas} > 0`),
    check("variantes_preco", sql`${t.precoCent} >= 0`),
  ],
);

// ——— A casa ———

/**
 * Uma linha só: há uma casa. O `CHECK (id = 1)` impede que um erro crie a
 * segunda, e a fonte lê sempre a linha 1.
 */
export const casa = pgTable(
  "casa",
  {
    id: smallint("id").primaryKey().default(1),
    /* Os horários vão inteiros: a gerente grava-os inteiros (`EsquemaHorarios`),
       o motor lê-os inteiros, e nenhuma consulta pergunta por um dia. */
    horarioLoja: jsonb("horario_loja").$type<HorarioSemanal>().notNull(),
    /** `NULL` até a casa o dar: o calendário diz «indisponível», não inventa. */
    horarioCozinha: jsonb("horario_cozinha").$type<HorarioSemanal>(),
    diasFechados: jsonb("dias_fechados").$type<DiaFechado[]>().notNull().default(sql`'[]'::jsonb`),
    duracaoVagaMinutos: integer("duracao_vaga_minutos").notNull(),
    /** `NULL` é o interruptor da gerente desligado: as vagas não enchem. */
    limitePorVaga: integer("limite_por_vaga"),
    diasAFrente: integer("dias_a_frente").notNull(),
    limiarLivre: integer("limiar_livre").notNull(),
    limiarMedia: integer("limiar_media").notNull(),
    aceitarCancelamentosSite: boolean("aceitar_cancelamentos_site").notNull().default(false),
    devolverSinalAoCancelar: boolean("devolver_sinal_ao_cancelar").notNull().default(false),
    valorMinimoCent: integer("valor_minimo_cent"),
    /** A loja em pausa. `NULL` é aberta. */
    pausaAte: timestamp("pausa_ate", { withTimezone: true, mode: "date" }),
    ordemEmenta: jsonb("ordem_ementa").$type<OrdemEmenta>().notNull(),
    /** Sobe a cada alteração a um pedido: é o que o polling do painel pergunta. */
    versaoPedidos: bigint("versao_pedidos", { mode: "number" }).notNull().default(0),
    /** O PIN da equipa, com *hash* (#33). Nunca em claro. */
    pinEquipaHash: text("pin_equipa_hash"),
  },
  (t) => [
    check("casa_uma_so", sql`${t.id} = 1`),
    /* Os mesmos limites do `EsquemaHorarios`: o que o painel recusa, a base de
       dados também recusa. */
    check("casa_duracao_vaga", sql`${t.duracaoVagaMinutos} between 5 and 240`),
    check("casa_limite_por_vaga", sql`${t.limitePorVaga} > 0`),
    check("casa_dias_a_frente", sql`${t.diasAFrente} between 0 and 365`),
    check(
      "casa_limiares",
      sql`${t.limiarLivre} between 0 and 100 and ${t.limiarMedia} between 0 and 100 and ${t.limiarLivre} < ${t.limiarMedia}`,
    ),
    check("casa_valor_minimo", sql`${t.valorMinimoCent} >= 0`),
  ],
);
