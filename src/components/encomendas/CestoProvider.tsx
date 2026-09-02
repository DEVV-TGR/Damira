"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CHAVE_CESTO, type ItemCesto } from "@/lib/cesto";

type Contexto = {
  cesto: ItemCesto[];
  /** `true` só depois de o cesto ter sido lido do armazenamento local. */
  pronto: boolean;
  juntar: (item: Omit<ItemCesto, "quantidade">) => void;
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
 * Porque o cesto **não sai deste browser**. Não há conta, não há sessão e não há
 * nada no servidor à espera dele: o pedido só existe quando alguém carrega em
 * enviar. Um cookie mandava isto em cada pedido de rede sem razão nenhuma, e uma
 * tabela no servidor era infraestrutura para guardar uma intenção que ainda não
 * é um compromisso.
 *
 * O efeito lateral bom: quem escolhe três kits, fecha o telemóvel e volta no dia
 * seguinte encontra a escolha onde a deixou.
 *
 * ## ⚠️ A leitura acontece **depois** da primeira renderização, e tem de ser
 *
 * O servidor não tem `localStorage`. Ler o cesto durante a renderização dava
 * marcação diferente no servidor e no cliente, e o React desfaz a página inteira
 * quando isso acontece — é o mesmo tipo de estrago que o `rootMargin` em `rem`
 * fez na ementa.
 *
 * Por isso há um `pronto`: até ele ser `true`, o cesto está vazio para toda a
 * gente e a interface não mostra nem barra nem contagem. São uns milissegundos,
 * e é a diferença entre uma página que hidrata e uma página que pisca.
 */
export function CestoProvider({ children }: { children: React.ReactNode }) {
  const [cesto, setCesto] = useState<ItemCesto[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    /* ⚠️ **A leitura não corre no corpo do efeito.** Escrever estado aí em cima
       dispara uma cascata de renderizações e o `react-hooks` recusa-o — é a
       mesma regra que apanhou o fólio do cartaz. Um quadro à frente resolve, e
       de caminho garante que a primeira pintura é igual à do servidor. */
    const quadro = requestAnimationFrame(() => {
      try {
        const guardado = window.localStorage.getItem(CHAVE_CESTO);
        if (guardado) {
          const lido: unknown = JSON.parse(guardado);
          /* ⚠️ O que está no armazenamento local foi escrito por uma **versão
             anterior deste site**, e pode não ter a forma que o código de hoje
             espera. Um `JSON.parse` que devolve outra coisa rebentava a página
             com um erro que ninguém consegue reproduzir. Se não for uma lista, é
             lixo: começa-se vazio. */
          if (Array.isArray(lido)) setCesto(lido as ItemCesto[]);
        }
      } catch {
        /* Armazenamento cheio, navegação privada em Safari antigo, ou JSON
           partido. Nenhum destes é motivo para a página não abrir. */
      }
      setPronto(true);
    });
    return () => cancelAnimationFrame(quadro);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(CHAVE_CESTO, JSON.stringify(cesto));
    } catch {
      /* Ver acima. Não conseguir guardar é pior experiência, não é avaria. */
    }
  }, [cesto, pronto]);

  const juntar = useCallback((item: Omit<ItemCesto, "quantidade">) => {
    setCesto((actual) => {
      const existente = actual.find((i) => i.id === item.id);
      /* Juntar duas vezes o mesmo kit soma a quantidade em vez de criar uma
         segunda linha igual: duas linhas «Kit Médio, 40 pessoas» num pedido
         obrigam quem o lê a somar de cabeça. */
      if (existente) {
        return actual.map((i) =>
          i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...actual, { ...item, quantidade: 1 }];
    });
  }, []);

  const mudarQuantidade = useCallback((id: string, delta: number) => {
    setCesto((actual) =>
      actual
        .map((i) =>
          i.id === id ? { ...i, quantidade: i.quantidade + delta } : i,
        )
        /* Chegar a zero tira a linha. Um artigo com quantidade zero num pedido
           é uma pergunta para quem o recebe. */
        .filter((i) => i.quantidade > 0),
    );
  }, []);

  const remover = useCallback((id: string) => {
    setCesto((actual) => actual.filter((i) => i.id !== id));
  }, []);

  const esvaziar = useCallback(() => setCesto([]), []);

  const valor = useMemo(
    () => ({ cesto, pronto, juntar, mudarQuantidade, remover, esvaziar }),
    [cesto, pronto, juntar, mudarQuantidade, remover, esvaziar],
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
