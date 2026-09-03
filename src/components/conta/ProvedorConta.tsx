"use client";

import { createContext, useContext, useMemo } from "react";
import { SessionProvider, useSession } from "next-auth/react";

/**
 * # A conta, do lado do cliente
 *
 * ## ⚠️ Porque não se usa o `useSession` directamente em lado nenhum
 *
 * Porque **o `useSession` atira** quando não há `SessionProvider` por cima, e
 * neste site pode mesmo não haver: sem chaves do Google nem do Facebook, a
 * conta não existe e o provedor não é montado (ver `conta.ts`). Um `useSession`
 * espalhado por cinco componentes dava cinco ecrãs brancos numa instalação sem
 * chaves — e a instalação sem chaves é a que está no ar hoje.
 *
 * Este contexto é a camada que absorve isso: responde sempre, com `ativa: false`
 * quando não há conta nenhuma configurada. Quem o usa não tem de saber de nada
 * disto.
 *
 * ## ⚠️ E é o cliente que vai buscar a sessão, não o servidor
 *
 * De propósito. Ler a sessão no servidor obrigava **todas as páginas** a passar
 * de estáticas a dinâmicas, porque quem lê cookies não pode ser gerado no
 * `build`. Trocávamos a página inicial inteira — que é um cartaz com rolagem
 * conduzida e vive de ser servida instantaneamente — por um nome no canto
 * superior direito. O nome aparece um instante depois; a página aparece já.
 */
export type Utilizador = {
  id: string | null;
  nome: string | null;
  email: string | null;
  imagem: string | null;
};

type Conta = {
  /** Há conta neste site? `false` quando não há chaves configuradas. */
  ativa: boolean;
  /** `null` enquanto carrega e quando ninguém entrou. */
  utilizador: Utilizador | null;
  /** `true` enquanto a sessão está a ser lida — para não piscar o botão. */
  aCarregar: boolean;
};

const SEM_CONTA: Conta = { ativa: false, utilizador: null, aCarregar: false };

const ContextoConta = createContext<Conta>(SEM_CONTA);

/** Nunca atira e nunca devolve `undefined`. É esse o ponto. */
export const useConta = (): Conta => useContext(ContextoConta);

export function ProvedorConta({
  ativa,
  children,
}: {
  ativa: boolean;
  children: React.ReactNode;
}) {
  if (!ativa) {
    return (
      <ContextoConta.Provider value={SEM_CONTA}>
        {children}
      </ContextoConta.Provider>
    );
  }

  return (
    <SessionProvider>
      <Ponte>{children}</Ponte>
    </SessionProvider>
  );
}

/**
 * A tradução do que o `next-auth` devolve para o que o site usa.
 *
 * Fica num componente à parte porque o `useSession` **tem** de estar dentro do
 * `SessionProvider`, e o `ProvedorConta` é justamente quem decide se ele existe.
 */
function Ponte({ children }: { children: React.ReactNode }) {
  const { data: sessao, status } = useSession();

  const valor = useMemo<Conta>(
    () => ({
      ativa: true,
      aCarregar: status === "loading",
      utilizador: sessao?.user
        ? {
            id: sessao.user.id ?? null,
            nome: sessao.user.name ?? null,
            email: sessao.user.email ?? null,
            imagem: sessao.user.image ?? null,
          }
        : null,
    }),
    [sessao, status],
  );

  return (
    <ContextoConta.Provider value={valor}>{children}</ContextoConta.Provider>
  );
}
