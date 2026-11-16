/**
 * A forma dos textos legais: secções com parágrafos e listas, e mais nada.
 *
 * ## Porque são ficheiros de dados e não JSX
 *
 * A advogada e a casa vão pedir mudanças de uma palavra. Num ficheiro só de
 * texto, cada mudança é uma linha de diff que se lê sem saber React.
 *
 * Só em português: é o texto que a advogada aprova, e uma tradução nossa seria
 * um segundo texto legal que ninguém aprovou. A `/en` diz isso por cima.
 */

export type Bloco = string | { lista: string[] };

export type Subseccao = {
  titulo: string;
  /** Escrita por nós, e não pela casa: é o que a advogada tem de rever com mais cuidado. */
  nossa?: boolean;
  blocos: Bloco[];
};

export type Seccao = Subseccao & {
  /** A âncora da secção, para o índice e para ligações de fora (`/privacidade#cookies`). */
  id: string;
  subseccoes?: Subseccao[];
};
