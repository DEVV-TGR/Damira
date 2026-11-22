import { BLOCOS, TEXTOS_LOJA } from "./textos";
import type { DadosCasa, DadosEmailPedido } from "./tipos";

const TIJOLO = "#923D38";
const TINTA = "#1F1D1B";
const SUAVE = "#6B6461";
const PAPEL = "#FAFBFB";
const FUNDO = "#F1EFEC";
const TITULOS = "'Trebuchet MS', Arial, sans-serif";
const CORPO = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

type Campos = Record<string, string | (() => string)>;
type Opcoes = {
  corpo: string;
  campos: Campos;
  partesLinhas: (paraLoja: boolean, comUnitario: boolean) => { nome: string; valor: string }[];
  blocos: (typeof BLOCOS)[keyof typeof BLOCOS];
  dados: DadosEmailPedido;
  casa: DadosCasa;
  lingua: "pt" | "en";
};

export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caracter]!);
}

const tabela = (conteudo: string, estilo = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${CORPO};font-size:16px;line-height:1.5;color:${TINTA};${estilo}">${conteudo}</table>`;

export function escreverHtmlEmail({ corpo, campos, partesLinhas, blocos, dados, casa, lingua }: Opcoes): string {
  const ler = (chave: string) => {
    const campo = campos[chave];
    if (campo === undefined) throw new Error(`Marcador de email desconhecido: ${chave}`);
    return typeof campo === "function" ? campo() : campo;
  };
  const telefone = `<a href="tel:${escaparHtml(casa.telefone.replace(/[^+\d]/g, ""))}" style="color:inherit;text-decoration:underline;">${escaparHtml(casa.telefone)}</a>`;
  // Os blocos compostos também se preenchem em HTML: escapar o texto final perderia os links e a hierarquia.
  const camposHtml: Campos = {
    telefoneCasa: telefone,
    saudacao: () => preencher(blocos.saudacao),
    rodape: () => preencher(blocos.rodape),
    indicativo: () => `<span style="font-size:14px;font-weight:normal;color:${SUAVE};">${escaparHtml(ler("indicativo"))}</span>`,
    total: () => preencher(dados.faltamPrecos ? blocos.totalConhecido : blocos.total),
    pagamentoLoja: () => preencher(dados.faltamPrecos ? TEXTOS_LOJA.pagamentoIncompleto : TEXTOS_LOJA.pagamento),
  };
  function preencher(modelo: string): string {
    // Uma só passagem impede que chavetas vindas dos dados sejam interpretadas como novos marcadores.
    return escaparHtml(modelo).replace(/\{(\w+)\}/g, (_, chave: string) => {
      const campo = camposHtml[chave];
      return campo === undefined ? escaparHtml(ler(chave)) : typeof campo === "function" ? campo() : campo;
    }).split("\n").map((linha) => linha.trimStart().startsWith("⚠️")
      ? `<strong style="font-weight:bold;">${linha}</strong>` : linha).join("<br>");
  }
  const eEtiqueta = (linha: string) => (linha.match(/\p{L}/gu)?.length ?? 0) >= 2 && !/\p{Ll}/u.test(linha);
  const estiloEtiqueta = `font-size:13px;color:${SUAVE};letter-spacing:1px;font-weight:bold;`;
  const comEtiqueta = (conteudo: string) => {
    const [primeira, ...resto] = conteudo.split("<br>");
    return eEtiqueta(primeira) ? `<span style="${estiloEtiqueta}">${primeira}</span>${resto.length ? `<br>${resto.join("<br>")}` : ""}` : conteudo;
  };
  const paragrafo = (conteudo: string, maior = false): string => {
    const [primeira, ...resto] = conteudo.split("<br>");
    if (maior && resto.length) return paragrafo(primeira, true) + paragrafo(resto.join("<br>"));
    return `<p style="margin:0 0 20px;color:${TINTA};font-family:${maior ? TITULOS : CORPO};font-size:${maior ? 20 : 16}px;line-height:1.5;${maior ? "font-weight:bold;" : ""}">${maior ? conteudo : comEtiqueta(conteudo)}</p>`;
  };
  const destaque = (etiqueta: string, sufixo: string) => tabela(`<tr><td style="padding:16px 20px;border-left:4px solid ${TIJOLO};background-color:${FUNDO};color:${TINTA};"><div style="${eEtiqueta(etiqueta) ? estiloEtiqueta : `font-size:13px;color:${SUAVE};`}">${preencher(etiqueta)}</div><div style="font-family:${TITULOS};font-size:20px;line-height:1.5;font-weight:bold;color:${TIJOLO};">${preencher("{levantamento}")}</div>${sufixo ? `<div style="font-size:14px;color:${SUAVE};">${preencher(sufixo)}</div>` : ""}</td></tr>`, "margin-bottom:20px;");
  const pedido = (marcador: string, titulo: string, total?: string) => {
    const linhas = partesLinhas(marcador !== "linhas", marcador === "linhasLoja");
    return tabela(`${titulo ? `<tr><td colspan="2" style="padding:16px 16px 8px;color:${TINTA};font-family:${TITULOS};font-weight:bold;">${preencher(titulo)}</td></tr>` : ""}${linhas.map((linha) => `<tr><td width="65%" valign="top" style="padding:12px 16px;border-bottom:1px solid ${PAPEL};color:${TINTA};">${escaparHtml(linha.nome)}</td><td align="right" valign="top" style="padding:12px 16px;border-bottom:1px solid ${PAPEL};color:${TINTA};">${escaparHtml(linha.valor)}</td></tr>`).join("")}${total ? `<tr><td colspan="2" style="padding:16px;border-top:2px solid ${TIJOLO};font-weight:bold;color:${TINTA};">${comEtiqueta(preencher(total))}</td></tr>` : ""}`, `background-color:${FUNDO};margin-bottom:20px;`);
  };
  const botao = () => {
    const endereco = ler("linkAceitar");
    // O endereço vai num atributo: além de escapar aspas, só aceitamos navegação HTTP(S).
    if (!/^https?:\/\//i.test(endereco)) throw new Error("O link de aceitação tem de usar HTTP ou HTTPS.");
    const url = escaparHtml(endereco);
    return `${tabela(`<tr><td align="center" bgcolor="${TIJOLO}" style="background-color:${TIJOLO};color:${PAPEL};padding:16px 20px;"><a href="${url}" style="display:block;font-family:${TITULOS};font-size:16px;font-weight:bold;color:${PAPEL};text-decoration:none;">${preencher(blocos.botaoAceitar)}</a></td></tr>`, "margin-bottom:12px;")}<p style="margin:0 0 20px;font-size:14px;line-height:1.5;overflow-wrap:anywhere;word-break:break-all;color:${SUAVE};"><a href="${url}" style="color:${SUAVE};">${url}</a></p>`;
  };

  // A estrutura decide-se pelos marcadores do original, nunca pelo conteúdo que o cliente escreveu.
  const paragrafos = corpo.replace("{blocoIndicativo}", dados.linhas.some((linha) => linha.aoQuilo) ? `\n\n${blocos.indicativo}` : "").split("\n\n");
  const indiceFrase = paragrafos[0] === "{saudacao}" ? 1 : 0;
  const preheader = escaparHtml(paragrafos[indiceFrase]).replace(/\{(\w+)\}/g, (_, chave: string) => escaparHtml(ler(chave)));
  let rodape = "";
  const conteudo = paragrafos.map((original, indice) => {
    let paragrafoModelo = original;
    if (original.includes("{rodape}")) {
      rodape = preencher(original);
      return "";
    }
    const marcadorLinhas = /\{(linhas|linhasLoja|linhasLembrete)\}/.exec(original);
    if (marcadorLinhas) {
      const seguinte = paragrafos[indice + 1];
      const temTotal = seguinte?.startsWith("{total}");
      if (temTotal) paragrafos[indice + 1] = seguinte.slice("{total}".length).replace(/^\n/, "");
      const indicePagamento = paragrafos.findIndex((parte, posicao) => posicao > indice && parte.includes("{pagamentoLoja}"));
      const pagamento = indicePagamento >= 0 ? paragrafos[indicePagamento] : undefined;
      if (indicePagamento >= 0) paragrafos[indicePagamento] = "";
      return pedido(marcadorLinhas[1], original.replace(marcadorLinhas[0], "").trim(), temTotal ? "{total}" : pagamento);
    }
    if (original.includes("{linkAceitar}")) return botao();
    if (original.includes("{levantamento}")) {
      const linhas = original.split("\n");
      const posicao = linhas.findIndex((linha) => linha.includes("{levantamento}"));
      const [antes, depois] = linhas[posicao].split("{levantamento}");
      const etiqueta = antes.trim() || (posicao > 0 ? linhas.splice(posicao - 1, 1)[0] : "");
      const posicaoAtual = linhas.findIndex((linha) => linha.includes("{levantamento}"));
      const acima = linhas.slice(0, posicaoAtual).join("\n");
      const abaixo = linhas.slice(posicaoAtual + 1).join("\n");
      return `${acima ? paragrafo(preencher(acima), indice === indiceFrase) : ""}${destaque(etiqueta, depois)}${abaixo ? paragrafo(preencher(abaixo)) : ""}`;
    }
    paragrafoModelo = paragrafoModelo.trim();
    return paragrafoModelo ? paragrafo(preencher(paragrafoModelo), indice === indiceFrase) : "";
  }).join("");

  return `<!doctype html>
<html lang="${lingua === "pt" ? "pt-PT" : "en-GB"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>@media (max-width: 620px) { .margem { padding:0 !important; } .conteudo { padding:24px 20px !important; } }</style></head>
<body style="margin:0;padding:0;background-color:${FUNDO};color:${TINTA};font-family:${CORPO};font-size:16px;line-height:1.5;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
${tabela(`<tr><td class="margem" align="center" style="padding:32px 12px;"> <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
${tabela(`${dados.modoDeTeste ? `<tr><td style="padding:12px 24px;background-color:${TINTA};color:${PAPEL};font-size:14px;">${preencher(blocos.teste)}</td></tr>` : ""}<tr><td align="center" style="padding:28px 24px;background-color:${TIJOLO};color:${PAPEL};"><div style="font-family:${TITULOS};font-size:32px;letter-spacing:6px;font-weight:bold;color:${PAPEL};">DAMIRA</div><div style="font-family:${TITULOS};font-size:16px;color:${PAPEL};">Confeitaria e Pão Quente</div></td></tr><tr><td class="conteudo" style="padding:32px;color:${TINTA};overflow-wrap:break-word;">${conteudo}</td></tr>${rodape ? `<tr><td style="padding:24px 32px;border-top:1px solid ${FUNDO};font-size:14px;line-height:1.5;color:${SUAVE};">${rodape}</td></tr>` : ""}`, `max-width:600px;background-color:${PAPEL};text-align:left;`)}
<!--[if mso]></td></tr></table><![endif]--></td></tr>`, `background-color:${FUNDO};`)}
</body></html>`;
}
