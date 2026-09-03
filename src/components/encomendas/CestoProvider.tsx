"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import {
  chaveDoCesto,
  normalizarCesto,
  proximaQuantidade,
  type ItemCesto,
} from "@/lib/cesto";
import { usePorPessoa } from "@/components/conta/usePorPessoa";

type Contexto = {
  cesto: ItemCesto[];
  /** `true` só depois de o cesto ter sido lido do armazenamento local. */
  pronto: boolean;
  juntar: (item: Omit<ItemCesto, "quantidade">) => void;
  /** Substitui o cesto inteiro. É o que o botão de repetir um pedido usa. */
  repor: (itens: ItemCesto[]) => void;
  mudarQuantidade: (id: string, delta: number) => void;
  remover: (id: string) => void;
  esvaziar: () => void;
};

const CestoContexto = createContext<Contexto | null>(null);

/**
 * O cesto, e onde ele vive.
 *
 * ## Porque `localStorage` e não um cookie ou o servidor
 *
 * Porque o cesto **não sai deste browser**. O pedido só existe quando alguém
 * carrega em enviar. Um cookie mandava isto em cada pedido de rede sem razão
 * nenhuma, e uma tabela no servidor era infraestrutura para guardar uma intenção
 * que ainda não é um compromisso.
 *
 * ⚠️ **Entrar com o Google não muda isto.** A sessão dá-nos um nome e um email
 * para preencher o pedido; não dá uma base de dados. O cesto continua neste
 * browser, e quem entrar no computador do trabalho não encontra lá o que
 * escolheu no telemóvel. É uma limitação real, está escrita no README, e a
 * alternativa — guardar cestos no servidor — é âmbito que ninguém orçamentou.
 *
 * O que a sessão muda é **de quem é o cesto**: a chave passa a ter o
 * identificador da pessoa, para dois utilizadores do mesmo telemóvel não
 * partilharem a escolha. Ver `chaveDoCesto`.
 *
 * ## ⚠️ A leitura acontece **depois** da primeira renderização, e tem de ser
 *
 * O servidor não tem `localStorage`. Ler o cesto durante a renderização dava
 * marcação diferente no servidor e no cliente, e o React desfaz a página inteira
 * quando isso acontece.
 *
 * Por isso há um `pronto`: até ele ser `true`, o cesto está vazio para toda a
 * gente e a interface não mostra nem barra nem contagem. São uns milissegundos,
 * e é a diferença entre uma página que hidrata e uma página que pisca.
 */
export function CestoProvider({ children }: { children: React.ReactNode }) {
  /* Toda a mecânica de ler, escrever e migrar entre chaves vive no
     `usePorPessoa`, que o histórico usa da mesma maneira. Ver lá as três
     armadilhas. */
  const { valor: cesto, definir: setCesto, pronto } = usePorPessoa({
    chaveDe: chaveDoCesto,
    normalizar: normalizarCesto,
  });

  const juntar = useCallback(
    (item: Omit<ItemCesto, "quantidade">) => {
      setCesto((actual) => {
        const existente = actual.find((i) => i.id === item.id);
        /* Juntar duas vezes o mesmo kit soma a quantidade em vez de criar uma
           segunda linha igual: duas linhas «Kit Médio, 40 pessoas» num pedido
           obrigam quem o lê a somar de cabeça.
           ⚠️ **E sobe um passo, não uma unidade.** Num artigo à dúzia, o segundo
           toque leva de 12 a 18 e não a 13 — uma dúzia e um pastel não é uma
           encomenda que a casa saiba fazer. */
        if (existente) {
          return actual.map((i) =>
            i.id === item.id ? { ...i, quantidade: proximaQuantidade(i, 1) } : i,
          );
        }
        /* ⚠️ **Entra no mínimo e não em um.** É a regra que separa a encomenda da
           ida ao balcão: quem junta pastéis de nata junta uma dúzia. */
        return [...actual, { ...item, quantidade: item.minimo }];
      });
    },
    [setCesto],
  );

  /**
   * Põe uma lista inteira no cesto de uma vez.
   *
   * É o que o botão de repetir um pedido antigo usa. ⚠️ **Substitui e não
   * soma**: repetir por cima de um cesto que já tinha coisas dava um pedido que
   * não é nem o antigo nem o novo, e ninguém percebia de onde veio o terceiro
   * artigo. Quem chama avisa antes.
   */
  const repor = useCallback(
    (itens: ItemCesto[]) => setCesto(itens),
    [setCesto],
  );

  const mudarQuantidade = useCallback(
    (id: string, delta: number) => {
      setCesto((actual) =>
        actual
          .map((i) =>
            i.id === id ? { ...i, quantidade: proximaQuantidade(i, delta) } : i,
          )
          /* Descer abaixo do mínimo tira a linha. Um artigo com meia dúzia quando
             o mínimo é uma dúzia é uma pergunta para quem recebe o pedido. */
          .filter((i) => i.quantidade >= i.minimo),
      );
    },
    [setCesto],
  );

  const remover = useCallback(
    (id: string) => setCesto((actual) => actual.filter((i) => i.id !== id)),
    [setCesto],
  );

  const esvaziar = useCallback(() => setCesto([]), [setCesto]);

  const valor = useMemo(
    () => ({ cesto, pronto, juntar, repor, mudarQuantidade, remover, esvaziar }),
    [cesto, pronto, juntar, repor, mudarQuantidade, remover, esvaziar],
  );

  return (
    <CestoContexto.Provider value={valor}>{children}</CestoContexto.Provider>
  );
}

/**
 * ⚠️ Devolve `null` fora do provedor em vez de atirar.
 *
 * O botão de juntar aparece em cartões que também podem ser renderizados noutro
 * sítio; um `throw` aqui transformava uma reutilização inocente num ecrã branco.
 * Sem provedor, quem chama esconde-se — que é o comportamento certo, porque sem
 * cesto não há nada para juntar.
 */
export const useCesto = (): Contexto | null => useContext(CestoContexto);
