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
       `skills-lock.json`). Não é código nosso e não se lhe aplica o nosso estilo.

       O `public/scrollcraft/` entra pela mesma razão e com um motivo a mais: é
       o motor da página inicial, servido de `public/` precisamente para poder
       ficar **byte a byte igual** ao da skill. Um aviso de estilo sobre ele não
       é accionável — corrigi-lo era editá-lo, e editá-lo é o que a skill
       proíbe. Ver `src/components/cartaz/Motor.tsx`. */
    ignores: [
      ".agents/**",
      ".claude/**",
      ".next/**",
      "node_modules/**",
      "public/scrollcraft/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
