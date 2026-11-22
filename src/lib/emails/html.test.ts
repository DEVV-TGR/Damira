import { describe, expect, it } from "vitest";
import { BLOCOS } from "./textos";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "./exemplo";
import { escreverEmail } from "./modelos";
import { escaparHtml } from "./html";
import { formatarCent } from "@/lib/preco";

const CORES_PROIBIDAS = /#(?:698842|5f7a3b|1c7c54|d9f2e5|eda21c|fce8c3|b8322a|f7d1cd)/i;
const visivel = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, "");

describe.each(exemplosEmail())("HTML de $modelo · $locale · $variante", ({ modelo, locale, variante }) => {
  const dados = exemploEmail(modelo, variante);
  const lingua = modelo.endsWith("-loja") ? "pt" : locale;
  const email = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);

  it("usa a moldura comum, sem recursos externos nem marcadores pendentes", () => {
    expect(email.html).toMatch(/^<!doctype html>/);
    expect(email.html).toContain(`<html lang="${lingua === "pt" ? "pt-PT" : "en-GB"}">`);
    expect(email.html).toContain('name="color-scheme" content="light"');
    expect(email.html).toContain('name="supported-color-schemes" content="light"');
    expect(email.html).toContain('role="presentation"');
    expect(email.html).toContain("DAMIRA");
    expect(email.html).toContain("Confeitaria e Pão Quente");
    // As chavetas da media query são CSS necessário; o corpo não pode ter marcadores.
    expect(email.html.replace(/<style>[\s\S]*?<\/style>/g, "")).not.toMatch(/\{|undefined|null|<img|<link|<script/i);
    expect(email.html).not.toMatch(CORES_PROIBIDAS);
    expect(email.html).not.toMatch(/opacity|rgba|@import|url\(/i);
    expect(Buffer.byteLength(email.html, "utf8")).toBeLessThan(60 * 1024);
    const cores = email.html.match(/#[\da-f]{6}/gi) ?? [];
    expect(cores.every((cor) => ["#923D38", "#1F1D1B", "#6B6461", "#FAFBFB", "#F1EFEC"].includes(cor))).toBe(true);
    for (const endereco of email.html.matchAll(/href="([^"]+)"/g)) {
      expect(endereco[1].startsWith("tel:") || endereco[1] === dados.linkAceitar).toBe(true);
    }
  });

  it("mantém referência, datas, totais e preços do texto", () => {
    const conteudo = visivel(email.html);
    expect(conteudo).toContain(dados.referencia);
    if (email.texto.includes(formatarCent(dados.totalCent, lingua))) {
      expect(conteudo).toContain(formatarCent(dados.totalCent, lingua));
    }
    const datas = email.texto.match(lingua === "pt"
      ? /[\p{L}-]+, \d+ de [\p{L}]+ de \d{4}, às \d{2}:\d{2}/gu
      : /\p{L}+ \d+ \p{L}+ \d{4} at \d{2}:\d{2}/gu) ?? [];
    for (const data of datas) expect(conteudo).toContain(data);
    for (const linha of dados.linhas) {
      if (!email.texto.includes(linha.nome)) continue;
      expect(conteudo).toContain(linha.nome);
      if (linha.totalCent !== null) expect(conteudo).toContain(formatarCent(linha.totalCent, lingua));
      if (linha.aoQuilo && linha.precoUnitCent !== null && email.texto.includes("/kg")) {
        expect(conteudo).toContain(`${formatarCent(linha.precoUnitCent, lingua)}/kg`);
      }
    }
    if (modelo === "resposta-cliente") {
      expect(email.html).toContain(`href="${dados.linkAceitar}"`);
      expect(email.html.match(new RegExp(dados.linkAceitar!, "g"))).toHaveLength(3);
      expect(email.html).toContain(`bgcolor="#923D38"`);
    }
    if (email.texto.includes(CASA_EXEMPLO.telefone)) {
      expect(email.html).toContain('href="tel:+351229730939"');
    }
    const frase = email.texto.split("\n\n")[modelo.endsWith("-loja") ? 0 : 1];
    expect(email.html).toContain(`mso-hide:all;">${escaparHtml(frase)}</div>`);
  });

  it("mostra a faixa apenas em modo de teste", () => {
    const aviso = BLOCOS[lingua].teste;
    expect(email.html).not.toContain(aviso);
    const teste = escreverEmail(modelo, { ...dados, modoDeTeste: true }, CASA_EXEMPLO, locale);
    expect(teste.html).toContain(aviso);
    expect(teste.html.indexOf(aviso)).toBeLessThan(teste.html.indexOf(">DAMIRA<"));
  });

  it("escapa todos os dados, incluindo os blocos compostos", () => {
    const ataque = `<b>"x"&</b>'`;
    const alterados = {
      ...dados,
      cliente: { nome: ataque, email: ataque, telefone: ataque, nif: ataque },
      observacoes: ataque,
      linhas: dados.linhas.map((linha) => ({ ...linha, nome: ataque, detalhe: ataque })),
    };
    const casa = { nome: ataque, morada: ataque, localidade: ataque, telefone: ataque };
    const { html } = escreverEmail(modelo, alterados, casa, locale);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;&quot;x&quot;&amp;&lt;/b&gt;&#39;");
    expect(html).not.toContain("&amp;lt;b");
  });
});

it("escapa o endereço no botão e recusa esquemas que executem código", () => {
  const dados = exemploEmail("resposta-cliente");
  dados.linkAceitar = 'https://damira.pt/aceitar?x="&y=1';
  expect(escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, "pt").html)
    .toContain('href="https://damira.pt/aceitar?x=&quot;&amp;y=1"');
  dados.linkAceitar = "javascript:alert(1)";
  expect(() => escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, "pt")).toThrow("HTTP");
});

