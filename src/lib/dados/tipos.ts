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
});

export type GrupoComposicao = z.infer<typeof EsquemaGrupoComposicao>;
export type Variante = z.infer<typeof EsquemaVariante>;
export type Produto = z.infer<typeof EsquemaProduto>;

export type FiltroProdutos = {
  origem?: Produto["origem"];
  familia?: Produto["familia"];
  aVendaOnline?: boolean;
  apareceNaEmenta?: boolean;
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
  chegouTarde: z.boolean(),
  pagoEm: z.date().nullable(),
  impressoEm: z.date().nullable(),
  entregueEm: z.date().nullable(),
  canceladoEm: z.date().nullable(),
  canceladoPor: z.enum(["cliente", "gerente"]).nullable(),
});

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];
export type LinhaPedido = z.infer<typeof EsquemaLinhaPedido>;
export type Pedido = z.infer<typeof EsquemaPedido>;

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

// ——— A fronteira ———

/**
 * O que a base de dados tem de implementar para substituir os JSON. Tudo
 * `async`, já hoje, para as páginas não mudarem nesse dia.
 *
 * O que vem do browser entra como `unknown` e valida-se lá dentro: é o único
 * sítio em que se pode confiar que a validação acontece.
 */
export type FonteDeDados = {
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
