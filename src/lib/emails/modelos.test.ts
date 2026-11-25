import { describe, expect, it } from "vitest";
import { formatarCent } from "@/lib/preco";
import { telefoneArrumado } from "@/lib/telefone";
import type { Locale } from "@/i18n/routing";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "./exemplo";
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
    const fila = locale === "en" && !modelo.endsWith("-loja") ? "the shop’s usual queue" : "fila de atendimento habitual";
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
    expect(texto).toContain(locale === "pt" || modelo.endsWith("-loja") ? "(Valor indicativo)" : "(estimated amount)");
    expect(texto).toContain(locale === "pt" || modelo.endsWith("-loja") ? "Produtos vendidos ao quilo:" : "Products sold by weight:");
  }
});

it.each(LINGUAS)("uma linha sem preço não se transforma em zero em %s", (locale) => {
  const dados = exemploEmail("criado-por-confirmar-cliente");
  const { texto } = escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, locale);
  expect(texto).toContain(locale === "pt" ? "Bolo por medida — Sob orçamento" : "Bolo por medida — To be quoted");
  expect(texto).toContain(locale === "pt" ? "Total: A confirmar" : "Total: To be confirmed");
  expect(texto).not.toMatch(/0,00\s*€|€0\.00/);
});

it("usa Lisboa nas duas margens da mudança para a hora de inverno", () => {
  expect(process.env.TZ).toBe("Pacific/Kiritimati");
  const dados = exemploEmail("criado-loja");
  dados.expiraEm = new Date("2026-10-26T09:00:00Z");
  dados.levantamentoEm = new Date("2026-10-24T09:00:00Z");
  const { texto } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  expect(texto).toContain("26 de outubro de 2026, às 09h00");
  expect(texto).toContain("24 de outubro de 2026, às 10h00");
  expect(escreverEmail("criado-por-confirmar-cliente", dados, CASA_EXEMPLO, "en").texto)
    .toContain("Saturday 24 October 2026 at 10:00");
});

it.each(LINGUAS)("mostra apenas as alterações no bloco da resposta em %s", (locale) => {
  const dados = exemploEmail("resposta-cliente");
  const bloco = () => escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale).texto.split("\n\n")[2];
  expect(bloco()).toContain("Bolo por medida:");
  expect(bloco()).not.toContain("Pastel de nata");
  expect(bloco()).toMatch(/10[:h]30/);
  expect(bloco()).toMatch(/12[:h]00/);
  dados.levantamentoAnteriorEm = undefined;
  expect(bloco()).not.toMatch(/10[:h]30/);
  dados.levantamentoAnteriorEm = new Date("2026-12-06T10:30:00Z");
  dados.linhas.forEach((linha) => { linha.fixadoAgora = false; });
  expect(bloco()).not.toContain("Bolo por medida:");
  expect(bloco()).toMatch(/12[:h]00/);
});

it.each(LINGUAS)("distingue quem cancelou em %s", (locale) => {
  const dados = exemploEmail("cancelado-cliente");
  expect(escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, locale).texto)
    .toContain(locale === "pt" ? "Conforme solicitado" : "As requested");
  dados.canceladoPor = "gerente";
  const { texto } = escreverEmail("cancelado-cliente", dados, CASA_EXEMPLO, locale);
  expect(texto).toContain(locale === "pt" ? "Lamentamos informar" : "We regret");
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
  ["resposta-cliente", "linkAceitar"], ["lembrete-loja", "expiraEm"],
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

// Os textos inteiros ficam em ficheiros, um por exemplo: cada correção da Andreia aparece no diff
// como texto corrido, e uma mudança sem querer num modelo rebenta aqui. Atualizar com `npx vitest -u`
// só depois de ler o diff dos ficheiros.
it.each(exemplosEmail())("fixa o texto de $modelo · $locale · $variante", async ({ modelo, locale, variante }) => {
  const { assunto, texto } = escreverEmail(modelo, exemploEmail(modelo, variante), CASA_EXEMPLO, locale);
  await expect(`${assunto}\n\n${texto}\n`).toMatchFileSnapshot(`./__textos__/${modelo}-${locale}${variante ? `-${variante}` : ""}.txt`);
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
    .toContain(`entre em contacto connosco através do ${casa.telefone}.`);
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
  expect(texto).toContain("Combinado com o cliente. Registado pela gerente: sábado, 5 de dezembro de 2026, às 11h05.");
  expect(texto).not.toContain("na sábado");
});

it.each(LINGUAS)("escreve a mudança de hora numa linha sem alinhamento em %s", (locale) => {
  const dados = exemploEmail("resposta-cliente");
  const linhas = () => escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale).texto.split("\n");
  // No mesmo dia, só a hora; noutro dia, a data inteira.
  expect(linhas()).toContain(locale === "pt"
    ? "Nova hora de levantamento: 12h00 (em vez das 10h30)"
    : "New pick-up time: 12:00 (instead of 10:30)");
  dados.levantamentoEm = new Date("2026-12-07T12:00:00Z");
  expect(linhas()).toContain(locale === "pt"
    ? "Nova data de levantamento: Segunda-feira, 7 de dezembro, às 12h00 (em vez de domingo, 6 de dezembro, às 10h30)"
    : "New pick-up date: Monday 7 December at 12:00 (instead of Sunday 6 December at 10:30)");
});

it.each(LINGUAS)("mantém os parágrafos inteiros com dados longos em %s", (locale) => {
  const confirmado = escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), CASA_EXEMPLO, locale).texto;
  for (const inicio of locale === "pt" ? ["Levantamento:", "Produtos vendidos", "Para alterar"] : ["Collection:", "Products sold", "To change"]) {
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
      ? locale === "pt" ? "Conforme solicitado" : "As requested"
      : locale === "pt" ? "Lamentamos informar" : "We regret");
  }
});
