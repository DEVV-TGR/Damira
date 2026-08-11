import type { ZodError } from "zod";

/**
 * Transforma os erros do `zod` em linhas que dizem **qual é o artigo**, e não só
 * qual é o índice do array.
 *
 * O `z.prettifyError` escreve `→ at [17].preco`, e num ficheiro de 122 objetos
 * editado à mão isso obriga a contar chavetas. A mensagem que interessa a quem
 * está a corrigir é `"São Julião" → preco`, e o índice fica lá na mesma para
 * quem quiser saltar direto à linha.
 *
 * Usa `nome` quando existe, `id` quando não — chega para as duas formas de
 * ficheiro que temos (a ementa e os restaurantes).
 */
export function erroDeFicheiro(
  ficheiro: string,
  erro: ZodError,
  dados: unknown,
): Error {
  const registos = Array.isArray(dados) ? dados : null;

  const linhas = erro.issues.map((problema) => {
    const [primeiro, ...resto] = problema.path;
    const indice = typeof primeiro === "number" ? primeiro : null;

    const registo =
      indice !== null && registos
        ? (registos[indice] as { nome?: string; id?: string } | undefined)
        : null;
    const etiqueta = registo?.nome ?? registo?.id;

    const onde =
      indice === null
        ? problema.path.join(".")
        : `[${indice}]${etiqueta ? ` "${etiqueta}"` : ""}${
            resto.length > 0 ? ` → ${resto.join(".")}` : ""
          }`;

    return `  ✖ ${onde}: ${problema.message}`;
  });

  return new Error(`${ficheiro} inválido:\n${linhas.join("\n")}`);
}
