/* O pacote `server-only` rebenta assim que é importado fora do servidor React —
   que é o que o torna útil no `build`, e o que impedia os testes de importar
   `src/lib/dados/`. O `vitest.config.mts` troca-o por este ficheiro vazio. */
export {};
