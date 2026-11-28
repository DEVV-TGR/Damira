import type { Linha } from "@/lib/talao";

/**
 * # O talão em ePOS-Print XML
 *
 * A língua que as Epson TM falam pela rede. É a mesma pelos dois caminhos que
 * a casa ainda vai escolher (`impressao.md`): mandada do tablet para o IP da
 * impressora, ou devolvida pelo servidor quando a impressora a vem buscar
 * (Server Direct Print). Só muda quem a entrega.
 *
 * **O texto vai como texto**, e é a impressora que o converte para a sua
 * tabela de carateres. Havia um segundo modo, com os bytes já convertidos para
 * a PC858, para o caso de a impressora trocar acentos; na visita de 15/11 os
 * dois imprimiram certo os acentos e o «€», e ficou o mais simples.
 */

const NS_EPOS = "http://www.epson-pos.com/schemas/2011/03/epos-print";

/**
 * O espaçamento entre linhas, em pontos. A letra normal tem 24 de altura: com
 * o espaçamento igual, as linhas invertidas tocam-se e o fundo fica contínuo;
 * com o de origem (30) ficava às riscas brancas.
 */
const ESPACAMENTO_COLADO = 24;

/** A largura que a TM-m30 imprime em papel de 80 mm, em pontos (8 por mm). */
const LARGURA_DO_PAPEL = 576;

/**
 * A margem de cada lado, em pontos: 12 = 1,5 mm, a largura de um carater.
 * Na visita, o talão a preto chegava às bordas do papel; o Gonçalo pediu uma
 * margem de 1 a 2 mm. É por isto que o `talao.ts` compõe 46 colunas e não 48.
 */
export const MARGEM_PONTOS = 12;

const escaparXml = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hex = (bytes: number[]): string => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

const GS = 0x1d;
const doisBytes = (n: number) => [n & 0xff, n >> 8];

/**
 * A margem esquerda (`GS L`) e a largura da área de impressão (`GS W`), em
 * ESC/POS cru: o ePOS-Print XML não tem elemento para elas.
 *
 * ⚠️ **No fim do talão volta-se ao de origem.** A impressora guarda a margem
 * até se desligar, e a mesma impressora pode imprimir outras coisas (o
 * computador da loja): sem o reinício, tudo o que viesse a seguir saía mais
 * estreito.
 */
const margens = (margem: number) => `<command>${hex([GS, 0x4c, ...doisBytes(margem), GS, 0x57, ...doisBytes(LARGURA_DO_PAPEL - 2 * margem)])}</command>`;

function emElementosTexto(linhas: Linha[], colado: boolean): string {
  const partes = [`<text lang="en" smooth="true"/>`];
  if (colado) partes.push(`<text linespc="${ESPACAMENTO_COLADO}"/>`);
  for (const linha of linhas) {
    partes.push(
      `<text dw="${linha.grande}" dh="${linha.grande}"/>`,
      `<text reverse="${linha.invertido}" ul="false" em="${linha.negrito}" color="color_1"/>`,
      `<text>${escaparXml(linha.texto)}&#10;</text>`,
    );
  }
  partes.push(`<text dw="false" dh="false"/>`, `<text reverse="false" ul="false" em="false" color="color_1"/>`);
  if (colado) partes.push(`<text linespc="30"/>`);
  return partes.join("");
}

/** O documento `<epos-print>`: a margem, o talão, três linhas de folga, o corte, e a margem de origem. */
export function emEposPrint(linhas: Linha[]): string {
  /* Só vale a pena colar as linhas quando há fundo preto seguido; num talão
     normal o espaçamento de origem lê-se melhor. */
  const colado = linhas.filter((l) => l.invertido).length > 1;
  return (
    `<epos-print xmlns="${NS_EPOS}">` +
    margens(MARGEM_PONTOS) +
    emElementosTexto(linhas, colado) +
    `<feed line="3"/><cut type="feed"/>` +
    margens(0) +
    `</epos-print>`
  );
}

/**
 * O envelope SOAP que o serviço ePOS-Print da impressora espera, em
 * `/cgi-bin/epos/service.cgi`.
 */
export const envelopeSoap = (eposPrint: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${eposPrint}</s:Body></s:Envelope>`;

export type Protocolo = "http" | "https";

/**
 * O endereço do serviço na impressora. `local_printer` é o nome que a Epson dá
 * à impressora dela própria.
 *
 * ⚠️ **O protocolo segue o da página.** Uma página em https (o site no ar)
 * não pode falar com a impressora em http: o browser recusa. Para o caminho do
 * tablet, a impressora tem de ter o https ligado na configuração dela, e o
 * certificado dela aceite uma vez no tablet (`impressao.md`). O http fica para
 * o site a correr no portátil.
 */
export const enderecoDoServico = (ip: string, protocolo: Protocolo, timeoutMs = 10_000): string =>
  `${protocolo}://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=${timeoutMs}`;

export type RespostaImpressora = { ok: true } | { ok: false; codigo: string; estado: string | null };

/**
 * A resposta da impressora: `<response success="true" code="" status="…"/>`.
 * Os códigos mais prováveis na loja são `EPTR_COVER_OPEN` (tampa aberta),
 * `EPTR_REC_EMPTY` (sem papel) e `EX_TIMEOUT`.
 */
export function lerResposta(xml: string): RespostaImpressora {
  const atributo = (nome: string) => new RegExp(`\\b${nome}="([^"]*)"`).exec(xml)?.[1] ?? null;
  if (atributo("success") === "true") return { ok: true };
  return { ok: false, codigo: atributo("code") || "sem-resposta", estado: atributo("status") };
}

/**
 * Um IPv4 da rede local (10/8, 172.16/12, 192.168/16). O envio pelo portátil
 * só aceita estes: um servidor que manda pedidos para qualquer endereço que o
 * browser lhe dê é uma porta para a rede de outra pessoa.
 */
export function ipDaRedeLocal(ip: string): boolean {
  const partes = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!partes) return false;
  const [a, b, ...resto] = partes.slice(1).map(Number);
  if ([a, b, ...resto].some((n) => n > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
