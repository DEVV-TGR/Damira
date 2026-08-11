import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * **A CSP consegue ser tão apertada porque o site não carrega nada de fora.**
 * As fontes são servidas pelo próprio domínio (`next/font`), as fotografias das
 * duas casas vivem em `public/` (por isso não há `images.remotePatterns`, mais
 * abaixo) e o Vercel Analytics serve o script a partir de `/_vercel/insights/`,
 * que é a mesma origem.
 *
 * ⚠️ **Atenção ao dia em que alguém quiser embeber o mapa das casas.** Um
 * `<iframe>` do Google Maps exige abrir `frame-src` e `img-src` a domínios da
 * Google, e passa a haver um terceiro a ver quem visita o site — o que arrasta
 * consentimento de cookies atrás. Enquanto o botão de direções for um link
 * normal para o Maps, nada disto é preciso, e é de propósito.
 *
 * ⚠️ **O `'unsafe-inline'` no `script-src` tira à CSP quase toda a proteção
 * contra XSS**, e é preciso porque o Next injeta os scripts de arranque e o
 * payload de hidratação inline. Não vale a pena fingir o contrário: apertá-lo a
 * sério exigia gerar um nonce por pedido no `src/proxy.ts`, que é a peça que faz
 * o encaminhamento PT/EN, e o risco de partir o routing não compensa num site
 * que não renderiza conteúdo de terceiros — o único `dangerouslySetInnerHTML` é
 * o JSON-LD, alimentado pelos JSON de `src/data/` e já escapado.
 *
 * O que estes cabeçalhos dão a sério:
 *
 * - `frame-ancestors 'none'` — ninguém põe o site dentro de um iframe para lhe
 *   roubar cliques.
 * - `form-action 'self'` — nenhum formulário pode ser reapontado para outro
 *   servidor por conteúdo injetado.
 * - `connect-src 'self'` — nada sai deste site para terceiros.
 * - `object-src 'none'` e `base-uri 'self'` — fecham dois vetores clássicos
 *   (plugins e sequestro de URLs relativos).
 *
 * `img-src` precisa de `data:` e `blob:` por causa do otimizador de imagens do
 * Next, e `style-src` de `'unsafe-inline'` por causa dos estilos que o React
 * injeta em atributos `style`.
 *
 * ## `'unsafe-eval'` só em desenvolvimento
 *
 * Estes cabeçalhos aplicam-se **também ao `npm run dev`**, e aí o cliente RSC do
 * React usa `eval()` para reconstruir as pilhas de chamadas que vêm do servidor
 * — é o que faz um erro num componente de servidor aparecer no overlay com a
 * linha certa. Sem a diretiva, escreve `eval() is not supported in this
 * environment` na consola a cada carregamento. Em produção o React **nunca** usa
 * `eval`, e por isso a diretiva não vai lá parar.
 *
 * ⚠️ **Não tirar isto de dentro do `NODE_ENV`.** Um `'unsafe-eval'` constante
 * era uma perda de segurança a sério — é o que transforma uma string injetada em
 * código executável — para calar um aviso que em produção nem existe.
 */
const DESENVOLVIMENTO = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DESENVOLVIMENTO ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const CABECALHOS = [
  { key: "Content-Security-Policy", value: CSP },
  /* Impede o browser de adivinhar o tipo de um ficheiro em vez de acreditar no
     `Content-Type` — é o que transforma um upload inócuo em script executável. */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* Um link para fora (Uber Eats, Glovo, Instagram) leva o domínio, nunca o
     caminho nem a query. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* O site não usa nenhuma destas APIs; negá-las à cabeça evita que um script
     futuro (ou injetado) as peça em nome dele. */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  /* Dois anos de HTTPS obrigatório. A Vercel já serve o site só em HTTPS, mas
     sem este cabeçalho o primeiro pedido de um visitante novo ainda pode sair
     em claro e ser desviado. */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * Sem `images.remotePatterns`, e é de propósito: **todas as fotografias vivem em
 * `public/`**. A tentação é apontar às imagens do Instagram ou das lojas do Uber
 * Eats e poupar o trabalho de as descarregar — mas essas mudam de URL sem aviso
 * e desaparecem quando um post é apagado, e o site ficava com buracos que
 * ninguém dá por eles.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:caminho*", headers: CABECALHOS }];
  },
};

export default withNextIntl(nextConfig);
