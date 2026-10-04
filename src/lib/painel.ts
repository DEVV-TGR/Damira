import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { ConfiguracaoDaCasa, Produto } from "@/lib/dados/tipos";
import { FUSO } from "@/lib/horarios";

/**
 * # As contas do painel que não precisam de dados
 *
 * Funções puras, fora da fronteira: recebem o que precisam por argumento e não
 * leem nem a base de dados nem o relógio. Ficam aqui, e não na `FonteDeDados`,
 * para a implementação sobre a base de dados (#31) não as ter de repetir.
 */

const EM_LISBOA = { in: tz(FUSO) };
const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;

/** O dia de Lisboa de um instante, como `"2026-10-04"`. Nunca o de UTC. */
export const diaDeLisboa = (instante: Date): string => format(instante, "yyyy-MM-dd", EM_LISBOA);

/**
 * Se o produto está esgotado **hoje**. Um `esgotadoNoDia` de ontem já não vale:
 * é isso que o faz voltar sozinho, sem ninguém o repor.
 */
export const esgotadoHoje = (produto: Pick<Produto, "esgotadoNoDia">, agora: Date): boolean =>
  produto.esgotadoNoDia === diaDeLisboa(agora);

/**
 * «62 sem foto · 95 sem alergénios · 40 sem tempo de produção»
 * (`painel-gerente.md` › Por preencher). Os arquivados não contam: já não são
 * trabalho de ninguém. Os alergénios contam por `null`, e nunca por lista
 * vazia — `[]` é «sem alergénios», respondido de propósito.
 */
export function contarPorPreencher(produtos: readonly Produto[]) {
  const ativos = produtos.filter((produto) => !produto.arquivado);
  const semFoto = ativos.filter((produto) => produto.fotos.length === 0);
  const semAlergenios = ativos.filter((produto) => produto.alergenios === null);
  const semTempo = ativos.filter((produto) => produto.tempoProducao === null);
  return {
    semFoto: semFoto.length,
    semAlergenios: semAlergenios.length,
    semTempo: semTempo.length,
    /** Os ids de quem falta alguma coisa, pela ordem do catálogo. */
    produtos: ativos
      .filter((p) => p.fotos.length === 0 || p.alergenios === null || p.tempoProducao === null)
      .map((p) => p.id),
  };
}

export const OPCOES_PAUSA = ["30min", "1h", "ate-amanha"] as const;
export type OpcaoPausa = (typeof OPCOES_PAUSA)[number];

/* Um ano chega para passar umas férias compridas; uma loja sem nenhum dia
   aberto não pode pôr o servidor num ciclo sem fim. */
const HORIZONTE_DIAS = 400;

/**
 * Até quando fica a loja em pausa, para cada botão do balcão
 * (`painel-balcao.md` › Pausar a loja). «Até amanhã» acaba **à abertura da loja
 * no próximo dia em que ela abre**, em hora de Lisboa — num sábado com o
 * domingo fechado, é segunda de manhã. `null` se a loja não abrir mais.
 */
export function fimDaPausa(
  opcao: OpcaoPausa,
  agora: Date,
  casa: Pick<ConfiguracaoDaCasa, "loja" | "diasFechados">,
): Date | null {
  if (opcao === "30min") return new Date(agora.getTime() + 30 * 60_000);
  if (opcao === "1h") return new Date(agora.getTime() + 60 * 60_000);

  for (let i = 1; i <= HORIZONTE_DIAS; i++) {
    /* Os dias somam-se no fuso, nunca de 24 em 24 horas: no 25/10 o dia tem 25. */
    const dia = addDays(agora, i, EM_LISBOA);
    const data = diaDeLisboa(dia);
    const fechada = casa.diasFechados.some((d) => d.data === data && d.fecha !== "cozinha");
    const periodos = casa.loja[DIAS[getDay(dia, EM_LISBOA)]];
    if (fechada || periodos.length === 0) continue;
    const [ano, mes, numDia] = data.split("-").map(Number);
    const [h, m] = periodos[0].abre.split(":").map(Number);
    return new Date(new TZDate(ano, mes - 1, numDia, h, m, FUSO).getTime());
  }
  return null;
}
