// Estes identificadores serão persistidos na fila; mudar um nome quebra emails antigos.
export const MODELOS_EMAIL = [
  "criado-confirmado-cliente", "criado-por-confirmar-cliente", "criado-loja", "confirmado-cliente",
  "resposta-cliente", "aceite-cliente", "aceite-loja", "reagendado-cliente", "reagendado-loja",
  "lembrete-loja", "expirado-cliente", "cancelado-cliente", "recusado-cliente", "cancelado-sem-pagamento-cliente",
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
  /** Totais já calculados pelo servidor: nunca se recalcula um pedido antigo. */
  totalCent: number;
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
};

export type DadosCasa = {
  nome: string;
  morada: string;
  localidade: string | null;
  /** Texto de apresentação usado no site; não é E.164 nem volta a ser formatado. */
  telefone: string;
};
