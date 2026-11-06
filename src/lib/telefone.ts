import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/**
 * # O telefone, com o país (decidido a 05/10)
 *
 * O cliente escolhe o país num seletor (🇵🇹 +351 por defeito) e escreve o
 * número, que se arruma como esse país o escreve: `911 222 333` em Portugal,
 * `7400 123456` no Reino Unido. Guarda-se em **E.164** (`+351911222333`) e
 * mostra-se arrumado (`+351 911 222 333`) no painel, no talão e no email.
 *
 * Este ficheiro corre no browser e usa os metadados pequenos (`/min`): chegam
 * para arrumar e para mostrar. ⚠️ **Não chegam para validar** — aceitam um
 * `811…` português, porque só conferem o tamanho. A validação a sério é a do
 * servidor, com os metadados completos (`telefoneValido`, em `pedidos.ts`).
 */

export const PAIS_POR_DEFEITO: CountryCode = "PT";

/* No topo da lista, os países de quem mais provavelmente encomenda. */
const PRIMEIROS: CountryCode[] = ["PT", "ES", "FR", "GB", "BR", "DE"];

/** 🇵🇹 a partir de `PT`: os dois símbolos de letra regional. Sem imagens. */
export const bandeira = (pais: string): string =>
  String.fromCodePoint(...[...pais.toUpperCase()].map((letra) => 0x1f1e6 + letra.charCodeAt(0) - 65));

export const indicativo = (pais: CountryCode): string => `+${getCountryCallingCode(pais)}`;

export const ehPais = (texto: string): texto is CountryCode => (getCountries() as string[]).includes(texto);

export type Pais = { codigo: CountryCode; nome: string; indicativo: string; bandeira: string };

/** Todos os países, com o nome na língua da página: os prováveis primeiro, os outros por ordem. */
export function paises(locale: string): Pais[] {
  const nomes = new Intl.DisplayNames([locale], { type: "region" });
  const todos = getCountries().map((codigo) => ({
    codigo,
    nome: nomes.of(codigo) ?? codigo,
    indicativo: indicativo(codigo),
    bandeira: bandeira(codigo),
  }));
  const ordem = new Intl.Collator(locale);
  return [
    ...PRIMEIROS.flatMap((c) => todos.filter((p) => p.codigo === c)),
    ...todos.filter((p) => !PRIMEIROS.includes(p.codigo)).sort((a, b) => ordem.compare(a.nome, b.nome)),
  ];
}

/** O número arrumado enquanto se escreve, como o país o escreve. */
export const aoEscrever = (texto: string, pais: CountryCode): string => new AsYouType(pais).input(texto);

/** `+351911222333` → `+351 911 222 333`. Um número que não se reconheça fica como está. */
export const telefoneArrumado = (e164: string | null): string =>
  e164 ? (parsePhoneNumberFromString(e164)?.formatInternational() ?? e164) : "";
