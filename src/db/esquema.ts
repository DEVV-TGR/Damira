import { type SQL, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
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
/* Relativo e não `@/`: estes são valores, e o `drizzle-kit` carrega este ficheiro
   sem os atalhos do `tsconfig`. */
import { AVISOS_TRATAVEIS, ESTADOS_PEDIDO, type GrupoComposicao, type OrdemEmenta } from "../lib/dados/tipos";
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

// ——— Os pedidos (`pedidos.md`, o contrato) ———

/**
 * Um pedido. Os campos são os do `EsquemaPedido`; os que o contrato não tem
 * («só da base de dados») servem regras que já estão escritas e o browser nunca
 * os vê. O porquê de cada um está em `base-de-dados.md` › Os pedidos.
 *
 * ⚠️ **As transições não vivem aqui**, vivem nos `UPDATE … WHERE estado = …` da
 * fonte. O que vive aqui é o que tem de ser verdade em **qualquer** estado: um
 * pedido pago tem a data em que foi pago, um cancelado diz quem o cancelou.
 */
export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referencia: text("referencia").notNull().unique(),
    estado: text("estado").notNull(),
    criadoEm: instante("criado_em").notNull(),
    levantamentoEm: instante("levantamento_em").notNull(),
    pagoEm: instante("pago_em"),
    impressoEm: instante("impresso_em"),
    entregueEm: instante("entregue_em"),
    canceladoEm: instante("cancelado_em"),
    reagendadoEm: instante("reagendado_em"),
    /** O cliente vive no pedido: é a fotografia do momento, não uma conta. */
    clienteNome: text("cliente_nome").notNull(),
    clienteEmail: text("cliente_email").notNull(),
    clienteTelefone: text("cliente_telefone").notNull(),
    clienteNif: text("cliente_nif"),
    /** O id da conta Google, se o cliente tinha sessão. Sai da sessão, nunca do formulário. */
    contaId: text("conta_id"),
    observacoes: text("observacoes"),
    totalCent: integer("total_cent").notNull(),
    modoPagamento: text("modo_pagamento").notNull(),
    pagoOnlineCent: integer("pago_online_cent").notNull().default(0),
    chegouTarde: boolean("chegou_tarde").notNull().default(false),
    canceladoPor: text("cancelado_por"),
    avisosTratados: text("avisos_tratados").array().notNull().default(sql`'{}'`),
    /** A mesma chave devolve o mesmo pedido (`robustez.md` › Envios duplicados). */
    chaveIdempotencia: uuid("chave_idempotencia").notNull().unique(),
    /** Para os limites por IP. Nunca vai para o painel. */
    ip: text("ip"),
    stripeSessionId: text("stripe_session_id").unique(),
    /** O nome e a referência sem acentos e em minúsculas, para a pesquisa. */
    procura: text("procura").notNull(),
    /**
     * O que já foi devolvido **ou está a caminho**: a trava dos reembolsos ao
     * mesmo tempo (`base-de-dados.md`). Não é o `reembolsadoCent` do contrato.
     */
    reembolsoReservadoCent: integer("reembolso_reservado_cent").notNull().default(0),
    /**
     * ⚠️ **Um pedido feito com `LOJA_EM_TESTE=1`**, pago com cartões de teste.
     * Sem valor por defeito, de propósito: quem cria o pedido tem de dizer o que
     * ele é. E não muda depois de nascer — um gatilho recusa-o (migração
     * `0003`) —, porque é por ele que o lançamento os tira das contas
     * (`pagamentos.md` › Ambientes).
     */
    deTeste: boolean("de_teste").notNull(),
  },
  (t) => [
    check("pedidos_estado", sql`${t.estado} in (${umDe(ESTADOS_PEDIDO)})`),
    check("pedidos_referencia", sql`${t.referencia} ~ '^DAM-[0-9]{4}-[A-HJ-NP-Z2-9]{4}$'`),
    /* E.164, como o `EsquemaCliente`: é por ele que o balcão liga. */
    check("pedidos_telefone", sql`${t.clienteTelefone} ~ '^\\+[1-9][0-9]{6,14}$'`),
    check("pedidos_nif", sql`${t.clienteNif} ~ '^[0-9]{9}$'`),
    check("pedidos_modo_pagamento", sql`${t.modoPagamento} in (${umDe(["total", "sinal"])})`),
    /* ⚠️ Fica de fora `pago_online_cent <= total_cent`: um montante que não bate
       ainda não tem regra (`pagamentos.md` › Em aberto, 8), e um `CHECK` que
       recusasse um pagamento recebido perdia um pedido pago. */
    check("pedidos_valores", sql`${t.totalCent} >= 0 and ${t.pagoOnlineCent} >= 0`),
    check(
      "pedidos_reembolso_reservado",
      sql`${t.reembolsoReservadoCent} >= 0 and ${t.reembolsoReservadoCent} <= ${t.pagoOnlineCent}`,
    ),
    /* Só se cancela um pedido pago, e nada volta de expirado ou de pago para
       trás de pago: ter a data do pagamento é o mesmo que ter sido pago. */
    check(
      "pedidos_pago_em",
      sql`(${t.pagoEm} is not null) = (${t.estado} in (${umDe(["pago", "entregue", "cancelado"])}))`,
    ),
    check("pedidos_entregue_em", sql`${t.estado} <> 'entregue' or ${t.entregueEm} is not null`),
    /* Cancelado é final: quando, por quem, e o estado, os três ou nenhum. */
    check(
      "pedidos_cancelado",
      sql`(${t.estado} = 'cancelado') = (${t.canceladoEm} is not null) and (${t.canceladoEm} is null) = (${t.canceladoPor} is null)`,
    ),
    check("pedidos_cancelado_por", sql`${t.canceladoPor} in (${umDe(["cliente", "gerente"])})`),
    /* Só chega tarde quem chegou: um pagamento. */
    check("pedidos_chegou_tarde", sql`not ${t.chegouTarde} or ${t.pagoEm} is not null`),
    check(
      "pedidos_avisos_tratados",
      sql`${t.avisosTratados} <@ array[${umDe(AVISOS_TRATAVEIS)}]::text[]`,
    ),
    /* As listas do balcão: por estado, pela hora de levantamento. */
    index("pedidos_estado_levantamento").on(t.estado, t.levantamentoEm),
    /* O arquivo e os pedidos da gerente, por cursor. */
    index("pedidos_criado_em_id").on(t.criadoEm, t.id),
    /* O histórico da conta e os possíveis duplicados. */
    index("pedidos_cliente_email").on(t.clienteEmail),
    /* Os limites de criar pedidos (`robustez.md` › Limites): só contam os
       pendentes, por isso os índices só os têm a eles. */
    index("pedidos_pendentes_por_ip").on(t.ip).where(sql`${t.estado} = 'pendente'`),
    index("pedidos_pendentes_por_email").on(t.clienteEmail).where(sql`${t.estado} = 'pendente'`),
  ],
);

