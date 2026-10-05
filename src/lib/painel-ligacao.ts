/**
 * # Se o painel ainda está ligado
 *
 * ⚠️ **Um painel desligado com ar normal é pior do que nenhum** (`painel.md`): a
 * equipa confia nele e os pedidos acumulam-se sem ninguém ver. Puro, para se
 * testar sem browser — o relógio e o estado da rede entram por argumento.
 */

/** De quanto em quanto tempo o painel pergunta pela versão. */
export const INTERVALO_POLLING_MS = 10_000;

/* Duas voltas falhadas e meia: uma resposta lenta não acende o aviso, um tablet
   sem rede acende-o antes de alguém dar pela falta de um pedido. */
const TOLERANCIA_MS = 25_000;

/**
 * Sem ligação quando a última resposta boa tem mais de 25 segundos, ou logo que
 * o browser diga que está `offline`.
 */
export const semLigacao = (ultimoSucesso: Date, agora: Date, online: boolean): boolean =>
  !online || agora.getTime() - ultimoSucesso.getTime() > TOLERANCIA_MS;

const HORA_DE_LISBOA = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});

/** A hora em Lisboa, `"10:42"`. O tablet pode estar noutro fuso; a loja não. */
export const horaDeLisboa = (instante: Date): string => HORA_DE_LISBOA.format(instante);

export const textoSemLigacao = (desde: Date): string =>
  `Sem ligação desde as ${horaDeLisboa(desde)} — os pedidos novos não estão a aparecer`;
