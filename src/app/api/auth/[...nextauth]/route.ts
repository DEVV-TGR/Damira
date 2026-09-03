import { handlers } from "@/lib/autenticacao";

/**
 * As rotas que o Google e o Facebook chamam de volta.
 *
 * ⚠️ **Vive fora de `[locale]`**, e tem de viver: o endereço de devolução é
 * registado na consola do fornecedor e é um só. Debaixo do idioma passavam a
 * existir dois (`/api/auth/...` e `/en/api/auth/...`) e um deles nunca era o
 * que estava registado. O `matcher` do `proxy.ts` já exclui `/api` por isso.
 */
export const { GET, POST } = handlers;