/**
 * Uma linha do pedido: ⚠️ **uma cópia** do nome, da variante e do preço desse
 * dia. Nunca se lê o nome nem o preço através do produto — um pedido antigo diz
 * o que se pagou nesse dia (`pedidos.md`).
 */
export const linhasPedido = pgTable(
  "linhas_pedido",
  {
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id),
    /** A ordem do cesto. */
    posicao: integer("posicao").notNull(),
    /* Para o produto há chave estrangeira, porque nenhum produto se apaga. Para
       a variante não: a gerente pode tirar um escalão, e o pedido de ontem
       continua a tê-lo. */
    produtoId: text("produto_id")
      .notNull()
      .references(() => produtos.id),
    varianteId: text("variante_id").notNull(),
    nome: text("nome").notNull(),
    variante: text("variante"),
    escolhas: text("escolhas").array().notNull().default(sql`'{}'`),
    unidade: text("unidade").notNull(),
    /* `numeric`: ao quilo pede-se meio quilo. */
    quantidade: numeric("quantidade", { mode: "number" }).notNull(),
    precoUnitarioCent: integer("preco_unitario_cent").notNull(),
    totalCent: integer("total_cent").notNull(),
    notas: text("notas"),
  },
  (t) => [
    /* É também o índice `linhas_pedido(pedido_id)` do `robustez.md`. */
    primaryKey({ columns: [t.pedidoId, t.posicao] }),
    check("linhas_pedido_posicao", sql`${t.posicao} >= 0`),
    check("linhas_pedido_unidade", sql`${t.unidade} in (${umDe(["un", "kg"])})`),
    check("linhas_pedido_quantidade", sql`${t.quantidade} > 0`),
    check("linhas_pedido_precos", sql`${t.precoUnitarioCent} >= 0 and ${t.totalCent} >= 0`),
  ],
);

