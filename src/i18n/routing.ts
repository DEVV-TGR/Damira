import { defineRouting } from "next-intl/routing";

/**
 * Duas línguas: português para quem vive aqui, inglês para o turismo — que no
 * Porto e em Leça da Palmeira, a dois passos da Foz e do mar, é metade da sala
 * no verão.
 *
 * `localePrefix: "as-needed"` deixa as rotas portuguesas sem prefixo (`/ementa`)
 * e prefixa só o inglês (`/en/ementa`). Os *slugs* são iguais nas duas línguas
 * de propósito: traduzi-los obrigava a manter um mapa de `pathnames` e a tratar
 * redireccionamentos, e não traz nada a um site deste tamanho.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
