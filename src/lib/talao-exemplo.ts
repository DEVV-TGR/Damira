import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import type { Pedido } from "@/lib/dados/tipos";
import { FUSO } from "@/lib/horarios";
import { diaDeLisboa } from "@/lib/painel";
import { type Fundo, type Linha, talaoDeCancelamento, talaoDeCarateres, talaoDoPedido } from "@/lib/talao";

/**
 * # Os pedidos do teste de impressão
 *
 * Para a página `/painel/talao`, que leva o talão à impressora verdadeira antes
 * de haver pagamentos. Inventados de propósito e com ar de inventados — o
 * repositório é público, e nada aqui pode ser um cliente a sério.
 *
 * Escolhidos para pôr à prova o que pode correr mal no papel: o bloco
 * invertido do «HOJE», um nome de artigo que não cabe numa linha, uma nota,
 * observações compridas, os acentos, o «€», e o sinal com dinheiro em falta.
 */

export type Exemplo = "hoje" | "amanha-com-sinal";

/** As 14:30 de Lisboa, `dias` depois de hoje — o «HOJE · QUINTA 14:30» da mensagem do Gonçalo. */
function asDuasEMeia(agora: Date, dias: number): Date {
  const [ano, mes, dia] = diaDeLisboa(agora).split("-").map(Number);
  return addDays(new TZDate(ano, mes - 1, dia, 14, 30, 0, FUSO), dias);
}

export function pedidoDeExemplo(agora: Date, exemplo: Exemplo): Pedido {
  const [, mes, dia] = diaDeLisboa(agora).split("-");
  const comSinal = exemplo === "amanha-com-sinal";
  const linhas: Pedido["linhas"] = [
    {
      produtoId: "premium",
      varianteId: "premium",
      nome: "Kit Premium de Festa com salgados, doces e bolo de aniversário",
      variante: "70 pessoas",
      escolhas: [],
      unidade: "un",
      quantidade: 1,
      precoUnitarioCent: 18_500,
      totalCent: 18_500,
      notas: "Escrever «Parabéns, Leonor!» no bolo",
    },
    {
      produtoId: "salgados-fritos",
      varianteId: "salgados-fritos",
      nome: "Salgados fritos",
      variante: null,
      escolhas: ["Rissol de leitão"],
      unidade: "un",
      quantidade: 24,
      precoUnitarioCent: 95,
      totalCent: 2_280,
      notas: null,
    },
    {
      produtoId: "bolo-vegan",
      varianteId: "bolo-vegan",
      nome: "Bolo vegan de chocolate",
      variante: null,
      escolhas: [],
      unidade: "kg",
      quantidade: 1.5,
      precoUnitarioCent: 1_700,
      totalCent: 2_550,
      notas: null,
    },
  ];
  const totalCent = linhas.reduce((soma, l) => soma + l.totalCent, 0);
  return {
    id: `exemplo-${exemplo}`,
    referencia: `DAM-${dia}${mes}-T3ST`,
    estado: "pago",
    criadoEm: agora,
    levantamentoEm: asDuasEMeia(agora, comSinal ? 1 : 0),
    cliente: {
      nome: "Cliente de Teste",
      email: "teste@exemplo.pt",
      telefone: "+351900000000",
      nif: comSinal ? "999999990" : null,
      contaId: null,
    },
    linhas,
    observacoes: "Vem buscar a avó, que não sobe escadas — levar à porta, por favor. Pão de Ló sem açúcar à parte.",
    totalCent,
    modoPagamento: comSinal ? "sinal" : "total",
    pagoOnlineCent: comSinal ? totalCent - 1_250 : totalCent,
    reembolsadoCent: 0,
    reembolsos: [],
    avisosTratados: [],
    chegouTarde: false,
    pagoEm: agora,
    impressoEm: null,
    entregueEm: null,
    canceladoEm: null,
    canceladoPor: null,
    reagendadoEm: null,
  };
}

/** O que a página de teste imprime: os dois pedidos, o cancelamento e a folha dos carateres. */
export const TESTES = ["hoje", "amanha-com-sinal", "cancelamento", "carateres"] as const;
export type Teste = (typeof TESTES)[number];

export function linhasDeTeste(teste: Teste, fundo: Fundo, agora: Date): Linha[] {
  if (teste === "carateres") return talaoDeCarateres();
  if (teste === "cancelamento") return talaoDeCancelamento(pedidoDeExemplo(agora, "hoje"), { agora, fundo });
  return talaoDoPedido(pedidoDeExemplo(agora, teste), { agora, fundo });
}