/** Os cinco estados de um reembolso no Stripe, e os três do pedido em que caem (`pedidos.md` › Reembolsos). */
const ESTADOS_STRIPE_DO_REEMBOLSO = {
  pendente: ["pending", "requires_action"],
  concluido: ["succeeded"],
  falhado: ["failed", "canceled"],
} as const;

/**
 * Um reembolso. O `id` é nosso, e é a chave de idempotência que vai ao Stripe;
 * o do Stripe fica no `stripe_refund_id` quando ele responde ou o webhook o traz.
 *
 * ⚠️ **Um reembolso `pendente` sem `stripe_refund_id` é trabalho por fazer**:
 * gravou-se antes de se chamar o Stripe, na mesma transação que soma ao
 * `reembolso_reservado_cent`, e repete-se com a mesma chave. Não há uma tabela
 * de trabalho pendente para os reembolsos porque seria guardar o mesmo facto em
 * dois sítios (`pagamentos.md` › Em aberto, 3).
 */
export const reembolsos = pgTable(
  "reembolsos",
  {
    id: text("id").primaryKey(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id),
    valorCent: integer("valor_cent").notNull(),
    estado: text("estado").notNull(),
    pedidoEm: instante("pedido_em").notNull(),
    stripeRefundId: text("stripe_refund_id").unique(),
    /** Qual dos cinco do Stripe. `NULL` até o Stripe dizer alguma coisa. */
    estadoStripe: text("estado_stripe"),
    /**
     * O `failure_reason` do Stripe, ou um motivo nosso quando fomos nós a dá-lo
     * por falhado (um reembolso do painel do Stripe que não deixou caber o nosso).
     */
    motivo: text("motivo"),
    /**
     * A gerente viu a falha e decidiu. ⚠️ **Por reembolso, e não no
     * `avisos_tratados` do pedido**: um segundo reembolso falhado no mesmo pedido
     * ficava escondido pelo primeiro, já tratado.
     */
    falhaTratadaEm: instante("falha_tratada_em"),
  },
  (t) => [
    check("reembolsos_valor", sql`${t.valorCent} > 0`),
    check("reembolsos_estado", sql`${t.estado} in (${umDe(Object.keys(ESTADOS_STRIPE_DO_REEMBOLSO))})`),
    /* O mapeamento do `pedidos.md`, na base de dados: um `succeeded` gravado
       como `falhado` é recusado, venha de onde vier. */
    check(
      "reembolsos_estado_stripe",
      sql.join(
        [
          sql`${t.estadoStripe} is null`,
          ...Object.entries(ESTADOS_STRIPE_DO_REEMBOLSO).map(
            ([nosso, doStripe]) => sql`(${t.estado} = ${sql.raw(`'${nosso}'`)} and ${t.estadoStripe} in (${umDe(doStripe)}))`,
          ),
        ],
        sql` or `,
      ),
    ),
    check("reembolsos_falha_tratada", sql`${t.falhaTratadaEm} is null or ${t.estado} = 'falhado'`),
    /* A soma do `reembolsadoCent` e a lista do painel leem os reembolsos de um pedido. */
    index("reembolsos_pedido").on(t.pedidoId),
  ],
);

/**
 * Os emails por enviar: o de confirmação ao cliente, o aviso à loja. Gravam-se
 * **na mesma transação** que os origina — a passagem a `pago`, o cancelamento —
 * e só depois se enviam (`pagamentos.md` › Em aberto, 3). Se o envio falhar, ou o
 * processo morrer a meio, a linha fica, e repete-se quando a base de dados já
 * estiver acordada por outra razão.
 *
 * O `id` é a chave de idempotência que vai ao Resend: a repetição de um envio que
 * já tinha sido aceite não manda dois emails. Não há chave única «natural»
 * (pedido, modelo, destinatário) porque o mesmo email pode ter de sair duas
 * vezes — o pedido reagendado duas vezes. O que impede o duplicado é a transição
 * só acontecer uma vez.
 */
