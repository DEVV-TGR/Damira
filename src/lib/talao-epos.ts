import type { Linha } from "@/lib/talao";

/**
 * # O talão em ePOS-Print XML
 *
 * A língua que as Epson TM falam pela rede. É a mesma pelos dois caminhos que
 * o modelo da loja vai decidir (`impressao.md`): mandada do tablet para o IP da
 * impressora, ou devolvida pelo servidor quando a impressora a vem buscar
 * (Server Direct Print). Só muda quem a entrega.
 *
 * Há **dois modos de carateres**, porque não se sabe ainda qual funciona na
 * impressora da loja, e o português não perdoa: um «Ã» trocado por «?» num
 * talão de «LEITÃO» é o que a cozinha vai ler.
 *
 * - `texto`: o texto vai como texto, e é a impressora que o converte para a
 *   sua tabela de carateres. É o modo normal do ePOS-Print, e o mais simples.
 * - `cp858`: o texto vai já convertido em bytes da tabela PC858 (o PC850 com o
 *   «€»), escolhida com `ESC t 19`, dentro de um `<command>`. Não depende da
 *   conversão da impressora — se o modo `texto` trocar acentos, este não troca.
 *
 * O teste na loja escolhe um; o outro sai.
 */

export type ModoCarateres = "texto" | "cp858";

const NS_EPOS = "http://www.epson-pos.com/schemas/2011/03/epos-print";

/**
 * O espaçamento entre linhas, em pontos. A letra normal tem 24 de altura: com
 * o espaçamento igual, as linhas invertidas tocam-se e o fundo fica contínuo;
 * com o de origem (30) ficava às riscas brancas.
 */
const ESPACAMENTO_COLADO = 24;

const escaparXml = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Os bytes 0x80–0xFF da tabela PC858, por ordem. Gerada a partir do codec `cp858` do Python. */
const PC858_ALTA =
  "ÇüéâäàåçêëèïîìÄÅ" +
  "ÉæÆôöòûùÿÖÜø£Ø×ƒ" +
  "áíóúñÑªº¿®¬½¼¡«»" +
  "░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐" +
  "└┴┬├─┼ãÃ╚╔╩╦╠═╬¤" +
  "ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀" +
  "ÓßÔÒõÕµþÞÚÛÙýÝ¯´" +
  "­±‗¾¶§÷¸°¨·¹³²■ ";

const BYTE_PC858 = new Map([...PC858_ALTA].map((c, i) => [c, 0x80 + i]));

/** Um texto em bytes PC858. O que a tabela não tem sai como «?», que é o que a impressora faria. */
export function emPc858(texto: string): number[] {
  return [...texto].map((c) => {
    const codigo = c.codePointAt(0)!;
    if (codigo >= 0x20 && codigo < 0x7f) return codigo;
    return BYTE_PC858.get(c) ?? 0x3f;
  });
}

const hex = (bytes: number[]): string => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

const ESC = 0x1b;
const GS = 0x1d;

/** As linhas em ESC/POS: tamanho (`GS !`), negrito (`ESC E`) e invertido (`GS B`) a cada linha. */
function emEscPos(linhas: Linha[], colado: boolean): number[] {
  const bytes = [ESC, 0x74, 19]; // ESC t 19: tabela PC858
  if (colado) bytes.push(ESC, 0x33, ESPACAMENTO_COLADO);
  for (const linha of linhas) {
    bytes.push(GS, 0x21, linha.grande ? 0x11 : 0x00);
    bytes.push(ESC, 0x45, linha.negrito ? 1 : 0);
    bytes.push(GS, 0x42, linha.invertido ? 1 : 0);
    bytes.push(...emPc858(linha.texto), 0x0a);
  }
  bytes.push(GS, 0x21, 0, ESC, 0x45, 0, GS, 0x42, 0);
  if (colado) bytes.push(ESC, 0x32); // ESC 2: o espaçamento de origem
  return bytes;
}

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
  return partes.join("");
}

/** O documento `<epos-print>`: o talão, três linhas de margem e o corte. */
export function emEposPrint(linhas: Linha[], modo: ModoCarateres): string {
  /* Só vale a pena colar as linhas quando há fundo preto seguido; num talão
     normal o espaçamento de origem lê-se melhor. */
  const colado = linhas.filter((l) => l.invertido).length > 1;
  const corpo =
    modo === "cp858" ? `<command>${hex(emEscPos(linhas, colado))}</command>` : emElementosTexto(linhas, colado);
  return `<epos-print xmlns="${NS_EPOS}">${corpo}<feed line="3"/><cut type="feed"/></epos-print>`;
}

/**
 * O envelope SOAP que o serviço ePOS-Print da impressora espera, em
 * `http://<ip>/cgi-bin/epos/service.cgi`.
 */
export const envelopeSoap = (eposPrint: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${eposPrint}</s:Body></s:Envelope>`;

/** O endereço do serviço na impressora. `local_printer` é o nome que a Epson dá à impressora dela própria. */
export const enderecoDoServico = (ip: string, timeoutMs = 10_000): string =>
  `http://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=${timeoutMs}`;

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
