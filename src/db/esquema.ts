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
  uuid,
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

// ——— A entrada no painel (#33, `painel.md`) ———

/* Um instante com fuso. Todos os desta secção são assim: guardam UTC. */
const instante = (nome: string) => timestamp(nome, { withTimezone: true, mode: "date" });

/**
 * Uma sessão aberta no painel: o tablet do balcão, o telemóvel da gerente.
 *
 * ⚠️ **Não é um JWT** (`painel.md` › As sessões vivem na base de dados): só
 * assim se termina a sessão de um dispositivo, ou todas as da equipa quando o
 * PIN muda. O cookie leva um token aleatório; aqui fica **o hash dele**, e quem
 * lesse esta tabela não ficava com sessão nenhuma aberta.
 */
export const sessoesPainel = pgTable(
  "sessoes_painel",
  {
    /**
     * O que o ecrã da gerente usa para mostrar e terminar uma sessão. À parte
     * do hash, para o hash nunca ter de ir ao browser.
     */
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    papel: text("papel").notNull(),
    /** Lembrado: 30 dias, renovados a cada uso. Sem lembrar: um dia de trabalho. */
    lembrar: boolean("lembrar").notNull(),
    /** O que a gerente vê na lista: «iPad · Safari». Nunca o IP. */
    dispositivo: text("dispositivo"),
    criadaEm: instante("criada_em").notNull(),
    ultimoUsoEm: instante("ultimo_uso_em").notNull(),
    /** Quem decide se a sessão vale é isto, e não o prazo do cookie. */
    expiraEm: instante("expira_em").notNull(),
  },
  (t) => [
    check("sessoes_painel_papel", sql`${t.papel} in (${umDe(["funcionario", "gerente"])})`),
    check(
      "sessoes_painel_datas",
      sql`${t.ultimoUsoEm} >= ${t.criadaEm} and ${t.expiraEm} > ${t.criadaEm}`,
    ),
  ],
);

/**
 * Um código de entrada da gerente, enviado por email: 10 minutos, uso único.
 * O código guarda-se com *hash* lento (`scrypt`): são seis dígitos, e um hash
 * rápido adivinhava-se a partir desta tabela em segundos.
 */
export const codigosGerente = pgTable(
  "codigos_gerente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codigoHash: text("codigo_hash").notNull(),
    criadoEm: instante("criado_em").notNull(),
    expiraEm: instante("expira_em").notNull(),
    /** Preenchido ao entrar: um código usado não volta a servir. */
    usadoEm: instante("usado_em"),
    /** Tentativas erradas com este código: ao fim de poucas, deixa de servir. */
    tentativas: integer("tentativas").notNull().default(0),
  },
  (t) => [
    check("codigos_gerente_datas", sql`${t.expiraEm} > ${t.criadoEm}`),
    check("codigos_gerente_tentativas", sql`${t.tentativas} >= 0`),
  ],
);

/**
 * Os limites de tentativas (`robustez.md` › Limites): quantas vezes uma `chave`
 * — `pin:<ip>`, `codigo:<email>` — falhou ou pediu dentro de uma `janela` de
 * tempo. ⚠️ **Na base de dados e não em memória**: na Vercel cada pedido pode
 * cair numa instância diferente, e um limite em memória não limita nada.
 */
export const limites = pgTable(
  "limites",
  {
    chave: text("chave").notNull(),
    /** O início da janela: os 15 minutos do PIN começam aqui. */
    janela: instante("janela").notNull(),
    contagem: integer("contagem").notNull().default(0),
  },
  (t) => [
    /* A chave primária é também o que deixa somar com `ON CONFLICT`, numa
       instrução só, sem ler antes. */
    primaryKey({ columns: [t.chave, t.janela] }),
    check("limites_contagem", sql`${t.contagem} >= 0`),
  ],
);
