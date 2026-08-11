import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * `eslint-config-next` 16 já exporta *flat config* nativo. A receita antiga, com
 * `FlatCompat` a traduzir o formato `.eslintrc`, rebenta com esta versão
 * ("Converting circular structure to JSON") — se aparecer esse erro, é sinal de
 * que alguém voltou a pôr o `FlatCompat` aqui.
 */
const eslintConfig = [
  {
    /* As skills são material de terceiros copiado para dentro do projeto (ver
       `skills-lock.json`). Não é código nosso e não se lhe aplica o nosso estilo. */
    ignores: [".agents/**", ".claude/**", ".next/**", "node_modules/**"],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
