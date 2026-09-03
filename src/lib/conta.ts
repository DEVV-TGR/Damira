/**
 * # A conta de cliente: o que está ligado, e o que acontece quando não está
 *
 * Este ficheiro **não importa o `next-auth`** de propósito. É lido pelo layout,
 * que é um componente de servidor gerado no `build`, e pelo `autenticacao.ts`,
 * que é o que fala com os fornecedores. Se aqui entrasse a biblioteca, metade
 * do site passava a arrastá-la — e um componente de cliente que a importasse
 * por engano rebentava o `build` com um erro que não diz o que se passou.
 *
 * ## ⚠️ Sem chaves, não há conta — e o site não se parte
 *
 * É a mesma regra do `RESEND_API_KEY` nas encomendas: **uma funcionalidade que
 * depende de uma chave que não temos esconde-se, não avaria.** Sem
 * `AUTH_GOOGLE_ID` nem `AUTH_FACEBOOK_ID`, o botão de entrar não aparece, a
 * página da conta redirecciona para as encomendas, e o cesto e o pedido
 * continuam a funcionar exactamente como funcionavam antes — porque **a conta
 * nunca foi obrigatória para encomendar** e não pode passar a sê-lo.
 *
 * ## ⚠️ Isto lê-se no `build` e não a pedido
 *
 * As páginas são geradas estaticamente. `process.env` é lido quando o site é
 * construído, o que quer dizer que **ligar a conta obriga a um novo *deploy***.
 * É o preço de não ter renderização a pedido, e é um preço justo: as chaves não
 * mudam mais do que uma vez.
 */

const definida = (valor: string | undefined): boolean =>
  typeof valor === "string" && valor.trim().length > 0;

/** Os fornecedores de identidade que estão mesmo configurados. */
export type Fornecedor = "google" | "facebook";

export const FORNECEDORES: Fornecedor[] = [
  ...(definida(process.env.AUTH_GOOGLE_ID) &&
  definida(process.env.AUTH_GOOGLE_SECRET)
    ? (["google"] as const)
    : []),
  ...(definida(process.env.AUTH_FACEBOOK_ID) &&
  definida(process.env.AUTH_FACEBOOK_SECRET)
    ? (["facebook"] as const)
    : []),
];

/**
 * Há conta neste site?
 *
 * ⚠️ Exige **também** o `AUTH_SECRET`. Sem ele o `next-auth` não consegue
 * assinar a sessão, e o que se via era um botão de entrar que dava erro depois
 * de a pessoa já ter escolhido a conta do Google — o pior sítio possível para
 * falhar, porque nessa altura ela já confiou.
 */
export const CONTA_ATIVA =
  FORNECEDORES.length > 0 && definida(process.env.AUTH_SECRET);
