import { describe, expect, it } from "vitest";
import { BLOCOS } from "./textos";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "./exemplo";
import { escreverEmail } from "./modelos";
import { ANEXO_LOGOTIPO, escaparHtml } from "./html";
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
    expect(email.html).toContain("Confeitaria · Pão Quente");
    // Uma só imagem, o logótipo, embutida no próprio email e com texto alternativo para quando a bloqueiam.
    expect(email.html.match(/<img\b/g)).toHaveLength(1);
    expect(email.html).toMatch(/<img src="cid:logotipo-damira" width="\d+" height="\d+" alt="Damira"/);
    expect(email.html).not.toMatch(/src="(?!cid:)/);
    // As chavetas da media query são CSS necessário; o corpo não pode ter marcadores.
    expect(email.html.replace(/<style>[\s\S]*?<\/style>/g, "")).not.toMatch(/\{|undefined|null|<link|<script/i);
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
    // O pré-cabeçalho começa pela frase de abertura (a primeira linha dela).
    const frase = email.texto.split("\n\n")[modelo.endsWith("-loja") ? 0 : 1].split("\n")[0];
    const preheader = /mso-hide:all;">([\s\S]*?)<\/div>/.exec(email.html)?.[1] ?? "";
    // Em texto corrido, os dois pontos do fim passam a ponto.
    expect(preheader.startsWith(escaparHtml(frase).replace(/\s+/g, " ").trim().replace(/:$/, "."))).toBe(true);
    expect(preheader).toContain("&zwnj;");
  });

  it("mostra a faixa apenas em modo de teste", () => {
    const aviso = BLOCOS[lingua].teste;
    expect(email.html).not.toContain(aviso);
    const teste = escreverEmail(modelo, { ...dados, modoDeTeste: true }, CASA_EXEMPLO, locale);
    expect(teste.html).toContain(aviso);
    expect(teste.html.indexOf(aviso)).toBeLessThan(teste.html.indexOf('src="cid:'));
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
  const aberturas = [...html.matchAll(/<p class="abertura" style="([^"]*)">([\s\S]*?)<\/p>/g)];
  expect(aberturas).toHaveLength(1);
  expect(aberturas[0][1]).toContain("font-weight:bold");
  // A referência vai a negrito dentro da frase; tirando as etiquetas, o texto é o mesmo.
  expect(aberturas[0][2].replace(/<[^>]+>/g, "")).toBe(texto.split("\n")[0]);
  expect(html).toMatch(/<p style="[^"]*font-size:16px[^"]*">Entrou pelo site:/);
});

it("destaca a negrito as linhas de aviso, incluindo o prazo e a faixa de teste", () => {
  for (const { modelo, locale, variante } of exemplosEmail()) {
    const dados = { ...exemploEmail(modelo, variante), modoDeTeste: true };
    const { html, texto } = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    const avisos = texto.split("\n").filter((linha) => linha.startsWith("⚠️"));
    expect(avisos.length).toBeGreaterThan(0);
    for (const aviso of avisos) {
      expect(html).toMatch(new RegExp(`<strong class="aviso" style="[^"]*font-weight:bold;[^"]*">${escaparHtml(aviso).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</strong>`));
    }
  }
});

it("apresenta as etiquetas do criado-loja com o conteúdo normal por baixo", () => {
  const { html } = escreverEmail("criado-loja", exemploEmail("criado-loja"), CASA_EXEMPLO, "pt");
  for (const etiqueta of ["CLIENTE", "OBSERVAÇÕES", "LEVANTAMENTO NA LOJA", "O QUE LEVA", "PAGAMENTO"]) {
    expect(html).toMatch(new RegExp(`<div class="etiqueta" style="[^"]*text-transform:uppercase;[^"]*">${etiqueta}</div>`));
  }
  // O que vem por baixo da etiqueta é texto normal, e não outra abertura.
  expect(html).toMatch(/>CLIENTE<\/div><p style="[^"]*font-size:16px;[^"]*">Nome: /);
});

