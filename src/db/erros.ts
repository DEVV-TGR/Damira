/**
 * O código e a regra de um erro do Postgres. Vem como causa do erro do Drizzle,
 * ou como o próprio erro, conforme o driver.
 *
 * ⚠️ **Para os logs, é isto e nunca a `message`**: a mensagem de um erro do Drizzle
 * traz os parâmetros da consulta, e neles pode ir o email de um cliente
 * (`robustez.md` › Logs).
 */
export const erroDoPostgres = (erro: unknown): { code?: string; constraint?: string } =>
  ((erro as { cause?: unknown }).cause ?? erro) as { code?: string; constraint?: string };

/** Violou esta regra de unicidade (no Postgres, o 23505). */
export const violouChave = (erro: unknown, restricao: string): boolean => {
  const { code, constraint } = erroDoPostgres(erro);
  return code === "23505" && constraint === restricao;
};
