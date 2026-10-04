import { z } from "zod";
import type {
  ConfiguracaoHorarios,
  HorarioSemanal,
  TempoProducao,
  VagaOcupada,
} from "@/lib/horarios";

/**
 * # O contrato da fronteira `src/lib/dados/`
 *
 * O que o frontend recebe e o que manda, escrito uma vez. A implementação de
 * hoje lê os JSON (`json.ts`); a da base de dados implementa a mesma
 * `FonteDeDados` e nada daqui muda. Ver `docs/loja/divisao.md`.
 *
 * ⚠️ **Este ficheiro não importa valores de `@/data/*`**, só tipos. É importado
 * por componentes de cliente (para tipar props e validar o cesto no browser), e
 * um `import { CARTAS } from "@/data/ementa"` metia o JSON inteiro da ementa no
 * bundle. Por isso a carta e a categoria são texto aqui: a gerente vai poder
 * criar categorias, e o enum deixava de bater certo nesse dia de qualquer forma.
 * Um teste lê a fonte e recusa esses imports.
 *
 * Os campos do pedido são os do `pedidos.md`. **Ninguém acrescenta um estado ou
 * um campo aqui sem o mudar lá primeiro.**
 */

// ——— Dinheiro ———

/* Cêntimos, inteiros. Nunca um decimal num valor a cobrar (regra 2 do
   AGENTS.md): 0,1 + 0,2 em euros não dá 0,3, e um cêntimo de diferença entre o
   site e o Stripe é um pedido que não fecha. */
const Cent = z.number().int().nonnegative();

/* O inglês pode faltar: a ementa tem os nomes traduzidos, as encomendas nem
   sempre, e um produto novo criado pela gerente não os vai ter. */
const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1).nullable() });

// ——— Produto ———

const EsquemaTempoProducao = z.object({
  unidade: z.enum(["horas", "dias"]),
  valor: z.number().nonnegative(),
}) satisfies z.ZodType<TempoProducao>;

/**
 * O que um produto leva: os salgados e os doces de um escalão, os itens de um
 * kit de bolo ou de uma box. Vive na **variante** e não no produto porque nos
 * kits de festa muda com ela — 20 pessoas não levam o mesmo que 70.
 *
 * A quantidade pode faltar: nas boxes vem colada ao nome («2 Croissants»).
 */
export const EsquemaGrupoComposicao = z.object({
  grupo: z.enum(["salgados", "doces", "itens"]),
  linhas: z.array(z.object({ nome: Texto, quantidade: Texto.nullable() })).min(1),
});

export const EsquemaVariante = z.object({
  /** `"unica"` num produto sem variantes; `"20"` no escalão de 20 pessoas. */
  id: z.string().min(1),
  /** `null` na variante única, que não se escreve. */
  rotulo: Texto.nullable(),
  /** Só nos kits de festa, onde a variante **é** o número de pessoas. */
  pessoas: z.number().int().positive().nullable(),
  /** ⚠️ `null` é **sob orçamento**, nunca zero. O bolo por medida é assim. */
  precoCent: Cent.nullable(),
  /** Vazio quando o produto não se descreve por partes (um artigo da carta). */
  composicao: z.array(EsquemaGrupoComposicao),
});

