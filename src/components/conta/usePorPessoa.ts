"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useConta } from "./ProvedorConta";

/**
 * # Uma lista guardada no browser, por pessoa
 *
 * O cesto e o histórico de pedidos precisam exactamente do mesmo: uma lista no
 * `localStorage`, numa chave que muda quando alguém entra ou sai da conta, lida
 * depois da hidratação e migrada quando a pessoa se autentica.
 *
 * ⚠️ **Estava escrito duas vezes e é lógica com três armadilhas** — a ordem dos
 * efeitos, a adopção do que era anónimo, e a leitura fora do corpo do efeito.
 * Duas cópias de uma coisa assim são uma que fica para trás na primeira
 * correção, e o sintoma é sempre o mesmo: uma pessoa perde o que tinha, sem
 * erro nenhum no ecrã.
 */
export function usePorPessoa<T>({
  chaveDe,
  normalizar,
}: {
  chaveDe: (idUtilizador?: string | null) => string;
  normalizar: (bruto: unknown) => T[];
}): {
  valor: T[];
  definir: Dispatch<SetStateAction<T[]>>;
  pronto: boolean;
} {
  const [valor, definir] = useState<T[]>([]);
  const [pronto, setPronto] = useState(false);

  const { utilizador } = useConta();
  const chave = chaveDe(utilizador?.id);

  /**
   * ⚠️ **A que chave é que o `valor` que está em memória pertence.**
   *
   * Sem isto, o efeito que escreve corria uma vez com a chave nova e o valor
   * antigo — os dois efeitos correm no mesmo *commit* e o que escreve ainda vê o
   * estado de antes. Ao entrar na conta, o cesto anónimo era escrito por cima do
   * cesto da pessoa antes de ele sequer ser lido.
   */
  const chaveEmMemoria = useRef<string | null>(null);

  useEffect(() => {
    /** Lê uma chave sem nunca atirar. */
    const ler = (k: string): T[] => {
      try {
        const guardado = window.localStorage.getItem(k);
        return guardado ? normalizar(JSON.parse(guardado)) : [];
      } catch {
        /* Armazenamento cheio, navegação privada em Safari antigo, ou JSON
           partido. Nenhum destes é motivo para a página não abrir. */
        return [];
      }
    };

    /* ⚠️ **A leitura não corre no corpo do efeito.** Escrever estado aí em cima
       dispara uma cascata de renderizações e o `react-hooks` recusa-o. Um quadro
       à frente resolve, e de caminho garante que a primeira pintura é igual à do
       servidor — sem isso o React desfazia a página inteira. */
    const quadro = requestAnimationFrame(() => {
      const seu = ler(chave);
      const anonima = chaveDe(null);

      /* ⚠️ **Ao entrar na conta, o que era anónimo vem com a pessoa.**
         Quem enche o cesto e só depois entra — que é a ordem natural, porque a
         conta serve para não escrever o nome outra vez no fim — encontrava tudo
         vazio a seguir a autenticar-se. Perder o que se tinha no momento exacto
         em que se ganha a conta é a pior troca que este site podia fazer. */
      if (chave !== anonima && seu.length === 0) {
        const herdado = ler(anonima);
        if (herdado.length > 0) {
          definir(herdado);
          try {
            window.localStorage.removeItem(anonima);
          } catch {
            /* Não conseguir limpar deixa uma cópia, não parte nada. */
          }
          chaveEmMemoria.current = chave;
          setPronto(true);
          return;
        }
      }

      definir(seu);
      chaveEmMemoria.current = chave;
      setPronto(true);
    });
    return () => cancelAnimationFrame(quadro);
    /* `normalizar` fica de fora de propósito: é uma função pura declarada no
       módulo de quem chama, e pô-la aqui obrigava toda a gente a envolvê-la num
       `useCallback` para o efeito não correr a cada renderização. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, chaveDe]);

  useEffect(() => {
    if (!pronto) return;
    /* Ver `chaveEmMemoria`: enquanto o valor em memória for de outra chave, não
       se escreve nada. */
    if (chaveEmMemoria.current !== chave) return;
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* Não conseguir guardar é pior experiência, não é avaria. */
    }
  }, [valor, pronto, chave]);

  return { valor, definir, pronto };
}