it("reserva 65 % para os nomes e mantém os valores à direita na caixa do pedido", () => {
  const dados = exemploEmail("criado-loja");
  const { html } = escreverEmail("criado-loja", dados, CASA_EXEMPLO, "pt");
  const linhas = [...html.matchAll(/<tr class="linha-pedido"><td width="65%"[^>]*>(.*?)<\/td><td align="right"[^>]*>(.*?)<\/td><\/tr>/g)];
  expect(linhas).toHaveLength(dados.linhas.length);
  expect(linhas[1][1]).toContain("Bolo por medida");
  expect(linhas[1][2]).toBe("SEM PREÇO, a fixar pela gerente");
  // Um valor em euros não se parte; o texto de «sem preço» pode.
  expect(html).toMatch(/white-space:nowrap;">15,60\s€<\/td>/);
});

it("parte o total em rótulo e valor, com o indicativo por baixo", () => {
  const { html } = escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), CASA_EXEMPLO, "pt");
  const total = /<tr class="linha-total">([\s\S]*?)<\/tr>/.exec(html)?.[1] ?? "";
  expect(total).toMatch(/>Total<\/td>/);
  expect(total).toMatch(/>49,60\s€<\/div>/);
  expect(total).toContain("(indicativo)");
});

it.each([
  ["pt", "Ver e aceitar a proposta", "Para ver e aceitar:"],
  ["en", "View and accept the proposal", "To view and accept:"],
] as const)("usa a ação explícita no botão da resposta em %s", (locale, rotulo, introducao) => {
  const dados = exemploEmail("resposta-cliente");
  const { html, texto } = escreverEmail("resposta-cliente", dados, CASA_EXEMPLO, locale);
  expect(html).toMatch(new RegExp(`<a class="botao" href="${dados.linkAceitar}" style="[^"]*">${rotulo}</a>`));
  expect(html).not.toContain(introducao);
  expect(texto).toContain(introducao);
  expect(html).toContain(`href="${dados.linkAceitar}" style="color:#6B6461;">${dados.linkAceitar}</a>`);
});

it("leva o logótipo como anexo embutido, no formato do Resend", () => {
  expect(ANEXO_LOGOTIPO.content_id).toBe("logotipo-damira");
  expect(ANEXO_LOGOTIPO.content_type).toBe("image/png");
  // Começa pela assinatura de um PNG.
  expect(Buffer.from(ANEXO_LOGOTIPO.content, "base64").subarray(1, 4).toString()).toBe("PNG");
});

it.each(exemplosEmail())("a faixa de teste de $modelo · $locale lê-se: papel sobre tinta, sem nada a tinta lá dentro", ({ modelo, locale, variante }) => {
  const { html } = escreverEmail(modelo, { ...exemploEmail(modelo, variante), modoDeTeste: true }, CASA_EXEMPLO, locale);
  const faixa = /<td align="center" style="[^"]*background-color:#1F1D1B;[^"]*">([\s\S]*?)<\/td>/.exec(html);
  expect(faixa?.[0]).toContain("color:#FAFBFB;");
  expect(faixa?.[1]).not.toContain("#1F1D1B");
  expect(faixa?.[1].replace(/<[^>]+>/g, "")).toBe(BLOCOS[modelo.endsWith("-loja") ? "pt" : locale].teste);
});

it.each(exemplosEmail().filter(({ modelo }) => !modelo.endsWith("-loja")))(
  "o assunto de $modelo · $locale diz o que aconteceu antes da referência",
  ({ modelo, locale, variante }) => {
    const dados = exemploEmail(modelo, variante);
    const { assunto } = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    // A notificação corta o assunto: a referência vai no fim, para os primeiros carateres serem o estado.
    expect(assunto.startsWith("Pedido DAM") || assunto.startsWith("Order DAM")).toBe(false);
    expect(assunto.endsWith(`· ${dados.referencia}`)).toBe(true);
  },
);

it("o pré-cabeçalho da confirmação junta a abertura e o levantamento", () => {
  const { html } = escreverEmail("criado-confirmado-cliente", exemploEmail("criado-confirmado-cliente"), CASA_EXEMPLO, "pt");
  const preheader = /mso-hide:all;">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
  expect(preheader).toMatch(/^O seu pedido está confirmado\. Levantamento: domingo, 6 de dezembro de 2026, às 10:30\.&#847;/);
});