export const EsquemaProduto = z.object({
  /** Vai para o URL. Único em todo o catálogo, ementa e encomendas juntas. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  origem: z.enum(["ementa", "encomendas"]),
  familia: z.enum(["ementa", "festa", "bolo", "box", "medida"]),
  nome: Texto,
  descricao: Texto.nullable(),
  carta: z.string().nullable(),
  categoria: z.string().nullable(),
  /** Os títulos dentro de uma categoria da ementa (`SeccaoEmenta`). */
  subcategoria: z.string().nullable(),
  /** ⚠️ Em `kg`, o preço é ao quilo e a quantidade são quilos. */
  unidade: z.enum(["un", "kg"]),
  /** Sempre pelo menos uma: um produto sem variantes tem a `"unica"`. */
  variantes: z.array(EsquemaVariante).min(1),
  /** Escolhas que não mudam o preço: sabores, cores (`painel-gerente.md`). */
  escolhas: z.array(z.string()),
  /** `null` é **por preencher** — a casa ainda não o deu. Não se inventa. */
  tempoProducao: EsquemaTempoProducao.nullable(),
  quantidadeMinima: z.number().positive(),
  /** De quanto em quanto sobe, a partir do mínimo. À dúzia, de 6 em 6. */
  multiplo: z.number().positive(),
  aVendaOnline: z.boolean(),
  apareceNaEmenta: z.boolean(),
  /**
   * Três estados, e os três contam: `null` é **por responder**, `[]` é «sem
   * alergénios» marcado de propósito, e uma lista é a lista. Confundir os dois
   * primeiros é dizer a um alérgico que não há nada quando ninguém verificou.
   */
  alergenios: z.array(z.string()).nullable(),
  vegan: z.boolean(),
  /** Marcado pela gerente, como o vegan (`painel-gerente.md`). Nunca deduzido. */
  semGluten: z.boolean(),
  fotos: z.array(z.string()),
  /** O sinal pedido no checkout, em percentagem. `null` = paga-se tudo. */
  sinalPercent: z.number().int().min(1).max(100).nullable(),
  limite: z
    .object({
      quantidade: z.number().int().positive(),
      /** `porDia` é capacidade da cozinha; `total` é stock que não volta. */
      modo: z.enum(["porDia", "total"]),
    })
    .nullable(),
  /**
   * «Apagar é arquivar» (`painel-gerente.md`): sai do site e do checkout, mas
   * continua a existir, porque os pedidos antigos apontam para ele.
   */
  arquivado: z.boolean(),
  /**
   * O «tirar de venda» do balcão (`painel-balcao.md` › Esgotados). À parte do
   * `aVendaOnline`, que é da gerente: senão o balcão, ao «voltar a pôr», ligava
   * um produto que a gerente tinha deixado desligado de propósito.
   */
  foraDeVenda: z.boolean(),
  /**
   * O «esgotado hoje» do balcão, como **dia de Lisboa** (`"2026-10-04"`), e não
   * como sim/não. Só vale enquanto esse dia for hoje: amanhã o produto volta
   * sozinho, sem uma tarefa agendada a acordar a base de dados para o repor
   * (regra 6 do AGENTS.md). Tira as vagas de hoje, não o produto (`horarios.ts`).
   */
  esgotadoNoDia: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export type GrupoComposicao = z.infer<typeof EsquemaGrupoComposicao>;
export type Variante = z.infer<typeof EsquemaVariante>;
export type Produto = z.infer<typeof EsquemaProduto>;

export type FiltroProdutos = {
  origem?: Produto["origem"];
  familia?: Produto["familia"];
  aVendaOnline?: boolean;
  apareceNaEmenta?: boolean;
  /** Por defeito `false`: só o painel quer ver os arquivados. */
  incluirArquivados?: boolean;
};

// ——— O que o browser manda ———

/**
 * Uma linha do cesto, como chega do browser. ⚠️ **Ids e quantidades, nunca
 * preços** (regra 1 do AGENTS.md). É `strict` de propósito: um `preco` a mais
 * não é ignorado em silêncio, é recusado — quem o manda está a contar que ele
 * sirva para alguma coisa.
 */
export const EsquemaLinhaCesto = z
  .object({
    produtoId: z.string().min(1).max(100),
    varianteId: z.string().min(1).max(100),
    quantidade: z.number().positive().max(10_000),
    escolhas: z.array(z.string().max(100)).max(20).default([]),
    notas: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export type LinhaCesto = z.input<typeof EsquemaLinhaCesto>;

export const EsquemaCliente = z
  .object({
    nome: z.string().trim().min(1).max(120),
    /** Obrigatório: é para lá que vai a confirmação com a referência. */
    email: z.email().max(200),
    telefone: z.string().trim().max(30).nullable().default(null),
    nif: z
      .string()
      .regex(/^\d{9}$/)
      .nullable()
      .default(null),
  })
  .strict();

export const EsquemaEntradaPedido = z
  .object({
    linhas: z.array(EsquemaLinhaCesto).min(1).max(50),
    /** Em ISO, com fuso. Guarda-se em UTC e mostra-se em hora de Lisboa. */
    levantamentoEm: z.iso.datetime({ offset: true }),
    cliente: EsquemaCliente,
    observacoes: z.string().trim().max(1000).nullable().default(null),
    /**
     * Gerada no browser quando o cliente entra no checkout. «Tentar outra vez»
     * reusa-a, e a mesma chave devolve o mesmo pedido (`robustez.md`).
     */
    chaveIdempotencia: z.uuid(),
    /** O campo-armadilha. Vazio para pessoas; preenchido por robôs. */
    armadilha: z.string().max(500),
  })
  .strict();

export type EntradaPedido = z.input<typeof EsquemaEntradaPedido>;

/**
 * O que o servidor sabe e o browser não manda. ⚠️ O `contaId` sai da sessão,
 * nunca do formulário — senão qualquer um punha pedidos na conta de outro.
 */
export type ContextoPedido = {
  agora: Date;
  ip: string | null;
  contaId: string | null;
};

// ——— A cotação: o preço que o servidor calcula ———

export type ErroLinha =
  | "produto-desconhecido"
  | "variante-desconhecida"
  | "fora-de-venda"
  | "abaixo-do-minimo"
  | "fora-do-multiplo";

export type LinhaCotada = {
  produtoId: string;
  varianteId: string;
  quantidade: number;
  /** O preço **de agora**. Se o cesto guardou outro, o browser avisa. */
  precoUnitarioCent: number | null;
  totalCent: number | null;
  erro: ErroLinha | null;
};

/**
 * O aviso «o preço deste artigo mudou» faz-se no browser, a comparar com o que
 * o cesto guardou ao juntar. O servidor decide o preço; o browser só avisa.
 */
export type Cotacao = {
  linhas: LinhaCotada[];
  /** Só as linhas válidas e com preço. */
  totalCent: number;
  /** Linhas válidas sob orçamento. Contam-se à parte, nunca como zero. */
  semPreco: number;
  valida: boolean;
};

export type ResultadoCotacao =
  | { ok: true; cotacao: Cotacao }
  | { ok: false; erro: "dados-invalidos" };

// ——— O pedido (pedidos.md) ———

export const ESTADOS_PEDIDO = ["pendente", "pago", "entregue", "expirado", "cancelado"] as const;

/** A referência de balcão: `DAM-DDMM-XXXX`, sem letras que se confundem ao telefone. */
export const FORMATO_REFERENCIA = /^DAM-\d{4}-[A-HJ-NP-Z2-9]{4}$/;

/**
 * Uma linha guardada é **uma fotografia do momento**: o nome, a variante e o
 * preço como estavam quando se pediu. Um pedido antigo nunca se recalcula a
 * partir do produto de hoje (`pedidos.md`).
 */
export const EsquemaLinhaPedido = z.object({
  produtoId: z.string(),
  varianteId: z.string(),
  nome: z.string(),
  variante: z.string().nullable(),
  escolhas: z.array(z.string()),
  unidade: z.enum(["un", "kg"]),
  quantidade: z.number().positive(),
  precoUnitarioCent: Cent,
  totalCent: Cent,
  notas: z.string().nullable(),
});

/** Um reembolso pedido ao Stripe. O estado vem do webhook, não da resposta (`pagamentos.md`). */
export const EsquemaReembolso = z.object({
  id: z.string(),
  valorCent: Cent.positive(),
  estado: z.enum(["pendente", "concluido", "falhado"]),
  pedidoEm: z.date(),
});

/** Os avisos que a gerente pode dar por tratados (`pedidos.md` › Avisos tratados). */
export const AVISOS_TRATAVEIS = ["chegou-tarde", "possivel-duplicado", "dia-fechado", "reembolso-falhado"] as const;

export const EsquemaPedido = z.object({
  id: z.string(),
  referencia: z.string().regex(FORMATO_REFERENCIA),
  estado: z.enum(ESTADOS_PEDIDO),
  criadoEm: z.date(),
  levantamentoEm: z.date(),
  cliente: EsquemaCliente.extend({ contaId: z.string().nullable() }),
  linhas: z.array(EsquemaLinhaPedido).min(1),
  observacoes: z.string().nullable(),
  totalCent: Cent,
  modoPagamento: z.enum(["total", "sinal"]),
  pagoOnlineCent: Cent,
  /** Só reembolsos `concluido`. O que falta pagar na loja calcula-se, não se guarda. */
  reembolsadoCent: Cent,
  /** Cada reembolso, com o seu estado (`pedidos.md` › Reembolsos). */
  reembolsos: z.array(EsquemaReembolso),
  /** O que a gerente já decidiu: o facto fica, o aviso sai (`pedidos.md` › Avisos tratados). */
  avisosTratados: z.array(z.enum(AVISOS_TRATAVEIS)),
  chegouTarde: z.boolean(),
  pagoEm: z.date().nullable(),
  impressoEm: z.date().nullable(),
  entregueEm: z.date().nullable(),
  canceladoEm: z.date().nullable(),
  canceladoPor: z.enum(["cliente", "gerente"]).nullable(),
  /** A última vez que a gerente mudou o levantamento (`pedidos.md` › Mudar o levantamento). */
  reagendadoEm: z.date().nullable(),
});

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];
export type LinhaPedido = z.infer<typeof EsquemaLinhaPedido>;
export type Pedido = z.infer<typeof EsquemaPedido>;
export type Reembolso = z.infer<typeof EsquemaReembolso>;
export type AvisoTratavel = (typeof AVISOS_TRATAVEIS)[number];

/**
 * Os erros de criar um pedido. As ações devolvem-nos, nunca rebentam para o
 * browser, e o texto vem do `next-intl` (`robustez.md` › Erros).
 *
 * - `recusado`: a armadilha. A ação mostra o mesmo que um sucesso, para o robô
 *   não aprender nada.
 * - `indisponivel`: a vaga não existe para este cesto — ou o calendário ainda
 *   não pode ser calculado, porque falta a cozinha ou um tempo de produção.
 * - `demasiados-pedidos`: o limite por IP e por email. **Conta-o a base de
 *   dados**; a implementação provisória não o conta.
 */
export type ErroCriarPedido =
  | "dados-invalidos"
  | "recusado"
  | "artigo-invalido"
  | "sob-orcamento"
  | "loja-em-pausa"
  | "abaixo-do-minimo-da-loja"
  | "indisponivel"
  | "vaga-cheia"
  | "demasiados-pedidos";

export type ResultadoCriarPedido =
  | { ok: true; pedido: Pedido }
  | { ok: false; erro: ErroCriarPedido; linhas?: LinhaCotada[] };

// ——— A casa ———

/**
 * A configuração do motor de horários, com a cozinha a poder faltar: a Damira
 * ainda não deu o horário dela (`horarios.md` › À espera). Sem cozinha não há
 * calendário, e o site diz isso em vez de inventar um.
 */
export type ConfiguracaoDaCasa = Omit<ConfiguracaoHorarios, "cozinha"> & {
  cozinha: HorarioSemanal | null;
  /**
   * As cores da afluência no calendário, em **percentagem do limite por vaga**,
   * em três degraus (decidido a 04/10): até `livre` é verde, até `media` é
   * amarelo-laranja, acima disso vermelho. Sem limite por vaga
   * (`limitePorVaga: null`) não há cores — percentagem de nada não quer dizer
   * nada. A gerente afina no painel (#45).
   */
  limiaresAfluencia: { livre: number; media: number };
};

export type DefinicoesLoja = {
  /** Desligada por defeito (`pedidos.md` › Cancelar). */
  aceitarCancelamentosSite: boolean;
  devolverSinalAoCancelar: boolean;
  valorMinimoCent: number | null;
  /** A loja em pausa (`painel-balcao.md`). `null` = aberta. */
  pausaAte: Date | null;
};

/**
 * A ordem por que a ementa se lê: as cartas, as categorias dentro de cada uma,
 * os títulos dentro das bebidas. É um dado e não uma regra — a gerente vai
 * poder criar categorias — e não sai da ordem do catálogo, que é outra: o
 * impresso põe os pratos antes dos doces, o JSON não.
 */
export type OrdemEmenta = {
  cartas: string[];
  categorias: string[];
  subcategorias: string[];
};

// ——— O painel ———

export const PAPEIS = ["funcionario", "gerente"] as const;
export type Papel = (typeof PAPEIS)[number];

/**
 * Quem está a mexer, e quando. ⚠️ O `papel` sai da **sessão do painel** (#33),
 * nunca do formulário — como o `contaId` do pedido. Um papel mandado pelo
 * browser era um funcionário a escrever «gerente» e a mudar preços.
 */
export type ContextoPainel = { papel: Papel; agora: Date };

/**
 * - `sem-permissao`: o papel não chega. Verifica-se no `index.ts`, antes de a
 *   fonte ser chamada (regra 8 do AGENTS.md: esconder um botão não é proteger).
 * - `dados-invalidos`: com `campos`, os nomes dos campos que falharam, para o
 *   formulário os marcar.
 * - `nao-existe`: o id não é de produto nem de pedido nenhum.
 * - `estado-mudou`: o pedido já não está no estado de que a ação parte (alguém
 *   o cancelou, ou outro dispositivo já lhe tocou). O painel recarrega a lista.
 * - `falta-cobrar`: entregar um pedido com dinheiro em falta sem confirmar que
 *   se cobrou (`painel-balcao.md` › Entregar).
 * - `fora-do-prazo`: o balcão a desfazer um «entregue» depois dos 5 minutos.
 */
export type ErroPainel =
  | "sem-permissao"
  | "dados-invalidos"
  | "nao-existe"
  | "estado-mudou"
  | "falta-cobrar"
  | "fora-do-prazo";

/** As escritas devolvem um resultado e nunca rebentam para o browser (`robustez.md`). */
export type ResultadoPainel<T> =
  | { ok: true; valor: T }
  | { ok: false; erro: ErroPainel; campos?: string[] };

/**
 * Um produto como a gerente o grava. Sem o `id`, que se gera no servidor a
 * partir do nome e **nunca muda** (vai no URL e nos cestos de quem já o
 * juntou); sem o arquivado, o fora de venda e o esgotado, que têm funções
 * próprias. Uma variante nova vem sem `id`; uma que já existia traz o seu.
 */
export const EsquemaEntradaProduto = EsquemaProduto.omit({
  id: true,
  arquivado: true,
  foraDeVenda: true,
  esgotadoNoDia: true,
})
  .extend({
    variantes: z.array(EsquemaVariante.extend({ id: z.string().min(1).max(100).optional() })).min(1),
  })
  .strict()
  .superRefine((produto, ctx) => {
    /* ⚠️ Na venda à distância os alergénios têm de estar disponíveis antes da
       compra. `null` é «ninguém respondeu», e não conta como «não tem»
       (`painel-gerente.md` › Sem alergénios respondidos). */
    if (produto.aVendaOnline && produto.alergenios === null) {
      ctx.addIssue({ code: "custom", path: ["alergenios"], message: "por responder" });
    }
    /* A ementa agrupa-se por `{carta}-{categoria}`: um artigo sem as duas não
       tinha secção onde aparecer. */
    if (produto.familia === "ementa") {
      if (produto.carta === null) ctx.addIssue({ code: "custom", path: ["carta"], message: "em falta" });
      if (produto.categoria === null) ctx.addIssue({ code: "custom", path: ["categoria"], message: "em falta" });
    }
    if ((produto.origem === "ementa") !== (produto.familia === "ementa")) {
      ctx.addIssue({ code: "custom", path: ["familia"], message: "não bate com a origem" });
    }
    const ids = produto.variantes.flatMap((v) => (v.id ? [v.id] : []));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["variantes"], message: "id repetido" });
    }
  });

