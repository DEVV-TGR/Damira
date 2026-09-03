"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import type { ModoConta } from "@/lib/conta";

/**
 * # A conta, do lado do cliente
 *
 * ## ⚠️ Porque não se usa o `useSession` directamente em lado nenhum
 *
 * Porque **o `useSession` atira** quando não há `SessionProvider` por cima, e
 * neste site pode mesmo não haver: sem chaves do Google nem do Facebook a conta
 * corre em **modo de demonstração**, que não monta o `next-auth`. Um `useSession`
 * espalhado por cinco componentes dava cinco ecrãs brancos nessa instalação — e
 * é a instalação que está no ar.
 *
 * Este contexto é a camada que absorve isso: responde sempre, com o mesmo feitio
 * nos dois modos. Quem o usa não tem de saber de nada disto.
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
  /** A conta existe sempre; o que muda é como. Ver `conta.ts`. */
  modo: ModoConta;
  /** `null` enquanto carrega e quando ninguém entrou. */
  utilizador: Utilizador | null;
  /** `true` enquanto a sessão está a ser lida — para não piscar o botão. */
  aCarregar: boolean;
  /**
   * Entrar em modo de demonstração. **Só existe nesse modo** — com chaves a
   * entrada é do fornecedor e passa pelo `signIn` do `next-auth`.
   */
  entrarEmDemonstracao: ((nome: string, email: string) => void) | null;
  sair: () => void;
};

const VAZIO: Conta = {
  modo: "demonstracao",
  utilizador: null,
  aCarregar: true,
  entrarEmDemonstracao: null,
  sair: () => {},
};

const ContextoConta = createContext<Conta>(VAZIO);

/** Nunca atira e nunca devolve `undefined`. É esse o ponto. */
export const useConta = (): Conta => useContext(ContextoConta);

/**
 * Onde a conta de demonstração vive.
 *
 * ⚠️ **Uma chave própria e não a do `next-auth`.** Se um dia entrarem chaves a
 * sério, a conta de demonstração que estiver guardada nos browsers das pessoas
 * fica onde está, ignorada, em vez de se misturar com uma sessão verdadeira.
 */
const CHAVE_DEMONSTRACAO = "damira:conta-demonstracao";

export function ProvedorConta({
  modo,
  children,
}: {
  modo: ModoConta;
  children: React.ReactNode;
}) {
  if (modo === "fornecedores") {
    return (
      <SessionProvider>
        <PonteFornecedores>{children}</PonteFornecedores>
      </SessionProvider>
    );
  }
  return <PonteDemonstracao>{children}</PonteDemonstracao>;
}

/**
 * A tradução do que o `next-auth` devolve para o que o site usa.
 *
 * Fica num componente à parte porque o `useSession` **tem** de estar dentro do
 * `SessionProvider`, e o `ProvedorConta` é justamente quem decide se ele existe.
 */
function PonteFornecedores({ children }: { children: React.ReactNode }) {
  const { data: sessao, status } = useSession();

  const valor = useMemo<Conta>(
    () => ({
      modo: "fornecedores",
      aCarregar: status === "loading",
      entrarEmDemonstracao: null,
      sair: () => void signOut({ callbackUrl: "/" }),
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

/**
 * A conta de demonstração: um nome e um email guardados neste browser.
 *
 * ⚠️ **Não há palavra-passe, não há registo e não há verificação de nada.** É
 * uma demonstração e a página de entrada di-lo com todas as letras — ver
 * `conta.ts` para a razão de isto existir e para o facto de ser um bloqueador de
 * lançamento.
 */
function PonteDemonstracao({ children }: { children: React.ReactNode }) {
  const [utilizador, setUtilizador] = useState<Utilizador | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    /* ⚠️ Um quadro à frente, como o cesto: ler `localStorage` durante a
       renderização dava marcação diferente no servidor e no cliente, e o React
       desfaz a página inteira quando isso acontece. */
    const quadro = requestAnimationFrame(() => {
      try {
        const guardado = window.localStorage.getItem(CHAVE_DEMONSTRACAO);
        if (guardado) {
          const lido: unknown = JSON.parse(guardado);
          if (lido && typeof lido === "object" && "id" in lido) {
            setUtilizador(lido as Utilizador);
          }
        }
      } catch {
        /* Navegação privada, armazenamento cheio, ou JSON partido. Nenhum
           destes é motivo para a página não abrir. */
      }
      setACarregar(false);
    });
    return () => cancelAnimationFrame(quadro);
  }, []);

  const entrarEmDemonstracao = useCallback((nome: string, email: string) => {
    /* ⚠️ **O identificador sai do email e não é aleatório.** É o que faz a mesma
       pessoa, ao voltar a entrar depois de sair, reencontrar o seu cesto e o seu
       histórico — que estão guardados numa chave com este id. Um id novo a cada
       entrada dava uma conta nova de cada vez, e o histórico parecia apagar-se
       sozinho. */
    const id = `demo-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const novo: Utilizador = {
      id,
      nome: nome.trim(),
      email: email.trim(),
      imagem: null,
    };
    try {
      window.localStorage.setItem(CHAVE_DEMONSTRACAO, JSON.stringify(novo));
    } catch {
      /* Não conseguir guardar deixa a sessão só nesta página, não é avaria. */
    }
    setUtilizador(novo);
  }, []);

  const sair = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_DEMONSTRACAO);
    } catch {
      /* Ver acima. */
    }
    setUtilizador(null);
    /* ⚠️ **Não se apaga o cesto nem o histórico da pessoa.** Estão guardados na
       chave dela e ficam lá para quando voltar a entrar — que é o que qualquer
       loja faz, e o contrário seria castigar alguém por ter carregado em sair. */
  }, []);

  const valor = useMemo<Conta>(
    () => ({
      modo: "demonstracao",
      utilizador,
      aCarregar,
      entrarEmDemonstracao,
      sair,
    }),
    [utilizador, aCarregar, entrarEmDemonstracao, sair],
  );

  return (
    <ContextoConta.Provider value={valor}>{children}</ContextoConta.Provider>
  );
}
