import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      /* O mesmo `@/` do `tsconfig.json`, que o Vitest não lê sozinho. */
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    /* ⚠️ Os testes correm num fuso que **não é** Lisboa nem UTC. A Vercel está
       em UTC e esta máquina em Lisboa; nos dois, um `getHours()` esquecido dá a
       hora certa metade do ano e o teste passa. Em Kiritimati (UTC+14) qualquer
       fuga da hora local para o cálculo muda o dia, e rebenta logo. */
    env: { TZ: "Pacific/Kiritimati" },
    /* Duas voltas. A primeira é a de sempre: tudo, contra a fonte dos JSON. A
       segunda corre os testes do contrato contra a fonte da base de dados, num
       PGlite (`src/lib/dados/fontes-de-teste.ts`): é a prova de que trocar a
       fonte no `index.ts` não muda nada para as páginas (#29, #31). */
    projects: [
      /* Só os nossos. As skills em `.agents/` são de terceiros e trazem os
         seus próprios ficheiros — não é aqui que se testam. ⚠️ O `include`
         vive em cada volta e não em cima: com `extends`, o Vitest junta as
         listas em vez de as trocar, e a volta «bd» corria tudo. */
      { extends: true, test: { name: "json", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "bd",
          include: ["src/lib/dados/dados.test.ts", "src/lib/dados/painel.test.ts"],
          env: { TZ: "Pacific/Kiritimati", FONTE_DOS_TESTES: "bd" },
        },
      },
    ],
  },
});
