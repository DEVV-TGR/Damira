import "server-only";
import { cookies } from "next/headers";
import { criarSessaoProvisoria } from "./provisoria";
import type { FonteSessao, LojaDeCookies } from "./tipos";

/**
 * # A entrada no painel
 *
 * A página e as ações do painel só falam com isto. Hoje do outro lado está a
 * entrada provisória; a verdadeira, sobre a base de dados, entra aqui na #33 —
 * **é a única linha que muda**. Ver `tipos.ts`.
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

export const sessao: FonteSessao = criarSessaoProvisoria({ ambiente: process.env, cookies: lojaDoNext });
