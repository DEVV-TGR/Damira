import type { Pedido } from "@/lib/dados/tipos";
import { FUSO } from "@/lib/horarios";
import { diaDeLisboa, diaPorExtenso, rotuloPagamento } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";

/**
 * # O talão (`impressao.md`)
 *
 * O talão é composto aqui como uma lista de linhas já com a largura do papel,
 * e só depois traduzido para a impressora (`talao-epos.ts`). A divisão é de
 * propósito: o que o talão diz decide-se uma vez, e a forma de o mandar — do
 * tablet pelo IP, ou do servidor pelo Server Direct Print — ainda depende do
 * modelo que a loja tem. Os dois caminhos falam ePOS-Print, e os dois leem
 * daqui.
 *
 * Puro e sem dados: `agora` entra como argumento, e as horas são as de Lisboa
 * (regra 3 do AGENTS.md).
 */

/**
 * Colunas de uma TM-m30 em papel de 80 mm, na letra normal (Font A). Com
 * `grande` a letra tem o dobro da largura, e cabe metade.
 */
export const COLUNAS = 48;

export type Linha = {
  texto: string;
  /** Letra de altura e largura duplas: cabem `COLUNAS / 2`. */
  grande: boolean;
  negrito: boolean;
  /**
   * Fundo preto, texto branco. A linha já vem preenchida com espaços até à
   * largura toda — a impressora só inverte onde há carateres, e sem isso a
   * faixa ficava do tamanho da palavra.
   */
  invertido: boolean;
};

/**
 * - `bloco`: só o «HOJE · QUINTA 14:30» invertido.
 * - `inteiro`: o talão inteiro a preto, como se pediu na reunião de 23/09.
 *
 * Os dois existem até se testarem na impressora verdadeira: um fundo todo
 * preto imprime mais devagar e pode manchar (`impressao.md`).
 */
export type Fundo = "bloco" | "inteiro";

export type OpcoesTalao = { agora: Date; fundo: Fundo };

type Estilo = Partial<Omit<Linha, "texto">> & { centro?: boolean; recuo?: number };

const larguraDe = (grande: boolean) => (grande ? COLUNAS / 2 : COLUNAS);

/**
 * O que a impressora não tem na tabela de carateres sai como «?». O
 * `formatarCent` escreve o «€» depois de um espaço inquebrável, e o
 * `Intl` de outros sítios usa o espaço estreito: os dois passam a espaço.
 */
