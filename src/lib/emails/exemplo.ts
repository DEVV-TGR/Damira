// Os dados de cliente e pedido são inventados porque o repositório é público.
import type { DadosCasa, DadosEmailPedido, ModeloEmail } from "./tipos";

export const CASA_EXEMPLO: DadosCasa = {
  nome: "Confeitaria e Pão Quente Damira",
  morada: "Rua Dom António Castro Meireles 155",
  localidade: "Ermesinde",
  telefone: "+351 229 730 939",
};

export function exemploEmail(
  modelo: ModeloEmail,
  variante?: "confirmado" | "por-confirmar" | "cliente" | "gerente",
): DadosEmailPedido {
  const nata: DadosEmailPedido["linhas"][number] = {
    nome: "Pastel de nata", detalhe: null, quantidade: 12, unidade: "un",
    precoUnitCent: 130, totalCent: 1560, aoQuilo: false,
  };
  const bolo: DadosEmailPedido["linhas"][number] = {
    nome: "Bolo por medida", detalhe: null, quantidade: 1, unidade: "un",
    precoUnitCent: null, totalCent: null, aoQuilo: false,
  };
  const confirmado = {
    estado: "confirmado" as const,
    linhas: [nata, {
      nome: "Bolo de chocolate vegan", detalhe: null, quantidade: 2, unidade: "kg" as const,
      precoUnitCent: 1700, totalCent: 3400, aoQuilo: true,
    }],
    totalCent: 4960,
    faltamPrecos: false,
  };
  const dados: DadosEmailPedido = {
    referencia: "DAM-0212-K7Q2",
    estado: "por-confirmar",
    cliente: { nome: "Maria Exemplo", email: "maria@exemplo.pt", telefone: "+351912000000", nif: null },
    linhas: [nata, bolo], totalCent: 1560, faltamPrecos: true,
    criadoEm: new Date("2026-12-02T18:12:00Z"),
    levantamentoEm: new Date("2026-12-06T10:30:00Z"),
    expiraEm: new Date("2026-12-04T18:12:00Z"),
    observacoes: null, modoDeTeste: false,
  };
  switch (modelo) {
    case "criado-confirmado-cliente":
    case "confirmado-cliente":
      Object.assign(dados, confirmado);
      break;
    case "resposta-cliente":
    case "aceite-cliente":
    case "aceite-loja":
      dados.linhas = [nata, { ...bolo, precoUnitCent: 4500, totalCent: 4500, fixadoAgora: true }];
      dados.totalCent = 6060;
      dados.faltamPrecos = false;
      dados.levantamentoAnteriorEm = new Date(dados.levantamentoEm);
      dados.levantamentoEm = new Date("2026-12-06T12:00:00Z");
      dados.aceiteEm = new Date("2026-12-03T09:40:00Z");
      if (modelo === "resposta-cliente") {
        dados.linkAceitar = "https://damira.pt/pedido/aceitar/exemplo";
      } else {
        dados.estado = "confirmado";
      }
      break;
    case "reagendado-cliente":
    case "reagendado-loja":
      Object.assign(dados, confirmado);
      dados.levantamentoAnteriorEm = new Date(dados.levantamentoEm);
      dados.levantamentoEm = new Date("2026-12-07T10:30:00Z");
      dados.reagendadoEm = new Date("2026-12-04T11:05:00Z");
      break;
    case "criado-loja":
      if (variante === "confirmado") Object.assign(dados, confirmado);
      break;
    case "cancelado-cliente":
      dados.canceladoPor = variante === "gerente" ? "gerente" : "cliente";
      break;
  }
  return dados;
}
