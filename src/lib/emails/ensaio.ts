import { z } from "zod";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";

/** O rótulo Preview/local não identifica a base: conferir o servidor antes da primeira consulta. */
export function validarEnsaioDaFila(argumentos: string[], ambiente: Ambiente): { servidor: string; base: string } | null {
  if (!argumentos.includes("--enviar")) return null;
  const prefixo = "--servidor-desenvolvimento=";
  if (!argumentos.includes("--desenvolvimento") || ambiente.VERCEL_ENV === "production" ||
    argumentos.some(a => !["--enviar", "--desenvolvimento"].includes(a) && !a.startsWith(prefixo))) {
    throw new Error("ensaio-so-no-desenvolvimento");
  }
  if (!emModoDeTeste(ambiente)) throw new Error("ensaio-exige-modo-de-teste");
  const servidores = argumentos.filter(a => a.startsWith(prefixo)).map(a => a.slice(prefixo.length));
  if (servidores.length !== 1 || !/^[a-z0-9.-]+\.neon\.tech$/.test(servidores[0])) throw new Error("confirmar-servidor-desenvolvimento");
  if (!ambiente.RESEND_API_KEY?.trim()) throw new Error("sem-chave-resend");
  if (!z.email().safeParse(ambiente.EMAILS_SO_PARA?.trim()).success) throw new Error("sem-destino-seguro");
  let endereco: URL;
  try { endereco = new URL(ambiente.DATABASE_URL ?? ""); }
  catch { throw new Error("endereco-da-base-invalido"); }
  if (!["postgres:", "postgresql:"].includes(endereco.protocol) || endereco.hostname !== servidores[0]) {
    throw new Error("servidor-diferente-do-desenvolvimento-confirmado");
  }
  return { servidor: endereco.hostname, base: endereco.pathname.slice(1) };
}
