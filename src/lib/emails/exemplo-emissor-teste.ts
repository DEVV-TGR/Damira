import type { LinhaEmail, Pedido } from "@/lib/dados/tipos";
export const agora = new Date("2026-10-24T09:00:00Z");
export function pedidoDeEmail(): Pedido {
  return {
    id: "00000000-0000-4000-8000-000000000001", referencia: "DAM-2410-AAAA",
    estado: "por-confirmar", criadoEm: agora, levantamentoEm: new Date("2026-10-27T10:00:00Z"),
    cliente: { nome: "Pessoa Exemplo", email: "pessoa@example.com", telefone: "+351912000000", nif: null, contaId: null },
    linhas: [{ produtoId: "festa-premium", varianteId: "unica", nome: "Nome guardado", variante: "Grande",
      escolhas: ["Baunilha"], personalizacao: null, unidade: "kg", quantidade: 2, precoUnitarioCent: 1700,
      totalCent: 3400, notas: "Nota guardada" }],
    totalCent: 3400, observacoes: null, modoPagamento: "na-loja", pagoOnlineCent: 0,
    reembolsadoCent: 0, reembolsos: [], avisosTratados: [], chegouTarde: false,
    pagoEm: null, confirmadoEm: null, expiraEm: new Date("2026-10-26T09:00:00Z"), aceiteEm: null, causaExpiracao: null,
    impressoEm: null, entregueEm: null, canceladoEm: null, canceladoPor: null, reagendadoEm: null,
  };
}
export const linhaDeEmail = (): LinhaEmail => ({
  id: "00000000-0000-4000-8000-000000000002", pedidoId: pedidoDeEmail().id,
  modelo: "criado-por-confirmar-cliente", destinatario: "pessoa@example.com", criadoEm: agora,
  tentativas: 0, ultimaTentativaEm: null, ultimoErro: null, enviadoEm: null,
});

