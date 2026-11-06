import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import type { z } from "zod";
import { FUSO, validarLevantamento, type ArtigoDoCesto, type VagaOcupada } from "@/lib/horarios";
import { esgotadoHoje } from "@/lib/painel";
import type {
  ConfiguracaoDaCasa,
  Cotacao,
  DefinicoesLoja,
  EsquemaEntradaPedido,
  EsquemaEntradaProduto,
  LinhaCesto,
  LinhaCotada,
  Pedido,
  Produto,
  ResultadoCriarPedido,
  ResultadoPainel,
} from "./tipos";

/**
 * # As regras da fronteira, num sítio só
 *
 * O que as duas implementações da `FonteDeDados` — a dos JSON (`json.ts`) e a
 * da base de dados (`bd.ts`) — têm de decidir da mesma maneira. Duas cópias de
 * uma regra são duas regras no dia em que alguém só muda uma; por isso vivem
 * aqui, sem dados e sem base de dados: recebem o que precisam por argumento.
 */

/* Um passo de 0,5 kg em vírgula flutuante: 1,5 / 0,5 dá 3 certinho, mas não é
   preciso esperar muito por um 0,1 + 0,2. */
const EPSILON = 1e-9;
const noMultiplo = (quantidade: number, minimo: number, multiplo: number) => {
  const passos = (quantidade - minimo) / multiplo;
  return Math.abs(passos - Math.round(passos)) < EPSILON;
};

/**
 * O preço do cesto, calculado no servidor (regra 1 do `AGENTS.md`). As linhas
 * já vêm validadas pelo `EsquemaLinhaCesto`; o produto de cada uma vem de quem
 * chama — do `Map` dos JSON, ou de uma consulta à base de dados. Um produto
 * arquivado ou tirado de venda tem de vir na mesma: é aqui que se recusa.
 */
export function cotarLinhas(
  linhas: readonly (Pick<LinhaCesto, "produtoId" | "varianteId" | "quantidade"> & { escolhas?: readonly string[] })[],
  produtoDe: (id: string) => Produto | undefined,
): Cotacao {
  const cotadas = linhas.map((linha): LinhaCotada => {
    const base = { produtoId: linha.produtoId, varianteId: linha.varianteId, quantidade: linha.quantidade };
    const falha = (erro: LinhaCotada["erro"]): LinhaCotada => ({
      ...base,
      precoUnitarioCent: null,
      totalCent: null,
      erro,
    });

    const produto = produtoDe(linha.produtoId);
    if (!produto) return falha("produto-desconhecido");
    const variante = produto.variantes.find((v) => v.id === linha.varianteId);
    if (!variante) return falha("variante-desconhecida");
    if (!produto.aVendaOnline || produto.arquivado || produto.foraDeVenda) return falha("fora-de-venda");
    /* Com escolhas, exatamente uma, e das do produto: para misturar sabores,
       uma linha por sabor (e cada uma conta o seu mínimo). Sem escolhas, nenhuma. */
    const escolhas = linha.escolhas ?? [];
    const escolhaCerta =
      produto.escolhas.length === 0
        ? escolhas.length === 0
        : escolhas.length === 1 && produto.escolhas.includes(escolhas[0]);
    if (!escolhaCerta) return falha("escolha-invalida");
    if (linha.quantidade < produto.quantidadeMinima - EPSILON) return falha("abaixo-do-minimo");
    if (!noMultiplo(linha.quantidade, produto.quantidadeMinima, produto.multiplo)) {
      return falha("fora-do-multiplo");
    }

    const preco = variante.precoCent;
    return {
      ...base,
      precoUnitarioCent: preco,
      /* Ao quilo, 1,5 kg a 1700 cêntimos são 2550: arredonda-se uma vez, no
         total da linha, e é sempre um inteiro. */
      totalCent: preco === null ? null : Math.round(preco * linha.quantidade),
      erro: null,
    };
  });

  const validas = cotadas.filter((linha) => linha.erro === null);
  return {
    linhas: cotadas,
    totalCent: validas.reduce((soma, linha) => soma + (linha.totalCent ?? 0), 0),
    semPreco: validas.filter((linha) => linha.totalCent === null).length,
    valida: validas.length === cotadas.length,
  };
}

