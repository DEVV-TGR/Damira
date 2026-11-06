import "server-only";
import { cookies, headers } from "next/headers";
import { entradaDoAmbiente } from "./escolher";
import type { FonteSessao, LojaDeCookies } from "./tipos";

/**
 * # A entrada no painel
 *
 * A página e as ações do painel só falam com isto. Do outro lado está a entrada
 * **verdadeira** quando há base de dados (`DATABASE_URL`), e a **provisória**
 * quando não há — quem escolhe é o `escolher.ts`. Ver `tipos.ts`.
 *
 * ⚠️ Os cookies só se escrevem em ações do servidor e em rotas, nunca ao
 * desenhar uma página: o `sessaoAtual` só lê, e é por isso que pode ser chamado
 * no `page.tsx`.
 */

const lojaDoNext = async (): Promise<LojaDeCookies> => {
  const loja = await cookies();
  return {
    get: (nome) => loja.get(nome)?.value,
    set: (nome, valor, opcoes) => loja.set(nome, valor, opcoes),
    delete: (nome) => loja.set(nome, "", { path: "/painel", maxAge: 0 }),
  };
};

export const sessao: FonteSessao = entradaDoAmbiente({
  ambiente: process.env,
  cookies: lojaDoNext,
  dispositivo: async () => (await headers()).get("user-agent"),
});
