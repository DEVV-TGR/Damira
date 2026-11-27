// Estes identificadores serão persistidos na fila; mudar um nome quebra emails antigos.
export const MODELOS_EMAIL = [
  "criado-confirmado-cliente", "criado-por-confirmar-cliente", "criado-loja", "confirmado-cliente",
  "resposta-cliente", "aceite-cliente", "aceite-loja", "reagendado-cliente", "reagendado-loja",
  "lembrete-loja", "expirado-cliente", "cancelado-cliente", "recusado-cliente", "cancelado-sem-pagamento-cliente",
  "proposta-recusada-cliente", "proposta-expirada-cliente", "alterado-cliente",
] as const;

export type ModeloEmail = (typeof MODELOS_EMAIL)[number];

// Uma fotografia do pedido, independente dos estados ainda em revisão na fonte de dados.
export type DadosEmailPedido = {
  referencia: `DAM-${string}-${string}`;
  estado: "confirmado" | "por-confirmar";
  cliente: { nome: string; email: string; telefone: string; nif: string | null };
  linhas: {
    nome: string;
    detalhe: string | null;
    quantidade: number;
    unidade: "un" | "kg";
    precoUnitCent: number | null;
    totalCent: number | null;
    aoQuilo: boolean;
    fixadoAgora?: boolean;
  }[];
  /** Totais já calculados pelo servidor: nunca se recalcula um pedido antigo. O que se paga, já com o desconto. */
  totalCent: number;
  /**
   * O desconto da loja que o pedido teve (`pedidos.desconto_*`, migração `0013`). Sem ele, ou a
   * `0`, o email fica como antes; com ele, o total leva por cima o subtotal e a linha do desconto.
   */
  descontoPercentagem?: number;
  descontoCent?: number;
  faltamPrecos: boolean;
  criadoEm: Date;
  levantamentoEm: Date;
  levantamentoAnteriorEm?: Date;
  expiraEm?: Date;
  aceiteEm?: Date;
  reagendadoEm?: Date;
  linkAceitar?: string;
  canceladoPor?: "cliente" | "gerente";
  observacoes: string | null;
  modoDeTeste: boolean;
  /**
   * O pedido **ainda não fica guardado**: existe só neste email à casa, como hoje
   * (até a página de compra gravar o pedido, #126). Os modelos da loja foram
   * escritos para quando ele estiver no painel — «responde-se no painel», «o
   * talão sai no balcão», o prazo de 48 horas — e nenhuma dessas frases é
   * verdade sem isso. Com esta marca, o email diz o que a casa tem de fazer hoje.
   * Sai quando o pedido passar a ser gravado.
   */
  soPorEmail?: boolean;
};

export type DadosCasa = {
  nome: string;
  morada: string;
  localidade: string | null;
  /** Texto de apresentação usado no site; não é E.164 nem volta a ser formatado. */
  telefone: string;
};
