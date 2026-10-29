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
 *
 * ⚠️ **O site abre sempre em português** (#78, pedido da casa a 12/10/2026). A
 * negociação de idioma do next-intl estava ligada por defeito e mandava para
 * `/en` quem tivesse o inglês à frente no `Accept-Language` — o que inclui
 * telemóveis «em português» com o inglês como primeira língua do sistema, e
 * quem tivesse ficado com o cookie de uma visita a `/en`. O inglês fica para
 * quem o escolhe no seletor. Sem deteção, o cookie de idioma deixa de servir
 * para alguma coisa, e por isso também sai: é um cookie a menos para o aviso
 * de cookies explicar.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
