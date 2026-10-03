"use server";

import { configuracaoDaCasa, cotarCesto, ocupacao, produtoPorId } from "@/lib/dados";
import { vagasDoCesto, type ResultadoVagas } from "@/lib/vagas-servidor";

/**
 * As vagas de levantamento para o cesto que o browser tem. Recebe ids e
 * quantidades — nunca preços nem tempos — e o `agora` lê-se aqui, no servidor,
 * que é a ponta do sistema: daqui para dentro entra por argumento.
 */
export async function consultarVagas(linhas: unknown): Promise<ResultadoVagas> {
  return vagasDoCesto(linhas, { configuracaoDaCasa, cotarCesto, ocupacao, produtoPorId }, new Date());
}
