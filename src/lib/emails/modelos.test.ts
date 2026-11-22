import { describe, expect, it } from "vitest";
import { formatarCent } from "@/lib/preco";
import { telefoneArrumado } from "@/lib/telefone";
import type { Locale } from "@/i18n/routing";
import { CASA_EXEMPLO, exemploEmail } from "./exemplo";
import { escreverEmail } from "./modelos";
import { MODELOS_EMAIL, type ModeloEmail } from "./tipos";

const CONFIRMAM: ModeloEmail[] = ["criado-confirmado-cliente", "confirmado-cliente", "aceite-cliente", "reagendado-cliente"];
const LINGUAS: Locale[] = ["pt", "en"];

describe.each(MODELOS_EMAIL)("%s", (modelo) => {
  it.each(LINGUAS)("produz assunto e corpo em %s, com referência, fila e link corretos", (locale) => {
    const dados = exemploEmail(modelo);
    // Um link presente nos dados não pode escapar para outros modelos.
    dados.linkAceitar = "https://example.com/aceitar/exemplo";
    const { assunto, texto } = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    expect(assunto).toContain(dados.referencia);
    expect(texto).toContain(dados.referencia);
    expect(texto.length).toBeGreaterThan(150);
    const fila = locale === "en" && !modelo.endsWith("-loja") ? "there is one queue" : "a fila é uma só";
    expect(texto.includes(fila)).toBe(CONFIRMAM.includes(modelo));
    expect(texto.includes(dados.linkAceitar)).toBe(modelo === "resposta-cliente");
    expect(`${assunto}\n${texto}`).not.toMatch(/\b(pago|paid)\b/i);
    expect(`${assunto}\n${texto}`).not.toMatch(/\{\w+\}/);
    expect(assunto).not.toContain("[TESTE]");
    expect(texto).not.toMatch(/MODO DE TESTE|TEST MODE/);
    if (modelo.endsWith("-loja")) {
      expect(escreverEmail(modelo, dados, CASA_EXEMPLO, "en")).toEqual(escreverEmail(modelo, dados, CASA_EXEMPLO, "pt"));
      expect(texto.split("\n")[0]).toContain(`PEDIDO ${dados.referencia}`);
    } else {
      expect(texto.startsWith(locale === "pt" ? "Olá, Maria," : "Hello Maria,")).toBe(true);
    }
  });

  it.each(LINGUAS)("identifica o teste no início do assunto e do corpo em %s", (locale) => {
    const dados = exemploEmail(modelo);
    const normal = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    dados.modoDeTeste = true;
    const teste = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    expect(teste.assunto).toBe(`[TESTE] ${normal.assunto}`);
    expect(teste.texto).toBe(`${locale === "pt" || modelo.endsWith("-loja")
      ? "⚠️ MODO DE TESTE — este email é um teste, não corresponde a um pedido real."
      : "⚠️ TEST MODE — this email is a test and does not correspond to a real order."}\n\n${normal.texto}`);
  });

  it("omite indicativo quando não há artigos ao quilo", () => {
    const dados = exemploEmail(modelo);
    dados.linhas = dados.linhas.map((linha) => ({ ...linha, aoQuilo: false }));
    for (const locale of LINGUAS) expect(escreverEmail(modelo, dados, CASA_EXEMPLO, locale).texto).not.toMatch(/indicativ[oe]/);
  });
});

it.each(["criado-confirmado-cliente", "confirmado-cliente", "aceite-cliente", "resposta-cliente", "criado-loja", "aceite-loja", "reagendado-loja"] as const)("ressalva o peso no %s apenas quando necessário", (modelo) => {
  const dados = exemploEmail(modelo);
  dados.linhas[0].aoQuilo = true;
  for (const locale of LINGUAS) {
    const texto = escreverEmail(modelo, dados, CASA_EXEMPLO, locale).texto;
    expect(texto).toContain(locale === "pt" || modelo.endsWith("-loja") ? "indicativo" : "indicative");
    expect(texto).toContain(locale === "pt" || modelo.endsWith("-loja") ? "Os artigos ao quilo" : "Items sold by weight");
  }
});

