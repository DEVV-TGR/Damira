"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import {
  MAXIMO_GUARDADO,
  chaveDoHistorico,
  normalizarHistorico,
  type PedidoGuardado,
} from "@/lib/historico";
import { usePorPessoa } from "@/components/conta/usePorPessoa";

type Contexto = {
  pedidos: PedidoGuardado[];
  /** `true` só depois de o histórico ter sido lido do armazenamento local. */
  pronto: boolean;
  guardar: (pedido: PedidoGuardado) => void;
  apagar: (referencia: string) => void;
  limpar: () => void;
};

const HistoricoContexto = createContext<Contexto | null>(null);

/**
 * O histórico de pedidos deste browser.
 *
 * A mecânica é a mesma do cesto e vive no `usePorPessoa`. O que é próprio daqui
 * são duas regras:
 *
 * 1. **o mais recente primeiro**, porque a pergunta é sempre «o que é que eu
 *    pedi da última vez» e nunca «o que é que eu pedi há dois anos»;
 * 2. **um tecto de vinte**, para o histórico não encher o armazenamento e deixar
 *    o cesto sem espaço para gravar — ver `historico.ts`.
 *
 * ⚠️ Isto **não é o histórico da casa**, são os pedidos feitos neste browser. A
 * interface tem de o dizer, e diz. A ressalva inteira está no `historico.ts`.
 */
export function ProvedorHistorico({ children }: { children: React.ReactNode }) {
  const { valor: pedidos, definir, pronto } = usePorPessoa({
    chaveDe: chaveDoHistorico,
    normalizar: normalizarHistorico,
  });

  const guardar = useCallback(
    (pedido: PedidoGuardado) => {
      definir((actual) => {
        /* ⚠️ **Pela referência e não pelo fim da lista.** O React chama a acção
           duas vezes em desenvolvimento com o modo estrito, e sem esta guarda o
           mesmo pedido aparecia duas vezes no histórico — só em `next dev`, o
           que é a pior maneira de descobrir um erro destes. */
        if (actual.some((p) => p.referencia === pedido.referencia)) return actual;
        return [pedido, ...actual].slice(0, MAXIMO_GUARDADO);
      });
    },
    [definir],
  );

  const apagar = useCallback(
    (referencia: string) =>
      definir((actual) => actual.filter((p) => p.referencia !== referencia)),
    [definir],
  );

  const limpar = useCallback(() => definir([]), [definir]);

  const valor = useMemo(
    () => ({ pedidos, pronto, guardar, apagar, limpar }),
    [pedidos, pronto, guardar, apagar, limpar],
  );

  return (
    <HistoricoContexto.Provider value={valor}>
      {children}
    </HistoricoContexto.Provider>
  );
}

/**
 * ⚠️ Devolve `null` fora do provedor em vez de atirar — mesma razão do
 * `useCesto`: quem chama esconde-se em vez de partir a página.
 */
export const useHistorico = (): Contexto | null => useContext(HistoricoContexto);
