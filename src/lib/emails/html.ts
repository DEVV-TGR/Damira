import { LOGOTIPO_EMAIL } from "./logotipo";
import { BLOCOS, TEXTOS_LOJA } from "./textos";
import type { DadosCasa, DadosEmailPedido } from "./tipos";

/*
 * Um só layout para os doze modelos. O texto vem todo de `textos.ts`, pelos mesmos marcadores do
 * texto simples: aqui só se decide a apresentação. As cores são as de `globals.css`, escritas tal e
 * qual, porque um email não lê variáveis CSS; o verde (vegan) e as da afluência (calendário) não
 * entram, e sobre o tijolo só se escreve a papel.
 */
const TIJOLO = "#923D38";
const TINTA = "#1F1D1B";
const SUAVE = "#6B6461";
const PAPEL = "#FAFBFB";
const FUNDO = "#F1EFEC";
// As letras da marca à frente, para quem as tiver instaladas; sem web fonts, que num email são um
// pedido a um servidor alheio que denuncia a abertura. Quase todos acabam na Helvetica ou na Arial.
const TITULOS = "'Bricolage Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CORPO = "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * O anexo que leva o logótipo dentro do email, no formato da API do Resend. **Quem envia junta-o a
 * cada email** (o envio de teste já o faz; a fila tem de o fazer): sem ele, o topo mostra o texto
 * alternativo «Damira». Vai como anexo embutido, e não por endereço, porque o domínio ainda não serve
 * ficheiros e os clientes de correio bloqueiam imagens remotas por defeito. ⚠️ O envio em lote do
 * Resend não aceita anexos.
 */
export const ANEXO_LOGOTIPO = {
  filename: "damira.png",
  content: LOGOTIPO_EMAIL.base64,
  content_id: LOGOTIPO_EMAIL.cid,
  content_type: "image/png",
} as const;

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

