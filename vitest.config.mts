import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /* Só os nossos. As skills em `.agents/` são de terceiros e trazem os seus
       próprios ficheiros — não é aqui que se testam. */
    include: ["src/**/*.test.ts"],
    /* ⚠️ Os testes correm num fuso que **não é** Lisboa nem UTC. A Vercel está
       em UTC e esta máquina em Lisboa; nos dois, um `getHours()` esquecido dá a
       hora certa metade do ano e o teste passa. Em Kiritimati (UTC+14) qualquer
       fuga da hora local para o cálculo muda o dia, e rebenta logo. */
    env: { TZ: "Pacific/Kiritimati" },
  },
});
