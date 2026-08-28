import { routing } from "@/i18n/routing";

/**
 * Endereço público do site — fonte única.
 *
 * É preciso em sítios que têm de concordar entre si: o `metadataBase` (que
 * transforma os caminhos relativos das imagens de partilha em absolutos), o
 * `sitemap.ts`/`robots.ts` e os dados estruturados das duas casas.
 *
 * ⚠️ O valor por defeito é um subdomínio de demonstração da Vercel, porque **o
 * domínio final ainda não está decidido**. Quando estiver, define-se
 * `NEXT_PUBLIC_SITE_URL` no painel da Vercel e faz-se *redeploy*.
 */
export const URL_SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://damira-demo.vercel.app"
).replace(/\/+$/, "");

/**
 * Estúdio que desenhou e desenvolveu o site, creditado no rodapé.
 *
 * O endereço é facto e vive aqui; o nome é o texto da ligação e vive nas
 * mensagens, com o resto da frase. Não vai para o `marca.json`, que é só factos
 * sobre a Damira.
 */
export const URL_ESTUDIO = "https://devplus.pt";

/**
 * As páginas fixas do site, sem prefixo de idioma. Uma página nova entra aqui e
 * aparece sozinha no sitemap, nas duas línguas.
 *
 * **Só entram aqui rotas que existam mesmo.** Pôr `/contacto` ou `/privacidade`
 * antes de as páginas existirem é anunciar ao Google caminhos que dão 404 — e
 * uma página em falta assinalada por nós custa mais do que uma página que ainda
 * não foi prometida.
 */
export const ROTAS_FIXAS = ["/", "/ementa", "/encomendas"] as const;

export type RotaFixa = (typeof ROTAS_FIXAS)[number];

/** Todas as rotas públicas. Hoje só as fixas; fica preparado para crescer. */
export function rotasPublicas(): string[] {
  return [...ROTAS_FIXAS];
}

/**
 * O caminho absoluto de uma rota numa língua, já com o prefixo certo.
 *
 * Existe porque a regra do `localePrefix: "as-needed"` — português sem prefixo,
 * inglês com — está em três sítios que têm de concordar (o sitemap, os
 * `alternates` das metadata e o seletor de idioma), e escrevê-la à mão nos três
 * é garantir que um deles fica para trás.
 */
export function caminhoLocalizado(rota: string, locale: string): string {
  const prefixo = locale === routing.defaultLocale ? "" : `/${locale}`;
  return rota === "/" ? prefixo || "/" : `${prefixo}${rota}`;
}

/** O mesmo, mas absoluto — que é o que o sitemap e as metadata precisam. */
export const urlLocalizado = (rota: string, locale: string) =>
  `${URL_SITE}${caminhoLocalizado(rota, locale)}`;
