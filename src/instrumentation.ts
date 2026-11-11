import { captureRequestError } from "@sentry/nextjs";

export async function register() {
  /* Este ficheiro compila-se também para o edge, que não tem tudo o que o servidor
     usa. Nada do site corre no edge: o `src/proxy.ts` corre em Node. */
  if (process.env.NEXT_RUNTIME === "nodejs") await import("@/lib/sentry-servidor");
}

export const onRequestError = captureRequestError;
