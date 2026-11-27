import "server-only";
import * as dados from "@/lib/dados";
import { casa } from "@/data/casa";
import { caminhoDaProposta } from "@/lib/proposta";
import { URL_SITE } from "@/lib/site";
import { executarEmissor, type OpcoesEmissor, type ResumoEmissor } from "./executar";

/** Reutilizável pelas ações e, na etapa 2, pelos despertadores. Não consulta a base sem ser chamado. */
export async function enviarEmailsPendentes(opcoes: OpcoesEmissor): Promise<ResumoEmissor> {
  return executarEmissor(opcoes, {
    fonte: dados, ambiente: process.env,
    casa: { nome: casa.nome, morada: casa.morada, localidade: casa.cidade, telefone: casa.telefone ?? "", email: casa.email },
    /* O mesmo link que o painel mostra à gerente (`linkDaProposta`, em `acoes-gestao.ts`). Sem a
       `PROPOSTA_SEGREDO`, o `caminhoDaProposta` lança, e a proposta fica nos falhados.
       ⚠️ O endereço é o `URL_SITE`: sem `NEXT_PUBLIC_SITE_URL` na Vercel, o botão leva ao
       domínio de demonstração. */
    linkDaProposta: (referencia, versao) => `${URL_SITE}${caminhoDaProposta(referencia, versao)}`,
  });
}
