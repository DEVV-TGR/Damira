import type { EstadoPedido } from "@/lib/dados/tipos";
import type { AcaoDisputa, AcaoExpirar, AcaoPagar, AcaoReembolso } from "./eventos";

/**
 * # O contrato entre o webhook e os dados
 *
 * O mesmo padrão da `FonteDeDados` (`src/lib/dados/tipos.ts`): o webhook fala
 * com uma interface, os testes passam-lhe uma implementação em memória, e a
 * verdadeira — sobre a Neon, com as tabelas dos pedidos — troca-se sem mexer na
 * rota.
 *
 * Fica fora de `src/lib/dados/` porque o frontend nunca a chama: só o Stripe
 * confirma um pagamento, e o `marcarPago` é a única porta para `pago` (regra 4
 * do `AGENTS.md`). O `CODEOWNERS` pede na mesma a revisão dos dois.
 *
 * ⚠️ **O registo do evento vai dentro de cada método, e não num método à
 * parte.** Com um `registarEvento` primeiro e o efeito a seguir, uma queda entre
 * os dois deixava o evento gravado sem o efeito: a retentativa do Stripe era
 * «repetido», e o pagamento perdia-se. Juntos, a implementação pode fazer o que
 * está em aberto no `pagamentos.md` sem esta assinatura mudar:
 *
 * - **2, um lote sem leituras**: o `INSERT` em `eventos_stripe` vai primeiro, e
 *   só a violação dessa chave quer dizer `repetido`; a mudança do pedido e os
 *   contadores vão na mesma transação;
 * - **3, trabalho pendente que dura**: os emails gravam-se nessa mesma
 *   transação, e só depois se enviam;
 * - **8, o montante ou a moeda que não batem**: o resultado `nao-bate` diz o que
 *   não bateu; se o pedido passa a `pago` na mesma é decisão da implementação, e
 *   o `estado` diz o que ficou.
 *
 * O que nenhum método faz é avisar o painel (`avisarQuePedidosMudaram`): isso é
 * da cache do Next, e fá-lo a rota depois de qualquer resposta sobre um pedido
 * nosso — também a um `repetido`, para a retentativa reparar uma invalidação que
 * tenha falhado.
 */

/** A linha de `eventos_stripe`. */
export type RegistoEvento = {
  /** `evt_…`, a chave primária. */
  id: string;
  tipo: string;
  /** A versão da API em que o evento veio. Pode vir vazia em eventos antigos. */
  apiVersion: string | null;
  recebidoEm: Date;
};

export type ResultadoWebhook =
  /** O evento já estava registado. Não se fez nada — nem um talão, nem um email. */
  | { resultado: "repetido" }
  /** O `pedidoId` não é desta base de dados (de outro ambiente). 200, senão o Stripe insiste. */
  | { resultado: "pedido-desconhecido" }
  /**
   * O pedido existe e a transição não se aplica: expirar um que já está pago,
   * pagar um entregue, um reembolso que andava para trás.
   */
  | { resultado: "sem-efeito"; estado: EstadoPedido }
  | { resultado: "mudou"; estado: EstadoPedido; chegouTarde: boolean }
  /**
   * A sessão, a moeda, o montante ou o modo não batem com o pedido. O pagamento
   * fica registado e há aviso para reconciliar («Em aberto», 8).
   */
  | { resultado: "nao-bate"; campos: ("sessao" | "moeda" | "montante" | "modo")[]; estado: EstadoPedido };

export type FonteWebhook = {
  /**
   * `pendente → pago`; `expirado → pago`, marcado `chegouTarde` e a voltar a
   * ocupar a vaga mesmo acima do limite («Pago ganha sempre a expirado»,
   * `pedidos.md`). Em qualquer outro estado, nada. O talão, o som e os emails
   * saem **desta transição**, nunca do evento.
   *
   * `evento` é `null` quando a confirmação não vem de um evento: o «voltar
   * atrás» do #38, que encontra a sessão já paga e a pergunta ao Stripe
   * (`pagamentos.md` › Voltar do Stripe). É a mesma porta, e não uma segunda.
   * Sem evento não há linha em `eventos_stripe`, e a idempotência fica só na
   * condição do estado: a segunda chamada dá `sem-efeito`, nunca `repetido`.
   */
  marcarPago(evento: RegistoEvento | null, pagamento: AcaoPagar): Promise<ResultadoWebhook>;
  /** `pendente → expirado`, libertando a vaga. Um pedido pago nunca volta atrás. */
  expirarPendente(evento: RegistoEvento, expiracao: AcaoExpirar): Promise<ResultadoWebhook>;
  /**
   * O estado do reembolso, **só para a frente** (`pedidos.md` › Os estados, e de
   * onde vêm). Um reembolso feito no painel do Stripe, que não pedimos, entra no
   * pedido na mesma.
   */
  atualizarReembolso(evento: RegistoEvento, reembolso: AcaoReembolso): Promise<ResultadoWebhook>;
  /** O aviso em «Precisa de atenção», que fica até ser tratado («Em aberto», 7). */
  registarDisputa(evento: RegistoEvento, disputa: AcaoDisputa): Promise<ResultadoWebhook>;
};