export const normalizar = (texto: string): string =>
  texto
    .replace(/[  ]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

/**
 * Parte um texto em linhas de `largura`, pelas palavras; uma palavra maior do
 * que a linha é cortada. Parte só nos espaços normais: o inquebrável do
 * «12,50 €» mantém o «€» agarrado ao número, e só depois passa a espaço.
 */
export function partir(texto: string, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (let palavra of paragrafo.split(/ +/).filter(Boolean).map(normalizar)) {
      while (palavra.length > largura) {
        if (atual) linhas.push(atual);
        linhas.push(palavra.slice(0, largura));
        palavra = palavra.slice(largura);
        atual = "";
      }
      if (!atual) atual = palavra;
      else if (atual.length + 1 + palavra.length <= largura) atual += ` ${palavra}`;
      else {
        linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

/** Texto à esquerda e à direita na mesma linha; se não couberem, a esquerda parte-se e a direita fica na primeira. */
function emColunas(esquerda: string, direita: string, largura: number): string[] {
  const espaco = largura - direita.length - 1;
  const [primeira, ...resto] = partir(esquerda, espaco);
  return [primeira.padEnd(espaco + 1) + direita, ...resto];
}

class Composicao {
  readonly linhas: Linha[] = [];
  constructor(private readonly tudoInvertido: boolean) {}

  /** Uma ou mais linhas, partidas à largura do papel. */
  escrever(texto: string, { recuo = 0, ...estilo }: Estilo = {}) {
    const largura = larguraDe(estilo.grande ?? false) - recuo;
    for (const linha of partir(texto, largura)) this.linhaPronta(" ".repeat(recuo) + linha, estilo);
  }

  linhaPronta(texto: string, { centro = false, ...estilo }: Estilo = {}) {
    const grande = estilo.grande ?? false;
    const invertido = this.tudoInvertido || (estilo.invertido ?? false);
    const largura = larguraDe(grande);
    let linha = normalizar(texto);
    /* O centro faz-se aqui e não na impressora: assim o mesmo talão sai igual
       pelos dois caminhos, e a faixa invertida fica com o texto ao meio. */
    if (centro) linha = " ".repeat(Math.max(0, Math.floor((largura - linha.length) / 2))) + linha;
    if (invertido) linha = linha.padEnd(largura);
    this.linhas.push({ texto: linha, grande, negrito: estilo.negrito ?? false, invertido });
  }

  separador() {
    this.linhaPronta("-".repeat(COLUNAS));
  }

  vazia() {
    this.linhaPronta("");
  }
}

const DIA_DA_SEMANA = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: FUSO });
const DATA_CURTA = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", timeZone: FUSO });

/** «QUINTA», «SÁBADO» — o «-feira» não cabe na faixa em letra grande. */
const diaDaSemanaCurto = (instante: Date): string => DIA_DA_SEMANA.format(instante).split("-")[0].toUpperCase();

/** «quinta-feira, 8 de outubro, 14:30» */
const levantamentoPorExtenso = (instante: Date): string => `${diaPorExtenso(instante)}, ${horaDeLisboa(instante)}`;

const quantidade = (linha: Pedido["linhas"][number]): string =>
  linha.unidade === "kg" ? `${linha.quantidade.toLocaleString("pt-PT")} kg` : `${linha.quantidade} x`;

function cabecalho(c: Composicao, subtitulo: string) {
  c.linhaPronta("DAMIRA", { grande: true, negrito: true, centro: true });
  c.linhaPronta(subtitulo, { centro: true });
  c.separador();
}

function artigos(c: Composicao, pedido: Pedido, comPrecos: boolean) {
  for (const linha of pedido.linhas) {
    const nome = `${quantidade(linha)} ${linha.nome}${linha.variante ? ` (${linha.variante})` : ""}`;
    const preco = formatarCent(linha.totalCent, "pt");
    for (const texto of comPrecos ? emColunas(nome, normalizar(preco), COLUNAS) : partir(nome, COLUNAS)) {
      c.linhaPronta(texto, { negrito: true });
    }
    for (const escolha of linha.escolhas) c.escrever(`- ${escolha}`, { recuo: 3 });
    if (linha.notas) c.escrever(`Nota: ${linha.notas}`, { recuo: 3 });
  }
}

/**
 * O talão de um pedido pago. Leva o que `impressao.md` › Decidido diz, por
 * esta ordem: primeiro o que a cozinha procura de relance (quando e qual), e
 * por fim o dinheiro.
 */
export function talaoDoPedido(pedido: Pedido, { agora, fundo }: OpcoesTalao): Linha[] {
  const c = new Composicao(fundo === "inteiro");
  const hora = horaDeLisboa(pedido.levantamentoEm);
  const ehHoje = diaDeLisboa(pedido.levantamentoEm) === diaDeLisboa(agora);

  cabecalho(c, "Pedido online");
  if (ehHoje) {
    c.linhaPronta(`HOJE · ${diaDaSemanaCurto(pedido.levantamentoEm)} ${hora}`, {
      grande: true,
      negrito: true,
      invertido: true,
      centro: true,
    });
  } else {
    c.linhaPronta(`${diaDaSemanaCurto(pedido.levantamentoEm)} ${DATA_CURTA.format(pedido.levantamentoEm)} ${hora}`, {
      grande: true,
      negrito: true,
      centro: true,
    });
  }
  c.linhaPronta(pedido.referencia, { grande: true, negrito: true, centro: true });
  c.escrever(`Levantamento: ${levantamentoPorExtenso(pedido.levantamentoEm)}`);
  c.separador();

  c.escrever(pedido.cliente.nome, { negrito: true });
  if (pedido.cliente.telefone) c.escrever(`Tel. ${pedido.cliente.telefone}`);
  if (pedido.cliente.nif) c.escrever(`NIF ${pedido.cliente.nif}`);
  c.separador();

  artigos(c, pedido, true);

  if (pedido.observacoes) {
    c.separador();
    c.escrever("OBSERVAÇÕES", { negrito: true });
    c.escrever(pedido.observacoes);
  }
  c.separador();

  for (const texto of emColunas("TOTAL", normalizar(formatarCent(pedido.totalCent, "pt")), COLUNAS)) {
    c.linhaPronta(texto, { negrito: true });
  }
  c.vazia();
  c.escrever(rotuloPagamento(pedido), { grande: true, negrito: true, centro: true });
  c.vazia();
  c.linhaPronta("Documento sem valor fiscal", { centro: true });
  c.linhaPronta(`Impresso ${DATA_CURTA.format(agora)} ${horaDeLisboa(agora)}`, { centro: true });
  return c.linhas;
}

/**
 * O talão de cancelamento (`pedidos.md` › Cancelar): o outro já está na
 * cozinha, e é este que diz para parar. Leva os artigos, sem preços, para quem
 * o lê não ter de ir procurar o primeiro.
 */
export function talaoDeCancelamento(pedido: Pedido, { agora, fundo }: OpcoesTalao): Linha[] {
  const c = new Composicao(fundo === "inteiro");
  cabecalho(c, "Pedido online");
  c.linhaPronta("CANCELADO", { grande: true, negrito: true, invertido: true, centro: true });
  c.linhaPronta(pedido.referencia, { grande: true, negrito: true, centro: true });
  c.escrever(`Levantamento previsto: ${levantamentoPorExtenso(pedido.levantamentoEm)}`);
  c.escrever(pedido.cliente.nome, { negrito: true });
  c.separador();
  artigos(c, pedido, false);
  c.separador();
  c.linhaPronta(`Impresso ${DATA_CURTA.format(agora)} ${horaDeLisboa(agora)}`, { centro: true });
  return c.linhas;
}

/**
 * Só para o teste na loja: todos os carateres que o talão usa, para se ver
 * quais a impressora não tem. Se algum sair como «?», o talão vai pelo outro
 * modo de carateres (`talao-epos.ts`).
 */
export function talaoDeCarateres(): Linha[] {
  const c = new Composicao(false);
  cabecalho(c, "Teste de carateres");
  c.escrever("minúsculas: á à â ã é ê í ó ô õ ú ç ü");
  c.escrever("MAIÚSCULAS: Á À Â Ã É Ê Í Ó Ô Õ Ú Ç");
  c.escrever("outros: € º ª « » · ×");
  c.escrever("Pastelaria · Leitão · Pão de Ló · Açúcar");
  c.linhaPronta("ÇÃO € 12,50", { grande: true, negrito: true });
  c.linhaPronta("ÇÃO € 12,50", { grande: true, negrito: true, invertido: true });
  return c.linhas;
}
