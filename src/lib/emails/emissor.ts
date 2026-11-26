import type { Pedido, LinhaEmail } from "@/lib/dados/tipos";
import type { DadosEmailPedido } from "./tipos";

export const MAXIMO_TENTATIVAS = 5;
export const JANELA_RESERVA_MS = 120_000;
export const JANELA_IDEMPOTENCIA_MS = 24 * 3_600_000;

/**
 * O corte da fila: o instante em que o emissor passou a ser chamado pelas ações.
 * O #139 grava emails na fila desde 26/11, e nessa altura ninguém os enviava. O
 * primeiro envio não pode despejar de uma vez avisos de pedidos antigos, que já
 * ninguém espera: o que foi gravado antes daqui sai como
 * `saltado: anterior-ao-emissor`, sem tentativa no Resend.
 *
 * ⚠️ Não se adianta esta data. O que entrar na fila depois dela é para sair.
 */
export const CORTE_DA_FILA = new Date("2026-11-26T17:00:00Z");

export const anteriorAoEmissor = (linha: LinhaEmail, corte: Date = CORTE_DA_FILA): boolean =>
  +linha.criadoEm < +corte;
export const esperaDaTentativa = (tentativas: number): number =>
  JANELA_RESERVA_MS * 2 ** Math.max(0, tentativas - 1);

export const foraDaJanelaDeIdempotencia = (linha: LinhaEmail, agora: Date): boolean =>
  linha.tentativas > 0 && +agora >= +linha.criadoEm + JANELA_IDEMPOTENCIA_MS;

export function reservaDisponivel(linha: LinhaEmail, agora: Date): boolean {
  return linha.enviadoEm === null && linha.tentativas < MAXIMO_TENTATIVAS &&
    (linha.ultimaTentativaEm === null ||
      +agora >= +linha.ultimaTentativaEm + esperaDaTentativa(linha.tentativas));
}

/** Sem o #139 não existe credencial de proposta nem a fotografia dos preços fixados. */
export const modeloSuportado = (modelo: string): boolean => modelo !== "resposta-cliente";

export function dadosDoEmail(
  pedido: Pedido,
  linha: LinhaEmail,
  { modoDeTeste }: { agora: Date; modoDeTeste: boolean },
): DadosEmailPedido | { saltar: string } {
  if (!modeloSuportado(linha.modelo)) throw new Error("modelo-nao-suportado");
  if (linha.modelo === "lembrete-loja" && pedido.estado !== "por-confirmar") {
    return { saltar: "lembrete-sem-espera" };
  }
  // O recibo documenta o envio inicial mesmo que uma resposta da casa já esteja na fila.
  const estado = linha.modelo === "criado-por-confirmar-cliente" ? "por-confirmar"
    : linha.modelo === "criado-confirmado-cliente" || pedido.confirmadoEm !== null ? "confirmado" : "por-confirmar";
  return {
    referencia: pedido.referencia as DadosEmailPedido["referencia"], estado,
    cliente: pedido.cliente,
    linhas: pedido.linhas.map(l => ({
      nome: l.nome,
      detalhe: [l.variante, ...l.escolhas, l.notas].filter(Boolean).join(" · ") || null,
      quantidade: l.quantidade, unidade: l.unidade, precoUnitCent: l.precoUnitarioCent,
      totalCent: l.totalCent, aoQuilo: l.unidade === "kg",
    })),
    totalCent: pedido.totalCent,
    faltamPrecos: pedido.linhas.some(l => l.precoUnitarioCent === null || l.totalCent === null),
    criadoEm: pedido.criadoEm, levantamentoEm: pedido.levantamentoEm,
    expiraEm: pedido.expiraEm ?? undefined, aceiteEm: pedido.aceiteEm ?? undefined,
    reagendadoEm: pedido.reagendadoEm ?? undefined,
    canceladoPor: pedido.canceladoPor ?? undefined,
    observacoes: pedido.observacoes, modoDeTeste,
  };
}

export const podeTentarEmail = (linha: LinhaEmail, agora: Date): boolean =>
  reservaDisponivel(linha, agora) && !foraDaJanelaDeIdempotencia(linha, agora);