it.each(LINGUAS)("uma linha sem preço não se transforma em zero em %s", (locale) => {
  const dados = exemploEmail("criado-por-confirmar-cliente");
  const { texto } = escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, locale);
  expect(texto).toContain(locale === "pt" ? "preço a fixar pela casa" : "price to be set by the shop");
  expect(texto).not.toMatch(/0,00\s*€|€0\.00/);
});

it("usa Lisboa nas duas margens da mudança para a hora de inverno", () => {
  expect(process.env.TZ).toBe("Pacific/Kiritimati");
  const dados = exemploEmail("criado-por-confirmar-cliente");
  dados.expiraEm = new Date("2026-10-26T09:00:00Z");
  dados.levantamentoEm = new Date("2026-10-24T09:00:00Z");
  const { texto } = escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, "pt");
  expect(texto).toContain("26 de outubro de 2026, às 09:00");
  expect(texto).toContain("24 de outubro de 2026, às 10:00");
  expect(escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, "en").texto)
    .toContain("Saturday 24 October 2026 at 10:00");
});

it.each(LINGUAS)("mostra apenas as alterações no bloco da resposta em %s", (locale) => {
  const dados = exemploEmail("resposta-cliente");
  const bloco = () => escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale).texto.split("\n\n")[2];
  expect(bloco()).toContain("Bolo por medida:");
  expect(bloco()).not.toContain("Pastel de nata");
  expect(bloco()).toContain("10:30");
  expect(bloco()).toContain("12:00");
  dados.levantamentoAnteriorEm = undefined;
  expect(bloco()).not.toContain("10:30");
  dados.levantamentoAnteriorEm = new Date("2026-12-06T10:30:00Z");
  dados.linhas.forEach((linha) => { linha.fixadoAgora = false; });
  expect(bloco()).not.toContain("Bolo por medida:");
  expect(bloco()).toContain("12:00");
});

it.each(LINGUAS)("distingue quem cancelou em %s", (locale) => {
  const dados = exemploEmail("cancelado-cliente");
  expect(escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, locale).texto)
    .toContain(locale === "pt" ? "Como nos pediu" : "As you requested");
  dados.canceladoPor = "gerente";
  const { texto } = escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, locale);
  expect(texto).toContain(locale === "pt" ? "Lamentamos" : "We are sorry");
  expect(texto).toContain("+351 229 730 939");
  expect(texto).not.toMatch(/\b(pago|paid)\b/i);
});

it("não recalcula totais, inclui escolhas e omite localidade ausente", () => {
  const dados = exemploEmail("criado-confirmado-cliente");
  dados.totalCent = 12345;
  dados.linhas[0].totalCent = 9876;
  dados.linhas[0].detalhe = "Escolha {total}";
  const { texto } = escreverEmail("criado-confirmado-cliente", dados, { ...CASA_EXEMPLO, localidade: null }, "pt");
  expect(texto).toContain(`${formatarCent(12345, "pt")}`);
  expect(texto).toContain(`${formatarCent(9876, "pt")}`);
  expect(texto).toContain("Pastel de nata (Escolha {total})");
  expect(texto).not.toContain("155,");
  expect(texto).not.toContain("Ermesinde");
});