export const emailsPorEnviar = pgTable(
  "emails_por_enviar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id),
    /** Qual é o email («pago-cliente», «pago-loja»…). Os nomes são da #42. */
    modelo: text("modelo").notNull(),
    destinatario: text("destinatario").notNull(),
    criadoEm: instante("criado_em").notNull(),
    tentativas: integer("tentativas").notNull().default(0),
    ultimaTentativaEm: instante("ultima_tentativa_em"),
    /** O que o Resend respondeu da última vez, para o painel mostrar. */
    ultimoErro: text("ultimo_erro"),
    enviadoEm: instante("enviado_em"),
  },
  (t) => [
    check("emails_por_enviar_modelo", sql`${t.modelo} <> '' and ${t.destinatario} <> ''`),
    check("emails_por_enviar_tentativas", sql`${t.tentativas} >= 0`),
    check("emails_por_enviar_datas", sql`${t.enviadoEm} is null or ${t.enviadoEm} >= ${t.criadoEm}`),
    /* O que falta enviar, do mais antigo para o mais novo. */
    index("emails_por_enviar_pendentes").on(t.criadoEm).where(sql`${t.enviadoEm} is null`),
  ],
);

// ——— As vagas e as quantidades: a última decide-a a base de dados ———

/*
 * Os três contadores (`base-de-dados.md` › Vagas e quantidades). Criar o pedido
 * soma-lhes no mesmo lote que o insere; se a soma passar o limite, o `CHECK`
 * falha e o lote cai inteiro. O limite é **copiado** para a linha porque um
 * `CHECK` não lê outra tabela.
 */
const ocupadasNoLimite = (ocupadas: SQL, limite: SQL) => sql`${limite} is null or ${ocupadas} <= ${limite}`;

/** Uma vaga de levantamento, pelo instante em que começa (a 25/10 a 01:00 repete-se). */
export const vagas = pgTable(
  "vagas",
  {
    inicio: instante("inicio").primaryKey(),
    ocupadas: integer("ocupadas").notNull().default(0),
    /** `NULL` é sem limite: o interruptor da gerente desligado. */
    limite: integer("limite"),
  },
  (t) => [
    check("vagas_ocupadas", sql`${t.ocupadas} >= 0`),
    check("vagas_limite", sql`${t.limite} >= 0`),
    check("vagas_no_limite", ocupadasNoLimite(sql`${t.ocupadas}`, sql`${t.limite}`)),
  ],
);

/** O limite «por dia» de um produto. O dia é o de levantamento (decidido a 05/10). */
export const quantidadesDia = pgTable(
  "quantidades_dia",
  {
    produtoId: text("produto_id")
      .notNull()
      .references(() => produtos.id),
    dia: date("dia", { mode: "string" }).notNull(),
    ocupadas: numeric("ocupadas", { mode: "number" }).notNull().default(0),
    limite: integer("limite"),
  },
  (t) => [
    primaryKey({ columns: [t.produtoId, t.dia] }),
    check("quantidades_dia_ocupadas", sql`${t.ocupadas} >= 0`),
    check("quantidades_dia_limite", sql`${t.limite} >= 0`),
    check("quantidades_dia_no_limite", ocupadasNoLimite(sql`${t.ocupadas}`, sql`${t.limite}`)),
  ],
);

/** O limite «total» de um produto: uma edição limitada, por exemplo. */
export const quantidadesTotal = pgTable(
  "quantidades_total",
  {
    produtoId: text("produto_id")
      .primaryKey()
      .references(() => produtos.id),
    ocupadas: numeric("ocupadas", { mode: "number" }).notNull().default(0),
    limite: integer("limite"),
  },
  (t) => [
    check("quantidades_total_ocupadas", sql`${t.ocupadas} >= 0`),
    check("quantidades_total_limite", sql`${t.limite} >= 0`),
    check("quantidades_total_no_limite", ocupadasNoLimite(sql`${t.ocupadas}`, sql`${t.limite}`)),
  ],
);

// ——— O Stripe (`pagamentos.md`) ———

/**
 * Os eventos do Stripe já tratados. Um evento repetido bate na chave primária e
 * faz cair o lote inteiro: é **só essa violação** que quer dizer «repetido».
 */
export const eventosStripe = pgTable(
  "eventos_stripe",
  {
    id: text("id").primaryKey(),
    tipo: text("tipo").notNull(),
    /**
     * A versão da API em que o evento veio. Um evento nunca muda depois de
     * criado: uma retentativa que chega depois de uma subida da API vem na forma
     * antiga. O Stripe pode mandá-la vazia em eventos antigos.
     */
    apiVersion: text("api_version"),
    recebidoEm: instante("recebido_em").notNull(),
  },
  (t) => [check("eventos_stripe_id", sql`${t.id} like 'evt\\_%'`)],
);