// ——— Gravar um produto (o painel da gerente) ———

/** Os campos que falharam, para o formulário do painel os marcar. */
export const invalido = (erro: z.ZodError): ResultadoPainel<never> => ({
  ok: false,
  erro: "dados-invalidos",
  campos: [...new Set(erro.issues.flatMap((issue) => (issue.path.length > 0 ? [String(issue.path[0])] : [])))],
});

export const naoExiste: ResultadoPainel<never> = { ok: false, erro: "nao-existe" };

/* «Bolo de Bolacha» → `bolo-de-bolacha`. Os acentos saem, porque o id vai no
   URL e um `pão` partilhado por mensagem chega como `p%C3%A3o`. */
export const emId = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

/* O primeiro livre de `base`, `base-2`, `base-3`… */
export const livre = (base: string, ocupados: (id: string) => boolean): string => {
  if (!ocupados(base)) return base;
  let n = 2;
  while (ocupados(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

type EntradaLida = z.output<typeof EsquemaEntradaProduto>;

/* Uma variante nova ganha id a partir do que a distingue: o número de pessoas,
   o rótulo, ou `unica` se for a única. As que já tinham id guardam-no. */
export const comIds = (variantes: EntradaLida["variantes"]): Produto["variantes"] => {
  const usados = new Set(variantes.flatMap((v) => (v.id ? [v.id] : [])));
  return variantes.map((variante) => {
    if (variante.id) return { ...variante, id: variante.id };
    const base =
      variante.pessoas !== null
        ? String(variante.pessoas)
        : variante.rotulo
          ? emId(variante.rotulo.pt) || "variante"
          : "unica";
    const id = livre(base, (candidato) => usados.has(candidato));
    usados.add(id);
    return { ...variante, id };
  });
};

// ——— O pedido ———

/**
 * **O prazo de um pedido por pagar: 31 minutos**, contados de quando nasceu
 * (`pedidos.md`, decidido a 02/11). É também o `expires_at` da sessão do Stripe
 * (`pagamentos.md`): um prazo só, para a vaga nunca sair enquanto alguém a pode
 * pagar. O Stripe exige pelo menos 30 minutos; o minuto a mais cobre os
 * segundos entre criar o pedido e criar a sessão.
 */
export const PRAZO_DO_PEDIDO_MS = 31 * 60_000;

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * A referência de balcão, `DAM-DDMM-XXXX`, sem letras que se confundem ao
 * telefone. ⚠️ O dia é o **de Lisboa**, e o `agora` entra por argumento: entre a
 * meia-noite e a uma da manhã de verão, o dia UTC é o anterior (regra 3 do
 * AGENTS.md). Única na base de dados: quem a gera tenta outra se colidir.
 */
export const gerarReferencia = (agora: Date): string => {
  let sufixo = "";
  for (let i = 0; i < 4; i++) sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `DAM-${format(agora, "ddMM", { in: tz(FUSO) })}-${sufixo}`;
};

type DadosDoPedido = z.output<typeof EsquemaEntradaPedido>;

/** O que passou a conferência: o que falta para o pedido nascer é a referência e o id. */
export type PedidoConferido = {
  ok: true;
  levantamentoEm: Date;
  linhas: Pedido["linhas"];
  totalCent: number;
};

/**
 * Tudo o que se confere antes de um pedido nascer, pela ordem em que se responde:
 * a pausa, os artigos, o preço, o mínimo, o calendário. É uma conferência e não
 * uma garantia: quem decide a última vaga é a base de dados (regra 5), e quem
 * chama trata disso.
 *
 * Os dados vêm de quem chama (`ocupacaoDaVaga` só é pedida se tudo o resto
 * passou, por ser a única que pode ir à base de dados outra vez).
 */
export async function conferirPedido(
  dados: DadosDoPedido,
  agora: Date,
  fontes: {
    definicoes: DefinicoesLoja;
    configuracao: ConfiguracaoDaCasa;
    produtoDe: (id: string) => Produto | undefined;
    ocupacaoDaVaga: (vaga: Date) => VagaOcupada[] | Promise<VagaOcupada[]>;
  },
): Promise<PedidoConferido | Extract<ResultadoCriarPedido, { ok: false }>> {
  const { definicoes, configuracao, produtoDe, ocupacaoDaVaga } = fontes;
  if (definicoes.pausaAte && agora.getTime() < definicoes.pausaAte.getTime()) {
    return { ok: false, erro: "loja-em-pausa" };
  }

  const cotacao = cotarLinhas(dados.linhas, produtoDe);
  if (!cotacao.valida) return { ok: false, erro: "artigo-invalido", linhas: cotacao.linhas };
  if (cotacao.semPreco > 0) return { ok: false, erro: "sob-orcamento", linhas: cotacao.linhas };
  if (definicoes.valorMinimoCent !== null && cotacao.totalCent < definicoes.valorMinimoCent) {
    return { ok: false, erro: "abaixo-do-minimo-da-loja" };
  }

  /* Sem a cozinha ou sem um tempo de produção, não há calendário — e um pedido
     sem calendário é uma promessa sem data. */
  const produtos = dados.linhas.map((linha) => produtoDe(linha.produtoId)!);
  if (configuracao.cozinha === null || produtos.some((p) => p.tempoProducao === null)) {
    return { ok: false, erro: "indisponivel" };
  }
  const cesto: ArtigoDoCesto[] = produtos.map((p) => ({
    tempo: p.tempoProducao!,
    esgotadoHoje: esgotadoHoje(p, agora),
  }));
  const levantamentoEm = new Date(dados.levantamentoEm);
  const validacao = validarLevantamento(
    cesto,
    levantamentoEm,
    agora,
    { ...configuracao, cozinha: configuracao.cozinha },
    await ocupacaoDaVaga(levantamentoEm),
  );
  if (!validacao.ok) return { ok: false, erro: validacao.motivo };

  return {
    ok: true,
    levantamentoEm,
    totalCent: cotacao.totalCent,
    linhas: dados.linhas.map((linha, i) => {
      const produto = produtos[i];
      const variante = produto.variantes.find((v) => v.id === linha.varianteId)!;
      const cotada = cotacao.linhas[i];
      return {
        produtoId: produto.id,
        varianteId: variante.id,
        /* Em português: a língua do pedido ainda não está decidida (`pedidos.md`
           não tem `locale`). */
        nome: produto.nome.pt,
        variante: variante.rotulo?.pt ?? null,
        escolhas: linha.escolhas,
        unidade: produto.unidade,
        quantidade: linha.quantidade,
        precoUnitarioCent: cotada.precoUnitarioCent!,
        totalCent: cotada.totalCent!,
        notas: linha.notas,
      };
    }),
  };
}

/** O pedido no momento em que nasce: pendente, e com tudo o que vem depois a vazio. */
export const pedidoPorPagar = (
  dados: DadosDoPedido,
  conferido: PedidoConferido,
  { id, referencia, agora, contaId }: { id: string; referencia: string; agora: Date; contaId: string | null },
): Pedido => ({
  id,
  referencia,
  estado: "pendente",
  criadoEm: agora,
  levantamentoEm: conferido.levantamentoEm,
  cliente: { ...dados.cliente, contaId },
  linhas: conferido.linhas,
  observacoes: dados.observacoes,
  totalCent: conferido.totalCent,
  /* O sinal é por produto e o modo de pagamento é por pedido; o cesto misto está
     em aberto (`pagamentos.md` › Em aberto, 6). Até lá, paga-se tudo. */
  modoPagamento: "total",
  pagoOnlineCent: 0,
  reembolsadoCent: 0,
  chegouTarde: false,
  pagoEm: null,
  impressoEm: null,
  entregueEm: null,
  canceladoEm: null,
  canceladoPor: null,
  reembolsos: [],
  avisosTratados: [],
  reagendadoEm: null,
});

/**
 * O texto por onde o painel procura um pedido: o nome e a referência, sem
 * acentos e em minúsculas. Escreve-se uma vez, ao criar, e é o que deixa
 * encontrar «a encomenda da Márcia» escrevendo `marcia`
 * (`base-de-dados.md` › Os pedidos).
 */
export const textoDeProcura = (nome: string, referencia: string): string =>
  `${nome} ${referencia}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
