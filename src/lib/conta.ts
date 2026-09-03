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
 * # Como é que a conta funciona nesta instalação
 *
 * Duas hipóteses, e nunca as duas ao mesmo tempo:
 *
 * - **`fornecedores`** — há `AUTH_SECRET` e pelo menos um par de chaves. Entra-se
 *   com o Google ou o Facebook a sério, e a sessão é um JWT assinado num cookie;
 * - **`demonstracao`** — não há chaves. A conta existe na mesma, **só no
 *   browser**: escreve-se um nome e um email, e fica guardado no `localStorage`
 *   como o cesto e o histórico.
 *
 * ## ⚠️ Porque é que a demonstração existe, e porque é que não é uma mentira
 *
 * Porque **o cliente tem de ver a funcionalidade**, e criar um projeto no Google
 * Cloud e outro no Facebook Developers para mostrar um ecrã numa reunião é
 * trabalho e é uma conta em nome de alguém. Antes disto, a instalação sem
 * chaves — que é a que está no ar — escondia a conta por inteiro: ninguém via o
 * botão, o histórico não tinha onde aparecer, e a funcionalidade não existia
 * para quem a devia avaliar.
 *
 * O que a impede de ser uma mentira é **dizer o que é, no sítio onde alguém
 * escreve os seus dados**. A página de entrada, em demonstração, diz que não há
 * registo nem palavra-passe e que aquilo fica só neste browser. Um ecrã de
 * entrada que finge autenticar e não avisa é outra coisa — e essa não se faz.
 *
 * ## ⚠️ E é um bloqueador de lançamento
 *
 * No dia em que o site for para o ar a sério, ou entram chaves e o modo passa a
 * `fornecedores`, **ou a conta sai**. Publicar uma pastelaria com um ecrã de
 * entrada que não autentica ninguém é pior do que não ter conta nenhuma. Está na
 * lista do README e na #3.
 */
export type ModoConta = "fornecedores" | "demonstracao";

export const MODO_CONTA: ModoConta =
  FORNECEDORES.length > 0 && definida(process.env.AUTH_SECRET)
    ? "fornecedores"
    : "demonstracao";

/**
 * A conta existe sempre — o que muda é o modo.
 *
 * ⚠️ **Isto era `false` sem chaves e passou a ser sempre `true`.** Fica com o
 * nome que tinha porque é o que os componentes perguntam, mas quem precisa de
 * saber *qual* dos dois modos usa o `MODO_CONTA`.
 */
export const CONTA_ATIVA = true;
