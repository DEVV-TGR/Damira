import { addDays } from "date-fns";
import { EsquemaLinhaCesto, type FonteDeDados } from "@/lib/dados/tipos";
import { vagas, validarLevantamento, type ArtigoDoCesto, type ConfiguracaoHorarios } from "@/lib/horarios";

/**
 * # As vagas de levantamento de um cesto, calculadas no servidor
 *
 * O calendário do browser **não sabe** o horário da casa nem quanto demora
 * cada produto: pergunta aqui, com as linhas do cesto (ids e quantidades), e
 * recebe as vagas já com a data e a hora de Lisboa escritas.
 *
 * ⚠️ **Nada de horários nem prazos escritos no código.** O horário da cozinha e
 * da loja, os dias fechados e o tempo de cada produto vêm de `@/lib/dados` —
 * hoje dos JSON (com os de exemplo, no modo de teste), amanhã da base de dados,
 * editados pela gerente no painel. Quem faz as contas é o motor de horários
 * (`src/lib/horarios.ts`); isto só junta as peças.
 *
 * ⚠️ **Nunca em cache** (`robustez.md`): a ocupação lê-se a cada pedido. Uma vaga
 * em cache é uma vaga vendida duas vezes.
 *
 * Recebe a fonte e o `agora` por argumento — é isso que deixa testá-lo.
 */

type Fonte = Pick<FonteDeDados, "cotarCesto" | "produtoPorId" | "configuracaoDaCasa" | "ocupacao">;

/** Uma vaga como o browser a recebe: o instante em ISO e o resto já escrito. */
export type VagaDoCalendario = {
  inicio: string;
  data: string;
  hora: string;
  livre: boolean;
};

export type ResultadoVagas =
  | { ok: true; vagas: VagaDoCalendario[] }
  /* `indisponivel`: falta o horário da cozinha ou o tempo de um produto — o
     calendário diz que ainda não está disponível, nunca inventa um prazo.
     `cesto-invalido`: um artigo que não existe, abaixo do mínimo, sem preço. */
  | { ok: false; motivo: "indisponivel" | "cesto-invalido" };

type Preparado =
  | { ok: true; cesto: ArtigoDoCesto[]; config: ConfiguracaoHorarios }
  | { ok: false; motivo: "indisponivel" | "cesto-invalido" };

/* O que é preciso para o motor fazer as contas: o cesto em tempos de produção,
   e a configuração com a cozinha preenchida. */
async function preparar(linhas: unknown, fonte: Fonte): Promise<Preparado> {
  const lidas = EsquemaLinhaCesto.array().min(1).max(50).safeParse(linhas);
  if (!lidas.success) return { ok: false, motivo: "cesto-invalido" };
  const cotado = await fonte.cotarCesto(lidas.data);
  if (!cotado.ok || !cotado.cotacao.valida) return { ok: false, motivo: "cesto-invalido" };

  const casa = await fonte.configuracaoDaCasa();
  if (casa.cozinha === null) return { ok: false, motivo: "indisponivel" };

  const cesto: ArtigoDoCesto[] = [];
  for (const linha of lidas.data) {
    const produto = await fonte.produtoPorId(linha.produtoId);
    if (!produto?.tempoProducao) return { ok: false, motivo: "indisponivel" };
    cesto.push({ tempo: produto.tempoProducao });
  }
  return { ok: true, cesto, config: { ...casa, cozinha: casa.cozinha } };
}

export async function vagasDoCesto(linhas: unknown, fonte: Fonte, agora: Date): Promise<ResultadoVagas> {
  const preparado = await preparar(linhas, fonte);
  if (!preparado.ok) return preparado;

  const { cesto, config } = preparado;
  /* Um dia a mais do que o calendário mostra: a ocupação conta instantes, e o
     último dia tem vagas até ao fecho. */
  const ocupadas = await fonte.ocupacao(agora, addDays(agora, config.diasAFrente + 1));
  return {
    ok: true,
    vagas: vagas(cesto, agora, config, ocupadas).map((vaga) => ({
      /* ⚠️ Em UTC, com `Z`. O `toISOString()` de um `TZDate` escreve `+01:00`
         — o mesmo instante, outro texto —, e este valor vai ao browser e volta
         quando se escolhe a vaga: tem de ter uma forma só. */
      inicio: new Date(vaga.inicio.getTime()).toISOString(),
      data: vaga.data,
      hora: vaga.hora,
      livre: vaga.livre,
    })),
  };
}

/**
 * A hora escolhida, confirmada no servidor ao enviar. É o mesmo cálculo do
 * calendário (`validarLevantamento`), de propósito: o que o browser mostrou é o
 * que o servidor aceita, e o calendário é uma ajuda e não uma garantia
 * (`pedidos.md` › O levantamento).
 */
export async function confirmarLevantamento(
  linhas: unknown,
  levantamento: Date,
  fonte: Fonte,
  agora: Date,
): Promise<{ ok: true } | { ok: false; motivo: "indisponivel" | "cesto-invalido" | "vaga-cheia" }> {
  const preparado = await preparar(linhas, fonte);
  if (!preparado.ok) return preparado;
  const ocupadas = await fonte.ocupacao(levantamento, levantamento);
  return validarLevantamento(preparado.cesto, levantamento, agora, preparado.config, ocupadas);
}