export type EntradaProduto = z.input<typeof EsquemaEntradaProduto>;

/* O motor rebenta com uma configuração impossível (`horarios.ts`); aqui
   recusa-se antes de a gravar, com o campo certo marcado. */
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const EsquemaIntervalo = z
  .object({ abre: z.string().regex(HORA), fecha: z.string().regex(HORA).or(z.literal("24:00")) })
  .strict()
  .refine(({ abre, fecha }) => abre < fecha, { message: "fecha antes de abrir", path: ["fecha"] });

/* Por ordem e sem se tocarem: dois períodos sobrepostos contavam as horas de
   cozinha duas vezes. */
const EsquemaDia = z
  .array(EsquemaIntervalo)
  .max(4)
  .refine((dia) => dia.every((p, i) => i === 0 || dia[i - 1].fecha <= p.abre), {
    message: "períodos sobrepostos ou fora de ordem",
  });

const EsquemaSemana = z
  .object({
    domingo: EsquemaDia,
    segunda: EsquemaDia,
    terca: EsquemaDia,
    quarta: EsquemaDia,
    quinta: EsquemaDia,
    sexta: EsquemaDia,
    sabado: EsquemaDia,
  })
  .strict() satisfies z.ZodType<HorarioSemanal>;

/** O que a gerente grava na secção Horários (`painel-gerente.md`). */
export const EsquemaHorarios = z
  .object({
    loja: EsquemaSemana,
    /** Pode continuar `null` até a casa a dar: o calendário fica «a confirmar». */
    cozinha: EsquemaSemana.nullable(),
    diasFechados: z
      .array(
        z
          .object({
            data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            fecha: z.enum(["cozinha", "loja", "ambas"]),
          })
          .strict(),
      )
      .max(366),
    duracaoVagaMinutos: z.number().int().min(5).max(240),
    limitePorVaga: z.number().int().positive().nullable(),
    diasAFrente: z.number().int().min(0).max(365),
    limiaresAfluencia: z
      .object({ livre: z.number().int().min(0).max(100), media: z.number().int().min(0).max(100) })
      .strict()
      .refine(({ livre, media }) => livre < media, { message: "livre tem de ser menor", path: ["livre"] }),
  })
  .strict() satisfies z.ZodType<ConfiguracaoDaCasa>;