it("distingue os dois estados do pedido novo para a loja", () => {
  const dados = exemploEmail("criado-loja");
  expect(escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt").assunto)
    .toBe("Pedido DAM-0212-K7Q2 — POR CONFIRMAR até sex 4/12 18:12 · Maria Exemplo");
  Object.assign(dados, exemploEmail("criado-loja", "confirmado"));
  dados.expiraEm = undefined;
  const { assunto, texto } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  expect(assunto).toBe("Pedido DAM-0212-K7Q2 — CONFIRMADO · Maria Exemplo · dom 6/12 10:30");
  expect(texto).not.toMatch(/Responder até|pretendida/);
  expect(texto).toContain("Confirmado: o talão sai no balcão.");
});

it.each([
  ["resposta-cliente", "linkAceitar"], ["criado-por-confirmar-cliente", "expiraEm"],
  ["aceite-loja", "aceiteEm"], ["reagendado-loja", "reagendadoEm"],
  ["reagendado-cliente", "levantamentoAnteriorEm"], ["cancelado-cliente", "canceladoPor"],
] as const)("rejeita %s sem %s", (modelo, campo) => {
  const dados = exemploEmail(modelo);
  delete dados[campo];
  expect(() => escreverEmail(modelo, dados, CASA_EXEMPLO, "pt")).toThrow(campo);
});

it("rejeita dinheiro decimal sem o arredondar", () => {
  const dados = exemploEmail("criado-confirmado-cliente");
  dados.totalCent = 12.5;
  expect(() => escreverEmail("criado-confirmado-cliente", dados, CASA_EXEMPLO, "pt")).toThrow("cêntimos inteiros");
});

it("reproduz exatamente o PT do primeiro rascunho", () => {
  const { texto } = escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), CASA_EXEMPLO, "pt");
  expect(texto).toBe(`Olá, Maria,

O seu pedido está confirmado.

Levantamento: domingo, 6 de dezembro de 2026, às 10:30
Na loja: Rua Dom António Castro Meireles 155, Ermesinde

O que pediu:
  12 × Pastel de nata — ${formatarCent(1560, "pt")}
  2 kg × Bolo de chocolate vegan (${formatarCent(1700, "pt")}/kg) — ${formatarCent(3400, "pt")}

Total: ${formatarCent(4960, "pt")} (indicativo)
Paga na loja, ao levantar. Não há nada a pagar antes.

Os artigos ao quilo são pesados na loja, e o valor final calcula-se com o peso efetivo. Por isso o total acima é indicativo.

No dia, dirija-se ao balcão e entre na fila de atendimento, como os restantes clientes: a fila é uma só, por ordem de chegada, com ou sem encomenda. A hora indicada é a hora a que o seu pedido está pronto.

Referência do pedido: DAM-0212-K7Q2 — diga-a ao balcão.

Para alterar ou cancelar, ligue-nos para o +351 229 730 939. Não é possível fazê-lo pelo site.

Até breve,
Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it("preserva o rascunho criado-por-confirmar-cliente", () => {
  const dados = exemploEmail("criado-por-confirmar-cliente");
  expect(escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, "pt").texto).toBe(`Olá, Maria,

Recebemos o seu pedido. Ainda não está confirmado: tem um artigo que precisa da resposta da loja.

Levantamento pretendido: domingo, 6 de dezembro de 2026, às 10:30

O que pediu:
  12 × Pastel de nata — ${formatarCent(1560, "pt")}
  1 × Bolo por medida — preço a fixar pela casa

Não há nada a pagar agora.

Costumamos responder nas primeiras 24 horas. Se não lhe respondermos até sexta-feira, 4 de dezembro de 2026, às 18:12, o pedido expira e não segue — e não há nada a pagar.

Quando respondermos, recebe outro email: a confirmação, ou, se a nossa resposta trouxer um preço ou uma hora que ainda não viu, uma proposta para aceitar.

Referência do pedido: DAM-0212-K7Q2.

Para desistir ou alterar, ligue-nos para o +351 229 730 939. Enquanto o pedido espera pela nossa resposta, desistir não tem custos.

Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it("preserva o rascunho criado-loja", () => {
  const dados = exemploEmail("criado-loja");
  expect(escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt").texto).toBe(`PEDIDO DAM-0212-K7Q2 — POR CONFIRMAR
Entrou pelo site: quarta-feira, 2 de dezembro de 2026, às 18:12 (hora de Lisboa)
⚠️ Responder até sexta-feira, 4 de dezembro de 2026, às 18:12. Depois disso o pedido expira, e o cliente é avisado de que a loja não respondeu a tempo.

LEVANTAMENTO NA LOJA
domingo, 6 de dezembro de 2026, às 10:30 (hora de Lisboa) — pretendida

CLIENTE
Nome:      Maria Exemplo
Email:     maria@exemplo.pt
Telefone:  +351 912 000 000
NIF:       — (não indicado)

O QUE LEVA
  12 × Pastel de nata — ${formatarCent(130, "pt")} — ${formatarCent(1560, "pt")}
  1 × Bolo por medida — SEM PREÇO, a fixar pela gerente

OBSERVAÇÕES
— (não indicado)

PAGAMENTO
Na loja, ao levantar. Conhecido até agora: ${formatarCent(1560, "pt")} (sem preço: Bolo por medida).

Responde-se no painel, em «Por confirmar».`);
});

it("preserva o rascunho resposta-cliente", () => {
  const dados = exemploEmail("resposta-cliente");
  expect(escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, "pt").texto).toBe(`Olá, Maria,

Respondemos ao seu pedido. Para o fazermos, precisamos que aceite o que mudou:

  Bolo por medida: ${formatarCent(4500, "pt")}
  Levantamento: passa de domingo, 6 de dezembro, às 10:30 para domingo, 6 de dezembro, às 12:00

O pedido fica assim:
  12 × Pastel de nata — ${formatarCent(1560, "pt")}
  1 × Bolo por medida — ${formatarCent(4500, "pt")}

Total: ${formatarCent(6060, "pt")}
Paga na loja, ao levantar. Não há nada a pagar antes.
Levantamento: domingo, 6 de dezembro de 2026, às 12:00

Para ver e aceitar:
https://damira.pt/pedido/aceitar/exemplo

Abrir a página não aceita nada: o pedido só fica confirmado quando carregar em «Aceitar».

Se preferir não avançar, ligue-nos para o +351 229 730 939. Desistir não tem custos.

Referência do pedido: DAM-0212-K7Q2.

Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it("preserva o rascunho aceite-loja", () => {
  const dados = exemploEmail("aceite-loja");
  expect(escreverEmail("aceite-loja", dados, CASA_EXEMPLO, "pt").texto).toBe(`PEDIDO DAM-0212-K7Q2 — ACEITE PELO CLIENTE
Aceite: quinta-feira, 3 de dezembro de 2026, às 09:40 (hora de Lisboa)

O cliente aceitou a resposta da loja. O pedido está confirmado, e o talão sai no balcão.

LEVANTAMENTO NA LOJA
domingo, 6 de dezembro de 2026, às 12:00 (hora de Lisboa)

CLIENTE
Nome:      Maria Exemplo
Email:     maria@exemplo.pt
Telefone:  +351 912 000 000
NIF:       — (não indicado)

O QUE LEVA
  12 × Pastel de nata — ${formatarCent(130, "pt")} — ${formatarCent(1560, "pt")}
  1 × Bolo por medida — ${formatarCent(4500, "pt")}

PAGAMENTO
Na loja, ao levantar: ${formatarCent(6060, "pt")}`);
});

it("preserva o rascunho lembrete-loja", () => {
  const dados = exemploEmail("lembrete-loja");
  expect(escreverEmail("lembrete-loja", dados, CASA_EXEMPLO, "pt").texto).toBe(`PEDIDO DAM-0212-K7Q2 — AINDA POR CONFIRMAR
Entrou: quarta-feira, 2 de dezembro de 2026, às 18:12
Expira: sexta-feira, 4 de dezembro de 2026, às 18:12 (hora de Lisboa)

Ninguém respondeu ainda a este pedido. Se continuar sem resposta até à hora acima, expira, e o cliente é avisado de que a loja não respondeu a tempo.

Levantamento pretendido: domingo, 6 de dezembro de 2026, às 10:30
Cliente: Maria Exemplo · +351 912 000 000

O QUE LEVA
  12 × Pastel de nata — ${formatarCent(1560, "pt")}
  1 × Bolo por medida — SEM PREÇO, a fixar pela gerente

Responde-se no painel, em «Por confirmar».`);
});

it("preserva o rascunho expirado-cliente", () => {
  const dados = exemploEmail("expirado-cliente");
  expect(escreverEmail("expirado-cliente", dados, CASA_EXEMPLO, "pt").texto).toBe(`Olá, Maria,

Pedimos desculpa: não respondemos a tempo ao seu pedido, e ele expirou.

O pedido não vai ser feito, e não há nada a pagar.

Se ainda quiser, pode fazer um pedido novo no site, ou ligar-nos para o +351 229 730 939.

Referência do pedido: DAM-0212-K7Q2.

Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it("preserva o rascunho cancelado-cliente", () => {
  const dados = exemploEmail("cancelado-cliente");
  expect(escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, "pt").texto).toBe(`Olá, Maria,

Como nos pediu, cancelámos o seu pedido. Não há nada a pagar.

Referência do pedido: DAM-0212-K7Q2.

Até breve,
Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it("preserva o rascunho cancelado-cliente da gerente", () => {
  const dados = exemploEmail("cancelado-cliente");
  dados.canceladoPor = "gerente";
  expect(escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, "pt").texto).toBe(`Olá, Maria,

Lamentamos, mas não vamos conseguir fazer o seu pedido, e cancelámo-lo. Não há nada a pagar.

Se quiser falar connosco sobre uma alternativa, ligue-nos para o +351 229 730 939.

Referência do pedido: DAM-0212-K7Q2.

Confeitaria e Pão Quente Damira
Rua Dom António Castro Meireles 155, Ermesinde`);
});

it.each(LINGUAS)("formata quilos decimais na língua do email em %s", (locale) => {
  const dados = exemploEmail("criado-confirmado-cliente");
  dados.linhas[1].quantidade = 1.5;
  const { texto } = escreverEmail("criado-confirmado-cliente", dados, CASA_EXEMPLO, locale);
  expect(texto).toContain(locale === "pt" ? "1,5 kg ×" : "1.5 kg ×");
  expect(texto).toContain(formatarCent(dados.totalCent, locale));
});

it("preserva o telefone da casa e usa o formatador no do cliente", () => {
  const dados = exemploEmail("criado-loja");
  dados.cliente.telefone = "+351229730939";
  const { texto } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  expect(texto).toContain(`Telefone:  ${telefoneArrumado(dados.cliente.telefone)}`);
  const casa = { ...CASA_EXEMPLO, telefone: "+351 229 730 939 (chamada para a rede fixa nacional)" };
  expect(escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), casa, "pt").texto)
    .toContain(`ligue-nos para o ${casa.telefone}.`);
});

it("preserva nomes próprios no pagamento com uma ou várias linhas sem preço", () => {
  const dados = exemploEmail("criado-loja");
  dados.linhas[1].nome = "Tarte Dona Maria";
  const pagamento = () => escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt").texto.split("PAGAMENTO\n")[1].split("\n\n")[0];
  expect(pagamento()).toBe(`Na loja, ao levantar. Conhecido até agora: ${formatarCent(1560, "pt")} (sem preço: Tarte Dona Maria).`);
  dados.linhas.push({ ...dados.linhas[1], nome: "Box São João" });
  expect(pagamento()).toBe(`Na loja, ao levantar. Conhecido até agora: ${formatarCent(1560, "pt")} (sem preço: Tarte Dona Maria, Box São João).`);
});

it("regista um reagendamento num sábado sem preposição contraída", () => {
  const dados = exemploEmail("reagendado-loja");
  dados.reagendadoEm = new Date("2026-12-05T11:05:00Z");
  const { texto } = escreverEmail("reagendado-loja", dados, CASA_EXEMPLO, "pt");
  expect(texto).toContain("Combinado com o cliente. Registado pela gerente: sábado, 5 de dezembro de 2026, às 11:05.");
  expect(texto).not.toContain("na sábado");
});

it.each(LINGUAS)("escreve a mudança de hora numa linha sem alinhamento em %s", (locale) => {
  const dados = exemploEmail("resposta-cliente");
  const { texto } = escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale);
  const linha = texto.split("\n").find((linha) => linha.startsWith(locale === "pt" ? "  Levantamento:" : "  Pick-up:"));
  expect(linha).toBe(locale === "pt"
    ? "  Levantamento: passa de domingo, 6 de dezembro, às 10:30 para domingo, 6 de dezembro, às 12:00"
    : "  Pick-up: changes from Sunday 6 December at 10:30 to Sunday 6 December at 12:00");
});

it.each(LINGUAS)("mantém os parágrafos inteiros com dados longos em %s", (locale) => {
  const dados = exemploEmail("criado-por-confirmar-cliente");
  const { texto } = escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, locale);
  const prazo = texto.split("\n\n").find((paragrafo) => paragrafo.startsWith(locale === "pt" ? "Costumamos responder" : "We usually respond"));
  expect(prazo).toBe(locale === "pt"
    ? "Costumamos responder nas primeiras 24 horas. Se não lhe respondermos até sexta-feira, 4 de dezembro de 2026, às 18:12, o pedido expira e não segue — e não há nada a pagar."
    : "We usually respond within the first 24 hours. If we have not replied by Friday 4 December 2026 at 18:12, the order will expire and will not go ahead — and there will be nothing to pay.");
  const confirmado = escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), CASA_EXEMPLO, locale).texto;
  for (const inicio of locale === "pt" ? ["No dia,", "Os artigos", "Para alterar"] : ["On the day,", "Items sold", "To change"]) {
    const paragrafo = confirmado.split("\n\n").find((parte) => parte.startsWith(inicio));
    expect(paragrafo).toBeDefined();
    expect(paragrafo).not.toContain("\n");
  }
});

const EXIGEM_PRECOS: ModeloEmail[] = [
  "criado-confirmado-cliente", "confirmado-cliente", "aceite-cliente", "aceite-loja",
  "reagendado-cliente", "reagendado-loja", "criado-loja",
];

describe.each(EXIGEM_PRECOS)("preços completos no %s", (modelo) => {
  it.each(LINGUAS)("recusa faltamPrecos mesmo com todas as linhas preenchidas em %s", (locale) => {
    const dados = exemploEmail(modelo, modelo === "criado-loja" ? "confirmado" : undefined);
    expect(dados.linhas.every((linha) => linha.totalCent !== null)).toBe(true);
    dados.faltamPrecos = true;
    expect(() => escreverEmail(modelo, dados, CASA_EXEMPLO, locale)).toThrow(modelo);
  });

  it.each(LINGUAS)("recusa uma linha sem total mesmo com faltamPrecos false em %s", (locale) => {
    const dados = exemploEmail(modelo, modelo === "criado-loja" ? "confirmado" : undefined);
    expect(dados.faltamPrecos).toBe(false);
    dados.linhas[0].totalCent = null;
    expect(() => escreverEmail(modelo, dados, CASA_EXEMPLO, locale)).toThrow(modelo);
  });

  it("tem um exemplo confirmado com todos os preços e renderiza", () => {
    const dados = exemploEmail(modelo, modelo === "criado-loja" ? "confirmado" : undefined);
    expect(dados.estado).toBe("confirmado");
    expect(dados.faltamPrecos).toBe(false);
    expect(dados.linhas.every((linha) => linha.totalCent !== null)).toBe(true);
    expect(() => escreverEmail(modelo, dados, CASA_EXEMPLO, "pt")).not.toThrow();
  });
});

it.each(["reagendado-cliente", "reagendado-loja"] as const)("usa nata e bolo vegan confirmados no exemplo %s", (modelo) => {
  const dados = exemploEmail(modelo);
  expect(dados.linhas).toEqual(exemploEmail("criado-confirmado-cliente").linhas);
  expect(dados.totalCent).toBe(4960);
  expect(dados.faltamPrecos).toBe(false);
});

it("mantém o exemplo por confirmar da loja com os preços em falta", () => {
  const dados = exemploEmail("criado-loja", "por-confirmar");
  expect(dados.estado).toBe("por-confirmar");
  expect(dados.faltamPrecos).toBe(true);
  expect(dados.linhas.some((linha) => linha.totalCent === null)).toBe(true);
  expect(() => escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt")).not.toThrow();
});

it.each(["cliente", "gerente"] as const)("gera a variante de cancelamento por %s para a pré-visualização", (variante) => {
  const dados = exemploEmail("cancelado-cliente", variante);
  expect(dados.canceladoPor).toBe(variante);
  for (const locale of LINGUAS) {
    const { texto } = escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, locale);
    expect(texto).toContain(variante === "cliente"
      ? locale === "pt" ? "Como nos pediu" : "As you requested"
      : locale === "pt" ? "Lamentamos" : "We are sorry");
  }
});
