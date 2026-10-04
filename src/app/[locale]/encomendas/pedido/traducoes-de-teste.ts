import mensagens from "../../../../../messages/pt.json";

/**
 * As traduções portuguesas verdadeiras, para os testes das ações simularem o
 * `next-intl/server`: um texto que falte rebenta aqui, como rebentaria na
 * página. Aceita o espaço de nomes como texto ou como `{ namespace }`.
 */
const procurar = (caminho: string): unknown =>
  caminho.split(".").reduce<unknown>((no, chave) => (no as Record<string, unknown>)?.[chave], mensagens);

export const nextIntlDeTeste = {
  getLocale: async () => "pt",
  getTranslations: async (arg: string | { namespace: string }) => {
    const espaco = typeof arg === "string" ? arg : arg.namespace;
    return (chave: string, valores: Record<string, unknown> = {}) => {
      const texto = procurar(`${espaco}.${chave}`);
      if (typeof texto !== "string") throw new Error(`tradução em falta: ${espaco}.${chave}`);
      return Object.entries(valores).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, String(v)), texto);
    };
  },
};