/** O que a gerente grava em Definições. A pausa tem função própria (`pausarLoja`). */
export const EsquemaDefinicoes = z
  .object({
    aceitarCancelamentosSite: z.boolean(),
    devolverSinalAoCancelar: z.boolean(),
    valorMinimoCent: Cent.nullable(),
  })
  .strict();

/**
 * A procura de pedidos do painel: as listas do balcão, o arquivo, a pesquisa e
 * os filtros da gerente são todos isto. Vem do browser, por isso valida-se.
 *
 * - `texto`: parte da referência (`4F7K`) ou do nome do cliente, sem contar
 *   maiúsculas nem acentos — quem liga diz «é a encomenda da Márcia».
 * - `cursor`: opaco. O browser devolve o `seguinte` da página anterior e não o
 *   interpreta; a base de dados escolhe o que lá põe (`robustez.md` › paginação).
 * - `ordem`: `levantamento` (o mais cedo primeiro, para as listas do dia) ou
 *   `recentes` (o último criado primeiro, para o arquivo).
 */
export const EsquemaFiltroPedidos = z
  .object({
    estados: z.array(z.enum(ESTADOS_PEDIDO)).min(1).optional(),
    levantamentoDesde: z.date().optional(),
    levantamentoAte: z.date().optional(),
    texto: z.string().trim().min(2).max(100).optional(),
    ordem: z.enum(["levantamento", "recentes"]).default("levantamento"),
    cursor: z.string().max(200).nullable().default(null),
    limite: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export type FiltroPedidos = z.input<typeof EsquemaFiltroPedidos>;

/** Uma página. `seguinte` é `null` na última. */
export type PaginaPedidos = { pedidos: Pedido[]; seguinte: string | null };

/**
 * O que espera pela gerente no topo do painel (`painel-gerente.md` › Precisa de
 * atenção). Só os pedidos que ainda vão ser levantados: depois do dia, o aviso
 * já não serve de nada e sai sozinho, sem ninguém o ter de dispensar.
 *
 * Os três do Stripe estão já declarados, para o painel os saber mostrar; a
 * implementação provisória nunca os devolve, porque não há pagamentos (#42, #43,
 * #49). Os produtos por preencher não estão aqui: contam-se com o
 * `contarPorPreencher` (`src/lib/painel.ts`) sobre o `produtosDoPainel`.
 */
export type AvisoAtencao =
  | { tipo: "chegou-tarde"; pedidoId: string; referencia: string }
  | { tipo: "possivel-duplicado"; pedidoIds: [string, string]; referencias: [string, string] }
  | { tipo: "dia-fechado"; pedidoId: string; referencia: string; data: string }
  | { tipo: "reembolso-falhado"; pedidoId: string; referencia: string }
  | { tipo: "disputa"; pedidoId: string; referencia: string }
  | { tipo: "apanhado-pela-verificacao"; pedidoId: string; referencia: string };

/**
 * O que o painel lê e escreve. Cada função recebe o `ContextoPainel`; **quem
 * pode chamar cada uma decide-o o `index.ts`**, e a implementação recebe só as
 * chamadas que já passaram. O que vem do browser entra como `unknown`.
 */
export type FontePainel = {
  /** Todos, arquivados incluídos. */
  produtosDoPainel(ctx: ContextoPainel): Promise<Produto[]>;
  criarProduto(entrada: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<Produto>>;
  editarProduto(id: string, entrada: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<Produto>>;
  arquivarProduto(id: string, arquivado: boolean, ctx: ContextoPainel): Promise<ResultadoPainel<Produto>>;
  /** Guarda o dia de Lisboa do `ctx.agora`, ou limpa com `false`. */
  marcarEsgotadoHoje(id: string, esgotado: boolean, ctx: ContextoPainel): Promise<ResultadoPainel<Produto>>;
  tirarDeVenda(id: string, fora: boolean, ctx: ContextoPainel): Promise<ResultadoPainel<Produto>>;
  guardarHorarios(entrada: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<ConfiguracaoDaCasa>>;
  guardarDefinicoes(entrada: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<DefinicoesLoja>>;
  /** `null` retoma. O fim de cada opção do balcão calcula-o o `fimDaPausa` (`src/lib/painel.ts`). */
  pausarLoja(ate: Date | null, ctx: ContextoPainel): Promise<ResultadoPainel<DefinicoesLoja>>;

  // Pedidos

  listarPedidos(filtro: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<PaginaPedidos>>;
  pedidoDoPainel(id: string, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /**
   * `pago → entregue`, **condicional**: dois toques ao mesmo tempo (ou em dois
   * dispositivos) entregam uma vez, e o segundo recebe o pedido já entregue.
   * Com dinheiro em falta, só com `faltaCobrada: true` — o painel pergunta
   * «Recebeu os 12,50 € em falta?» antes, e o servidor não confia que perguntou.
   */
  marcarEntregue(id: string, faltaCobrada: boolean, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /**
   * `entregue → pago`. ⚠️ **A única regra de papel que a fonte verifica ela
   * própria**, porque depende do pedido: o balcão só nos 5 minutos a seguir ao
   * `entregueEm`; a gerente a qualquer momento (`pedidos.md`).
   */
  desfazerEntregue(id: string, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  precisaDeAtencao(ctx: ContextoPainel): Promise<ResultadoPainel<AvisoAtencao[]>>;

  // As decisões da gerente (`pedidos.md`): só gerente.

  /** Dá um aviso por tratado. O facto (`chegouTarde`, o dia fechado) fica. */
  tratarAviso(id: string, tipo: AvisoTratavel, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /**
   * Muda o levantamento de um pedido `pago`. `levantamentoEm` em ISO; tem de ser
   * uma hora em que a loja abre e com vaga (`validarLevantamento` com o horário
   * da loja), e no futuro. A vaga antiga liberta-se na mesma transação.
   */
  reagendarPedido(id: string, levantamentoEm: unknown, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /**
   * `pago → cancelado`, pela gerente, com o reembolso escolhido: `0` é nenhum, e
   * nunca mais do que o pago online ainda por devolver. Liberta a vaga.
   */
  cancelarPedido(id: string, reembolsoCent: number, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /** Um reembolso sem cancelar (um artigo que faltou), num pedido pago ou entregue. */
  reembolsarPedido(id: string, valorCent: number, ctx: ContextoPainel): Promise<ResultadoPainel<Pedido>>;
  /**
   * Um número que muda sempre que um pedido muda. É o que o painel pergunta de
   * 10 em 10 segundos, **servido da cache da Vercel** e invalidado a cada
   * alteração — o painel só vai à base de dados quando ele muda, e ela pode
   * dormir (`painel.md`, regra 6). Não diz nada sobre os pedidos, por isso não
   * pede papel nem sessão.
   */
  versaoPedidos(): Promise<number>;
};

// ——— A fronteira ———

/**
 * O que a base de dados tem de implementar para substituir os JSON: a loja e o
 * painel. Tudo `async`, já hoje, para as páginas não mudarem nesse dia.
 *
 * O que vem do browser entra como `unknown` e valida-se lá dentro: é o único
 * sítio em que se pode confiar que a validação acontece.
 */
export type FonteDeDados = FonteLoja & FontePainel;

export type FonteLoja = {
  listarProdutos(filtro?: FiltroProdutos): Promise<Produto[]>;
  produtoPorId(id: string): Promise<Produto | null>;
  ordemDaEmenta(): Promise<OrdemEmenta>;
  configuracaoDaCasa(): Promise<ConfiguracaoDaCasa>;
  definicoesLoja(): Promise<DefinicoesLoja>;
  /** ⚠️ **Nunca em cache** (`robustez.md`): uma vaga em cache vende-se duas vezes. */
  ocupacao(desde: Date, ate: Date): Promise<VagaOcupada[]>;
  cotarCesto(linhas: unknown): Promise<ResultadoCotacao>;
  criarPedido(entrada: unknown, contexto: ContextoPedido): Promise<ResultadoCriarPedido>;
  pedidoPorReferencia(referencia: string): Promise<Pedido | null>;
};
