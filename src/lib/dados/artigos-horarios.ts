import type { ArtigoDoCesto } from "@/lib/horarios";
import { esgotadoHoje } from "@/lib/painel";
import type { Produto } from "./tipos";

/** Só o próprio produto da linha: um kit não herda os bloqueios do que leva. */
export function artigosParaHorarios(
  produtos: readonly Produto[],
  agora: Date,
  comTempos = true,
): ArtigoDoCesto[] {
  return produtos.map(produto => ({
    tempo: comTempos && produto.tempoProducao ? produto.tempoProducao : { unidade: "horas", valor: 0 },
    esgotadoHoje: esgotadoHoje(produto, agora),
    diasSemEncomenda: produto.diasSemEncomenda,
  }));
}