it("não interpreta marcadores escritos pelo cliente", () => {
  const dados = exemploEmail("criado-loja");
  dados.observacoes = "{total} {telefoneCasa}";
  dados.linhas[0].nome = "{linkAceitar}";
  const { html } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  expect(html).toContain("{total} {telefoneCasa}");
  expect(html).toContain("{linkAceitar}");
});

it("limita a abertura grande à primeira linha do criado-loja", () => {
  const dados = exemploEmail("criado-loja");
  const { html, texto } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  const grandes = [...html.matchAll(/<p style="([^"]*font-size:20px[^"]*)">([\s\S]*?)<\/p>/g)];
  expect(grandes).toHaveLength(1);
  expect(grandes[0][1]).toContain("font-weight:bold");
  expect(grandes[0][2]).toBe(texto.split("\n")[0]);
  expect(html).toMatch(/<p style="[^"]*font-size:16px[^"]*">Entrou pelo site:/);
});

it("destaca a negrito as linhas de aviso, incluindo o prazo e a faixa de teste", () => {
  for (const { modelo, locale, variante } of exemplosEmail()) {
    const dados = { ...exemploEmail(modelo, variante), modoDeTeste: true };
    const { html, texto } = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    const avisos = texto.split("\n").filter((linha) => linha.startsWith("⚠️"));
    expect(avisos.length).toBeGreaterThan(0);
    for (const aviso of avisos) {
      expect(html).toContain(`<strong style="font-weight:bold;">${escaparHtml(aviso)}</strong>`);
    }
  }
});

it("apresenta as etiquetas do criado-loja com o conteúdo normal por baixo", () => {
  const { html } = escreverEmail("criado-loja", exemploEmail("criado-loja"), CASA_EXEMPLO, "pt");
  const estilo = "font-size:13px;color:#6B6461;letter-spacing:1px;font-weight:bold;";
  for (const etiqueta of ["CLIENTE", "OBSERVAÇÕES"]) {
    expect(html).toContain(`<span style="${estilo}">${etiqueta}</span><br>`);
    const paragrafo = [...html.matchAll(/<p style="([^"]*)">([\s\S]*?)<\/p>/g)]
      .find((resultado) => resultado[2].includes(`>${etiqueta}</span>`));
    expect(paragrafo?.[1]).toContain("font-size:16px;");
    expect(paragrafo?.[1]).not.toContain("font-weight:bold");
  }
  expect(html).toContain(`<div style="${estilo}">LEVANTAMENTO NA LOJA</div>`);
  expect(html).toMatch(/<td colspan="2" style="[^"]*font-weight:bold;">O QUE LEVA<\/td>/);
});

it("reserva 65 % para os nomes e mantém os valores à direita na caixa do pedido", () => {
  const dados = exemploEmail("criado-loja");
  const { html } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  const linhas = [...html.matchAll(/<tr><td width="65%" valign="top"[^>]*>(.*?)<\/td><td align="right" valign="top"[^>]*>(.*?)<\/td><\/tr>/g)];
  expect(linhas).toHaveLength(dados.linhas.length);
  expect(linhas[1][1]).toContain("Bolo por medida");
  expect(linhas[1][2]).toBe("SEM PREÇO, a fixar pela gerente");
});

it.each([
  ["pt", "Ver e aceitar a proposta", "Para ver e aceitar:"],
  ["en", "View and accept the proposal", "To view and accept:"],
] as const)("usa a ação explícita no botão da resposta em %s", (locale, rotulo, introducao) => {
  const dados = exemploEmail("resposta-cliente");
  const { html, texto } = escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale);
  expect(html).toContain(`text-decoration:none;">${rotulo}</a>`);
  expect(html).not.toContain(introducao);
  expect(texto).toContain(introducao);
  expect(html).toContain(`href="${dados.linkAceitar}" style="color:#6B6461;">${dados.linkAceitar}</a>`);
});
