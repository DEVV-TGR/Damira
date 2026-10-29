import { defineRouting } from "next-intl/routing";

/**
 * Duas línguas: português para quem vive aqui, inglês para quem vem
 * de fora — turistas e visitantes de passagem pela zona do Porto.
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
