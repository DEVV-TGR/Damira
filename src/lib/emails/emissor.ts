import type { Pedido, LinhaEmail } from "@/lib/dados/tipos";
import { propostaEmAberto } from "@/lib/dados/regras";
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

/**
 * O endereço absoluto da página do aceite, para uma referência e uma versão da proposta. Quem o
 * monta é o chamador (`enviar.ts`, com o `PROPOSTA_SEGREDO` e o `URL_SITE`): este ficheiro não
 * toca na chave, e os testes passam um falso.
 */
export type LinkDaProposta = (referencia: string, versao: number) => string;

/**
 * O que distingue a proposta (o T04) dos outros emails: o pedido muda depois de ela entrar na
 * fila, e o email escreve-se com o pedido **como está agora**, não como estava. Por isso só sai a
 * proposta em vigor:
 *
 * - **Substituída** — a gerente reviu-a depois de este email entrar na fila. O link desta versão
 *   já não abre nada, e a mais nova tem o seu próprio email, logo a seguir. A linha não guarda a
 *   versão: entrou na fila na mesma instrução que gravou o `proposta_em`, com o mesmo instante,
 *   e é isso que a liga à versão dela.
 * - **Fechada** — o cliente já aceitou ou recusou (a gerente pode ter-lhe mandado o link à mão),
 *   o pedido foi cancelado, ou as 24 horas passaram. Mandar agora «aceite a proposta» era pedir
 *   uma coisa que a página recusa.
 */
function propostaPorEnviar(pedido: Pedido, linha: LinhaEmail, agora: Date): { saltar: string } | null {
  if (pedido.propostaEm !== null && +pedido.propostaEm > +linha.criadoEm) return { saltar: "proposta-substituida" };
  if (!propostaEmAberto(pedido, pedido.propostaVersao, agora)) return { saltar: "proposta-fechada" };
  return null;
}

/**
 * O mesmo para os dois emails de um reagendamento (o T09 e o aviso à loja), que também se
 * escrevem com o pedido como está agora:
 *
 * - **Substituído** — a gerente voltou a mudar a hora depois de este email entrar na fila. A
 *   linha entrou na mesma instrução que gravou o `reagendado_em`, com o mesmo instante; uma
 *   mais antiga é de um reagendamento ultrapassado, e o mais novo tem os seus emails. Sair esta
 *   punha no «antes» a hora do reagendamento intermédio, que o cliente nunca viu.
 * - **Fechado** — o pedido já não está por levantar (foi cancelado ou entregue): avisar agora de
 *   uma data nova era falso, e o cancelamento tem o seu email.
 */
function reagendamentoPorEnviar(pedido: Pedido, linha: LinhaEmail): { saltar: string } | null {
  if (pedido.reagendadoEm !== null && +pedido.reagendadoEm > +linha.criadoEm) return { saltar: "reagendamento-substituido" };
  if (pedido.estado !== "confirmado" && pedido.estado !== "pago") return { saltar: "reagendamento-fechado" };
  return null;
}

export function dadosDoEmail(
  pedido: Pedido,
  linha: LinhaEmail,
  { agora, modoDeTeste, linkDaProposta }: { agora: Date; modoDeTeste: boolean; linkDaProposta?: LinkDaProposta },
): DadosEmailPedido | { saltar: string } {
  if (linha.modelo === "lembrete-loja" && pedido.estado !== "por-confirmar") {
    return { saltar: "lembrete-sem-espera" };
  }
  const reagendamento = linha.modelo === "reagendado-cliente" || linha.modelo === "reagendado-loja";
  if (reagendamento) {
    const saltar = reagendamentoPorEnviar(pedido, linha);
    if (saltar) return saltar;
  }
  const proposta = linha.modelo === "resposta-cliente";
  if (proposta) {
    const saltar = propostaPorEnviar(pedido, linha, agora);
    if (saltar) return saltar;
    // Sem quem assine, falha aqui (`dados-do-modelo`): um T04 sem botão não deixa aceitar nada.
    if (!linkDaProposta) throw new Error("sem-link-da-proposta");
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
      // O preço que a casa fixou na proposta: a proposta lista-o como mudança, e a loja vê-o sem
      // o unitário, que não foi o que o cliente pediu.
      ...(l.precoDaProposta ? { fixadoAgora: true } : {}),
    })),
    totalCent: pedido.totalCent,
    /* Os valores gravados no pedido, nunca recalculados: um email que sai depois de a loja
       desligar o desconto diz o desconto que o pedido teve. */
    descontoPercentagem: pedido.descontoPercentagem, descontoCent: pedido.descontoCent,
    faltamPrecos: pedido.linhas.some(l => l.precoUnitarioCent === null || l.totalCent === null),
    criadoEm: pedido.criadoEm, levantamentoEm: pedido.levantamentoEm,
    expiraEm: pedido.expiraEm ?? undefined, aceiteEm: pedido.aceiteEm ?? undefined,
    reagendadoEm: pedido.reagendadoEm ?? undefined,
    canceladoPor: pedido.canceladoPor ?? undefined,
    observacoes: pedido.observacoes, modoDeTeste,
    /* ⚠️ Duas horas «de antes», cada uma no seu email. Na proposta, a hora que o cliente pediu
       antes de a casa a mudar (`levantamento_anterior_em`); num reagendamento, a de antes dele
       (`reagendado_de`, migração `0015`). Trocá-las punha no email uma «data inicialmente
       prevista» que não era a anterior. Sem `reagendadoDe` (reagendado antes da 0015), o modelo
       falha com `dados-do-modelo` em vez de inventar uma. */
    ...(proposta ? {
      linkAceitar: linkDaProposta!(pedido.referencia, pedido.propostaVersao),
      levantamentoAnteriorEm: pedido.levantamentoAnteriorEm ?? undefined,
    } : {}),
    ...(reagendamento && pedido.reagendadoDe ? { levantamentoAnteriorEm: pedido.reagendadoDe } : {}),
  };
}

export const podeTentarEmail = (linha: LinhaEmail, agora: Date): boolean =>
  reservaDisponivel(linha, agora) && !foraDaJanelaDeIdempotencia(linha, agora);