const tabela = (conteudo: string, estilo = "", atributos = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${atributos} style="border-collapse:separate;font-family:${CORPO};font-size:16px;line-height:26px;color:${TINTA};${estilo}">${conteudo}</table>`;

// Os tamanhos vão em px, com a altura de linha também em px: o Outlook e o Gmail arredondam
// alturas relativas cada um à sua maneira, e o ritmo da página desfaz-se.
const ESTILO_ETIQUETA = `font-family:${CORPO};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;color:${SUAVE};`;
const ESTILO_PARAGRAFO = `margin:0 0 18px;font-family:${CORPO};font-size:16px;line-height:26px;color:${TINTA};`;
const ESTILO_ABERTURA = `margin:0 0 24px;font-family:${TITULOS};font-size:22px;line-height:30px;font-weight:bold;letter-spacing:-0.2px;color:${TINTA};`;

/** Um valor em euros não se parte a meio («15,60 / €»); um texto como «a fixar pela casa» pode. */
const eDinheiro = (valor: string) => /^(€\s?)?[\d.,\s]+(\s?€)?$/.test(valor.trim());

export function escreverHtmlEmail({ corpo, campos, partesLinhas, blocos, dados, casa, lingua }: Opcoes): string {
  const ler = (chave: string) => {
    const campo = campos[chave];
    if (campo === undefined) throw new Error(`Marcador de email desconhecido: ${chave}`);
    return typeof campo === "function" ? campo() : campo;
  };
  const telefone = `<a href="tel:${escaparHtml(casa.telefone.replace(/[^+\d]/g, ""))}" style="color:${TINTA};text-decoration:underline;white-space:nowrap;">${escaparHtml(casa.telefone)}</a>`;
  // Os blocos compostos também se preenchem em HTML: escapar o texto final perderia os links e a hierarquia.
  const camposHtml: Campos = {
    telefoneCasa: telefone,
    // A referência é o que o cliente diz ao balcão: tem de se encontrar à primeira.
    referencia: `<strong style="color:${TINTA};white-space:nowrap;">${escaparHtml(dados.referencia)}</strong>`,
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
    // O aviso herda a cor de onde está: na faixa de teste o fundo é tinta, e tinta sobre tinta não se lê.
    }).split("\n").map((linha) => linha.trimStart().startsWith("⚠️")
      ? `<strong class="aviso" style="font-weight:bold;">${linha}</strong>` : linha).join("<br>");
  }
  // «CLIENTE», «OBSERVAÇÕES»: uma linha sem minúsculas é o título da secção, não texto corrido.
  const eEtiqueta = (linha: string) => (linha.match(/\p{L}/gu)?.length ?? 0) >= 2 && !/\p{Ll}/u.test(linha);
  const etiqueta = (texto: string, margem = "0 0 4px") =>
    `<div class="etiqueta" style="margin:${margem};${ESTILO_ETIQUETA}">${texto.replace(/:\s*$/, "")}</div>`;
  const paragrafo = (conteudo: string, abertura = false): string => {
    const [primeira, ...resto] = conteudo.split("<br>");
    if (abertura) {
      return `<p class="abertura" style="${ESTILO_ABERTURA}">${primeira}</p>${resto.length ? paragrafo(resto.join("<br>")) : ""}`;
    }
    if (eEtiqueta(primeira) && resto.length) {
      return `<div style="margin:0 0 18px;">${etiqueta(primeira)}<p style="${ESTILO_PARAGRAFO}margin:0;">${resto.join("<br>")}</p></div>`;
    }
    return `<p style="${ESTILO_PARAGRAFO}">${conteudo}</p>`;
  };

  /** A data de levantamento, grande, numa caixa com a barra a tijolo; o que vem logo a seguir no texto (a morada) entra na caixa. */
  const destaque = (rotulo: string, sufixo: string, abaixo: string) => tabela(
    `<tr><td class="caixa" style="padding:20px 24px;border-left:4px solid ${TIJOLO};background-color:${FUNDO};border-radius:0 8px 8px 0;">`
      + (rotulo ? etiqueta(preencher(rotulo)) : "")
      + `<div class="data" style="font-family:${TITULOS};font-size:22px;line-height:30px;font-weight:bold;color:${TIJOLO};">${preencher("{levantamento}")}</div>`
      + (sufixo.trim() ? `<div style="font-size:14px;line-height:22px;color:${SUAVE};">${preencher(sufixo.trim())}</div>` : "")
      + (abaixo ? `<div style="margin-top:10px;font-size:15px;line-height:24px;color:${TINTA};">${preencher(abaixo)}</div>` : "")
      + "</td></tr>",
    "margin:0 0 24px;",
  );

  const pedido = (marcador: string, titulo: string, total?: string) => {
    const linhas = partesLinhas(marcador !== "linhas", marcador === "linhasLoja");
    const celula = "padding:14px 24px;border-top:1px solid " + PAPEL + ";vertical-align:top;";
    const cabeca = titulo
      ? `<tr><td colspan="2" class="caixa" style="padding:20px 24px 10px;">${etiqueta(preencher(titulo), "0")}</td></tr>`
      : "";
    const corpoTabela = linhas.map(({ nome, valor }, indice) => {
      // «12 × Pastel de nata»: a quantidade em segundo plano, para o olho ir ao artigo.
      const vezes = nome.indexOf(" × ");
      const nomeHtml = vezes > 0
        ? `<span style="color:${SUAVE};white-space:nowrap;">${escaparHtml(nome.slice(0, vezes))} ×</span> ${escaparHtml(nome.slice(vezes + 3))}`
        : escaparHtml(nome);
      const fio = indice === 0 && !titulo ? "padding:14px 24px;vertical-align:top;" : celula;
      return `<tr class="linha-pedido"><td width="65%" class="caixa" style="${fio}">${nomeHtml}</td>`
        + `<td align="right" class="caixa" style="${fio}text-align:right;${eDinheiro(valor) ? "white-space:nowrap;" : `font-size:14px;line-height:22px;color:${SUAVE};`}">${escaparHtml(valor)}</td></tr>`;
    }).join("");
    let rodapeTabela = "";
    if (total) {
      const modelo = total === "{total}" ? (dados.faltamPrecos ? blocos.totalConhecido : blocos.total) : total;
      const partes = total === "{total}" ? modelo.split("{valor}") : [];
      // O «(indicativo)» vai por baixo do valor, pequeno: é uma ressalva, não parte do número.
      const ressalva = partes.length === 2 ? preencher(partes[1]).replace(/<span[^>]*>|<\/span>/g, "").trim() : "";
      // «Total: {valor}{indicativo}» parte-se em duas colunas, rótulo à esquerda e valor à direita, como as linhas.
      rodapeTabela = partes.length === 2
        // O rótulo desce 2 px para assentar na mesma linha de base do valor, que é maior.
        ? `<tr class="linha-total"><td class="caixa" style="padding:18px 24px 20px;border-top:2px solid ${TIJOLO};font-weight:bold;vertical-align:top;">${preencher(partes[0].replace(/:\s*$/, ""))}</td>`
          + `<td align="right" class="caixa" style="padding:16px 24px 20px;border-top:2px solid ${TIJOLO};text-align:right;vertical-align:top;"><div style="font-family:${TITULOS};font-size:20px;line-height:28px;font-weight:bold;white-space:nowrap;">${escaparHtml(ler("valor"))}</div>${ressalva ? `<div style="font-size:13px;line-height:20px;color:${SUAVE};">${ressalva}</div>` : ""}</td></tr>`
        : `<tr><td colspan="2" class="caixa" style="padding:16px 24px 20px;border-top:2px solid ${TIJOLO};">${(() => {
          const [primeira, ...resto] = preencher(total).split("<br>");
          return eEtiqueta(primeira) && resto.length
            ? `${etiqueta(primeira)}<div style="font-weight:bold;">${resto.join("<br>")}</div>`
            : `<div style="font-weight:bold;">${[primeira, ...resto].join("<br>")}</div>`;
        })()}</td></tr>`;
    }
    return tabela(`${cabeca}${corpoTabela}${rodapeTabela}`, `margin:0 0 24px;background-color:${FUNDO};border-radius:8px;`);
  };

  const botao = () => {
    const endereco = ler("linkAceitar");
    // O endereço vai num atributo: além de escapar aspas, só aceitamos navegação HTTP(S).
    if (!/^https?:\/\//i.test(endereco)) throw new Error("O link de aceitação tem de usar HTTP ou HTTPS.");
    const url = escaparHtml(endereco);
    // Um botão «à prova de bala»: a cor está na célula, para o Outlook, que ignora o fundo de um <a>.
    return tabela(
      `<tr><td align="center" bgcolor="${TIJOLO}" style="background-color:${TIJOLO};border-radius:8px;">`
        + `<a class="botao" href="${url}" style="display:block;padding:16px 24px;font-family:${TITULOS};font-size:17px;line-height:24px;font-weight:bold;color:${PAPEL};text-decoration:none;border-radius:8px;">${preencher(blocos.botaoAceitar)}</a></td></tr>`,
      "margin:0 0 12px;",
    ) + `<p style="margin:0 0 24px;font-size:13px;line-height:20px;overflow-wrap:anywhere;word-break:break-all;color:${SUAVE};"><a href="${url}" style="color:${SUAVE};">${url}</a></p>`;
  };

  // A estrutura decide-se pelos marcadores do original, nunca pelo conteúdo que o cliente escreveu.
  const paragrafos = corpo.replace("{blocoIndicativo}", dados.linhas.some((linha) => linha.aoQuilo) ? `\n\n${blocos.indicativo}` : "").split("\n\n");
  const indiceFrase = paragrafos[0] === "{saudacao}" ? 1 : 0;
  // O pré-cabeçalho é a linha que a caixa de entrada mostra a seguir ao assunto. O assunto já diz o que
  // aconteceu; aqui junta-se a frase de abertura e, se o modelo a tiver, a linha do levantamento, em
  // texto corrido. O enchimento invisível no fim impede o cliente de correio de puxar para lá o resto
  // do corpo («Confeitaria · Pão Quente», «Olá, Maria»…).
  const textoSimples = (modelo: string) => modelo.replace(/\{(\w+)\}/g, (_, chave: string) => ler(chave)).replace(/\s+/g, " ").trim();
  const abertura = paragrafos[indiceFrase].split("\n")[0];
  const linhaLevantamento = paragrafos.flatMap((parte) => parte.split("\n")).find((linha) => linha.includes("{levantamento}"));
  const resumo = [abertura, linhaLevantamento && linhaLevantamento !== abertura ? linhaLevantamento : ""]
    .map((linha) => textoSimples(linha ?? "")).filter(Boolean)
    // Em texto corrido, «…o que mudou:» seguido de «Levantamento:» dava dois pontos seguidos: cada frase fecha com ponto.
    .map((linha) => `${linha.charAt(0).toLocaleUpperCase(lingua === "pt" ? "pt-PT" : "en-GB")}${linha.slice(1)}`.replace(/:$/, "."))
    .map((linha) => /[.!?]$/.test(linha) ? linha : `${linha}.`).join(" ");
  const preheader = escaparHtml(resumo) + "&#847;&zwnj;&nbsp;".repeat(60);
  let rodape = "";
  const conteudo = paragrafos.map((original, indice) => {
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
      const rotulo = antes.trim() || (posicao > 0 ? linhas.splice(posicao - 1, 1)[0] : "");
      const posicaoAtual = linhas.findIndex((linha) => linha.includes("{levantamento}"));
      const acima = linhas.slice(0, posicaoAtual).join("\n");
      const abaixo = linhas.slice(posicaoAtual + 1).join("\n");
      return `${acima ? paragrafo(preencher(acima), indice === indiceFrase) : ""}${destaque(rotulo, depois, abaixo)}`;
    }
    const limpo = original.trim();
    return limpo ? paragrafo(preencher(limpo), indice === indiceFrase) : "";
  }).join("");

  const faixaTeste = dados.modoDeTeste
    ? `<tr><td align="center" style="padding:10px 24px;background-color:${TINTA};font-size:13px;line-height:20px;color:${PAPEL};border-radius:12px 12px 0 0;">${preencher(blocos.teste)}</td></tr>`
    : "";
  // Com a imagem bloqueada, o texto alternativo aparece no lugar dela: daí o estilo no próprio <img>.
  const topo = `<tr><td class="topo" align="center" bgcolor="${TIJOLO}" style="padding:36px 24px 30px;background-color:${TIJOLO};${dados.modoDeTeste ? "" : "border-radius:12px 12px 0 0;"}">`
    + `<img src="cid:${LOGOTIPO_EMAIL.cid}" width="${LOGOTIPO_EMAIL.largura}" height="${LOGOTIPO_EMAIL.altura}" alt="Damira" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;font-family:${TITULOS};font-size:30px;line-height:35px;font-weight:bold;color:${PAPEL};">`
    + `<div style="margin-top:14px;font-family:${CORPO};font-size:11px;line-height:16px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:${PAPEL};">Confeitaria · Pão Quente</div></td></tr>`;
  const corpoCartao = `<tr><td class="conteudo" style="padding:36px 40px 12px;overflow-wrap:break-word;">${conteudo}</td></tr>`;
  const rodapeCartao = rodape
    ? `<tr><td class="rodape" style="padding:24px 40px 32px;border-top:1px solid ${FUNDO};font-size:14px;line-height:22px;color:${SUAVE};">${rodape}</td></tr>`
    : `<tr><td style="padding:0 0 12px;"></td></tr>`;

  return `<!doctype html>
<html lang="${lingua === "pt" ? "pt-PT" : "en-GB"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root { color-scheme: light only; } @media (max-width: 620px) { .margem { padding:0 !important; } .cartao, .topo { border-radius:0 !important; } .topo { padding:28px 20px 24px !important; } .conteudo { padding:28px 20px 8px !important; } .rodape { padding:20px 20px 28px !important; } .caixa { padding-left:16px !important; padding-right:16px !important; } .abertura { font-size:20px !important; line-height:28px !important; } .data { font-size:20px !important; line-height:28px !important; } }</style></head>
<body style="margin:0;padding:0;background-color:${FUNDO};color:${TINTA};font-family:${CORPO};font-size:16px;line-height:26px;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
${tabela(`<tr><td class="margem" align="center" style="padding:40px 12px;"> <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
${tabela(`${faixaTeste}${topo}${corpoCartao}${rodapeCartao}`, `max-width:600px;margin:0 auto;background-color:${PAPEL};border-radius:12px;text-align:left;`, ` class="cartao"`)}
<!--[if mso]></td></tr></table><![endif]--></td></tr>`, `background-color:${FUNDO};`)}
</body></html>`;
}
