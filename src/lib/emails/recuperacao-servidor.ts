import "server-only";
import { baseDaNeon } from "@/lib/dados/bd-neon";
import { haEmailsDefinitivamenteFalhados } from "@/lib/dados/bd-emails";
import { enviarEmailsPendentes } from "./enviar";
import { recuperarEmailsAutomaticamente, type ResumoRecuperacao } from "./recuperacao";

/** A rota só importa este módulo depois de autenticar e conferir o ambiente. */
export async function recuperarEmailsDoAmbiente(agora: Date): Promise<ResumoRecuperacao> {
  const resumo = await recuperarEmailsAutomaticamente(agora, { enviar: enviarEmailsPendentes });
  if (resumo.paragem !== "sem-trabalho") return resumo;
  const { db } = baseDaNeon(process.env.DATABASE_URL!);
  // Zero elegíveis não significa que tudo saiu: não dar verde enquanto há falhas
  // definitivas. A consulta aplica o filtro antes do limite, sem expor dados pessoais.
  return await haEmailsDefinitivamenteFalhados(db, new Date())
    ? { ...resumo, paragem: "intervencao-necessaria" } : resumo;
}
