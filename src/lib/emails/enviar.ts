import "server-only";
import * as dados from "@/lib/dados";
import { casa } from "@/data/casa";
import { executarEmissor, type OpcoesEmissor, type ResumoEmissor } from "./executar";

/** Reutilizável pelas ações e, na etapa 2, pelos despertadores. Não consulta a base sem ser chamado. */
export async function enviarEmailsPendentes(opcoes: OpcoesEmissor): Promise<ResumoEmissor> {
  return executarEmissor(opcoes, {
    fonte: dados, ambiente: process.env,
    casa: { nome: casa.nome, morada: casa.morada, localidade: casa.cidade, telefone: casa.telefone ?? "", email: casa.email },
  });
}
