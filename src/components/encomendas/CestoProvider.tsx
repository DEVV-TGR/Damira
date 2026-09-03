"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  chaveDoCesto,
  normalizarCesto,
  proximaQuantidade,
  type ItemCesto,
} from "@/lib/cesto";
import { useConta } from "@/components/conta/ProvedorConta";

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

/** Lê uma chave do armazenamento local sem nunca atirar. */
function ler(chave: string): ItemCesto[] {
  try {
    const guardado = window.localStorage.getItem(chave);
    return guardado ? normalizarCesto(JSON.parse(guardado)) : [];
  } catch {
    /* Armazenamento cheio, navegação privada em Safari antigo, ou JSON
       partido. Nenhum destes é motivo para a página não abrir. */
    return [];
  }
}

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
  const [cesto, setCesto] = useState<ItemCesto[]>([]);
  const [pronto, setPronto] = useState(false);

  const { utilizador } = useConta();
  const chave = chaveDoCesto(utilizador?.id);

  /**
   * ⚠️ **A que chave é que o `cesto` que está em memória pertence.**
   *
   * Sem isto, o efeito que escreve corria uma vez com a chave nova e o cesto
   * antigo — porque os dois efeitos correm no mesmo *commit* e o que escreve
   * ainda vê o estado de antes. Resultado: ao entrar na conta, o cesto anónimo
   * era escrito por cima do cesto da pessoa antes de ele sequer ser lido.
   */
  const chaveEmMemoria = useRef<string | null>(null);

  useEffect(() => {
    /* ⚠️ **A leitura não corre no corpo do efeito.** Escrever estado aí em cima
       dispara uma cascata de renderizações e o `react-hooks` recusa-o. Um quadro
       à frente resolve, e de caminho garante que a primeira pintura é igual à do
       servidor. */
    const quadro = requestAnimationFrame(() => {
      const seu = ler(chave);
      const anonima = chaveDoCesto(null);

      /* ⚠️ **Ao entrar na conta, o cesto anónimo vem com a pessoa.**
         Quem enche o cesto e só depois entra — que é a ordem natural, porque a
         conta serve para não escrever o nome outra vez no fim — encontrava o
         cesto vazio a seguir a autenticar-se. Perder a escolha no momento exacto
         em que se ganha a conta é a pior troca que este site podia fazer. */
      if (chave !== anonima && seu.length === 0) {
        const herdado = ler(anonima);
        if (herdado.length > 0) {
          setCesto(herdado);
          try {
            window.localStorage.removeItem(anonima);
          } catch {
            /* Ver `ler`. Não conseguir limpar deixa uma cópia, não parte nada. */
          }
          chaveEmMemoria.current = chave;
          setPronto(true);
          return;
        }
      }

      setCesto(seu);
      chaveEmMemoria.current = chave;
      setPronto(true);
    });
    return () => cancelAnimationFrame(quadro);
  }, [chave]);

  useEffect(() => {
    if (!pronto) return;
    /* Ver `chaveEmMemoria`: enquanto o cesto em memória for de outra chave, não
       se escreve nada. */
    if (chaveEmMemoria.current !== chave) return;
    try {
      window.localStorage.setItem(chave, JSON.stringify(cesto));
    } catch {
      /* Não conseguir guardar é pior experiência, não é avaria. */
    }
  }, [cesto, pronto, chave]);

  const juntar = useCallback((item: Omit<ItemCesto, "quantidade">) => {
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
          i.id === item.id
            ? { ...i, quantidade: proximaQuantidade(i, 1) }
            : i,
        );
      }
      /* ⚠️ **Entra no mínimo e não em um.** É a regra que separa a encomenda da
         ida ao balcão: quem junta pastéis de nata junta uma dúzia. */
      return [...actual, { ...item, quantidade: item.minimo }];
    });
  }, []);

  const mudarQuantidade = useCallback((id: string, delta: number) => {
    setCesto((actual) =>
      actual
        .map((i) =>
          i.id === id ? { ...i, quantidade: proximaQuantidade(i, delta) } : i,
        )
        /* Descer abaixo do mínimo tira a linha. Um artigo com meia dúzia quando
           o mínimo é uma dúzia é uma pergunta para quem recebe o pedido. */
        .filter((i) => i.quantidade >= i.minimo),
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
