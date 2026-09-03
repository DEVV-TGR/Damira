import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { FORNECEDORES } from "./conta";

/**
 * # Entrar com o Google ou o Facebook
 *
 * ## ⚠️ Não há base de dados, e é uma decisão e não uma falta
 *
 * A sessão é um **JWT assinado num cookie**, que é o que o `next-auth` faz
 * quando não lhe damos um adaptador. Não há tabela de utilizadores, não há
 * tabela de sessões, e não há nada nosso a guardar quem entrou.
 *
 * Porquê: a conta, neste site, serve para **três coisas pequenas** — dizer o
 * nome a quem volta, preencher o pedido sem o obrigar a escrever o nome e o
 * email outra vez, e manter o cesto separado por pessoa no mesmo dispositivo.
 * Nenhuma das três precisa de saber o que essa pessoa fez da última vez.
 *
 * O que **ficaria** por fazer no dia em que a casa quiser histórico de
 * encomendas: aí é preciso guardar as encomendas em algum lado, e aí entra uma
 * base de dados a sério com um adaptador. Está escrito no README, e é uma
 * conversa de âmbito e de custo — não é uma linha de código.
 *
 * ## ⚠️ A conta nunca é obrigatória para encomendar
 *
 * É a regra que não se negoceia. Quem não quiser entrar encomenda na mesma, com
 * o mesmo formulário e o mesmo resultado: obrigar uma pessoa a criar conta para
 * pedir um bolo de anos numa pastelaria de bairro é pôr um balcão à frente da
 * porta. A conta é uma comodidade para quem volta, e mais nada.
 *
 * ## O que se guarda da pessoa
 *
 * O nome, o email e a fotografia que o fornecedor devolve — o mínimo do
 * `profile` padrão. **Não pedimos `scopes` nenhuns além disso**: nem contactos,
 * nem calendário, nem publicar seja o que for. Cada permissão a mais é um ecrã
 * de consentimento mais assustador, e a taxa de quem desiste sobe com ele.
 */
const fornecedores: NextAuthConfig["providers"] = [
  ...(FORNECEDORES.includes("google")
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          /* `consent` só na primeira vez; nas seguintes o Google entra directo.
             Pedir consentimento a cada visita é o que faz uma pessoa desconfiar
             de um site que já usou. */
          authorization: {
            params: { prompt: "select_account", access_type: "online" },
          },
        }),
      ]
    : []),
  ...(FORNECEDORES.includes("facebook")
    ? [
        Facebook({
          clientId: process.env.AUTH_FACEBOOK_ID,
          clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: fornecedores,
  /* ⚠️ Sem isto, o `next-auth` recusa-se a funcionar atrás do proxy da Vercel:
     o `Host` que chega não é o que ele espera e a devolução do Google morre com
     um erro de `UntrustedHost`. */
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    /* A página de entrada é nossa e não a do `next-auth`. A dele é funcional e
       é cinzenta; esta tem a marca da casa e diz porque é que vale a pena. */
    signIn: "/entrar",
    error: "/entrar",
  },
  callbacks: {
    /**
     * ⚠️ **O `sub` do token vai para a sessão, e é isso que separa os cestos.**
     *
     * Sem um identificador estável, duas pessoas que usem o mesmo telemóvel
     * partilhavam o cesto — e a segunda encontrava o bolo da primeira já lá
     * dentro. Ver `chaveDoCesto` em `cesto.ts`.
     */
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
