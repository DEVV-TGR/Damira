import { tz } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import { EsquemaLinhaCesto, type ConfiguracaoDaCasa, type FonteDeDados } from "@/lib/dados/tipos";
import { vagas, validarLevantamento, type ArtigoDoCesto, type ConfiguracaoHorarios } from "@/lib/horarios";
import { esgotadoHoje } from "@/lib/painel";

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

/**
 * A afluência de uma vaga, em três degraus e mais um: `livre` (verde), `media`
 * (amarelo-laranja), `muita` (vermelho) e `cheia`. `null` quando a casa não tem
 * limite por vaga — sem limite, a percentagem não quer dizer nada, e o
 * calendário não pinta.
 */
export type Afluencia = "livre" | "media" | "muita" | "cheia";

/** Uma vaga como o browser a recebe: o instante em ISO e o resto já escrito. */
export type VagaDoCalendario = {
  inicio: string;
  data: string;
  hora: string;
  livre: boolean;
  afluencia: Afluencia | null;
};

/** Os degraus vêm da configuração da casa, e não daqui. */
export function afluenciaDe(
  ocupadas: number,
  livre: boolean,
  { limitePorVaga, limiaresAfluencia }: Pick<ConfiguracaoDaCasa, "limitePorVaga" | "limiaresAfluencia">,
): Afluencia | null {
  if (!livre) return "cheia";
  if (limitePorVaga === null || limitePorVaga <= 0) return null;
  const percentagem = (ocupadas / limitePorVaga) * 100;
  if (percentagem <= limiaresAfluencia.livre) return "livre";
  if (percentagem <= limiaresAfluencia.media) return "media";
  return "muita";
}

export type ResultadoVagas =
  /**
   * `aConfirmar`: falta o horário da cozinha ou o tempo de um produto (a casa
   * ainda não os deu, e o modo de teste está desligado), e não se sabe a que
   * horas o pedido fica pronto. As vagas são então **as horas em que a loja está
   * aberta, a partir de amanhã** — o calendário deixa escolher dia e hora, como
   * sempre, mas a hora é **pretendida** e confirma-se com a pessoa. Não se
   * inventa um prazo: diz-se que é para confirmar.
   */
  | { ok: true; vagas: VagaDoCalendario[]; aConfirmar: boolean }
  /* `cesto-invalido`: um artigo que não existe, abaixo do mínimo, fora de venda. */
  | { ok: false; motivo: "cesto-invalido" };

const LISBOA = { in: tz("Europe/Lisbon") };

type Preparado =
  | { ok: true; cesto: ArtigoDoCesto[]; config: ConfiguracaoHorarios; casa: ConfiguracaoDaCasa }
  | { ok: false; motivo: "indisponivel"; casa: ConfiguracaoDaCasa }
  | { ok: false; motivo: "cesto-invalido" };

/* O que é preciso para o motor fazer as contas: o cesto em tempos de produção,
   e a configuração com a cozinha preenchida. */
async function preparar(linhas: unknown, fonte: Fonte, agora: Date): Promise<Preparado> {
  const lidas = EsquemaLinhaCesto.array().min(1).max(50).safeParse(linhas);
  if (!lidas.success) return { ok: false, motivo: "cesto-invalido" };
  const cotado = await fonte.cotarCesto(lidas.data);
  if (!cotado.ok || !cotado.cotacao.valida) return { ok: false, motivo: "cesto-invalido" };

  const casa = await fonte.configuracaoDaCasa();
  if (casa.cozinha === null) return { ok: false, motivo: "indisponivel", casa };

  const cesto: ArtigoDoCesto[] = [];
  for (const linha of lidas.data) {
    const produto = await fonte.produtoPorId(linha.produtoId);
    if (!produto?.tempoProducao) return { ok: false, motivo: "indisponivel", casa };
    /* O «esgotado hoje» do balcão tira as vagas de hoje ao cesto inteiro — o
       mesmo que o `criarPedido` faz, para o calendário não oferecer o que o
       servidor vai recusar. */
    cesto.push({ tempo: produto.tempoProducao, esgotadoHoje: esgotadoHoje(produto, agora) });
  }
  return { ok: true, cesto, config: { ...casa, cozinha: casa.cozinha }, casa };
}

type Contexto = {
  cesto: ArtigoDoCesto[];
  config: ConfiguracaoHorarios;
  casa: ConfiguracaoDaCasa;
  /* O «agora» a partir do qual se contam as vagas: o verdadeiro, ou o começo de
     amanhã quando a hora é a confirmar. */
  desde: Date;
  aConfirmar: boolean;
};

/* Com os dados da cozinha, o cesto e a configuração tal como são. Sem eles, um
   cesto vazio sobre o horário da **loja**, a contar de amanhã: o motor devolve as
   horas em que a loja abre, e nenhuma promessa sobre quando o pedido fica pronto.
   Começa amanhã e não hoje — sem saber quanto demora o que está no cesto,
   oferecer o próprio dia era prometer o que a cozinha talvez não consiga. */
async function contexto(linhas: unknown, fonte: Fonte, agora: Date): Promise<Contexto | null> {
  const preparado = await preparar(linhas, fonte, agora);
  if (preparado.ok) return { ...preparado, desde: agora, aConfirmar: false };
  if (preparado.motivo === "cesto-invalido") return null;
  const casa = preparado.casa;
  return {
    cesto: [],
    config: { ...casa, cozinha: casa.loja },
    casa,
    desde: startOfDay(addDays(agora, 1, LISBOA), LISBOA),
    aConfirmar: true,
  };
}

export async function vagasDoCesto(linhas: unknown, fonte: Fonte, agora: Date): Promise<ResultadoVagas> {
  const c = await contexto(linhas, fonte, agora);
  if (!c) return { ok: false, motivo: "cesto-invalido" };

  /* Um dia a mais do que o calendário mostra: a ocupação conta instantes, e o
     último dia tem vagas até ao fecho. */
  const ocupadas = await fonte.ocupacao(c.desde, addDays(c.desde, c.config.diasAFrente + 1));
  return {
    ok: true,
    aConfirmar: c.aConfirmar,
    vagas: vagas(c.cesto, c.desde, c.config, ocupadas).map((vaga) => ({
      /* ⚠️ Em UTC, com `Z`. O `toISOString()` de um `TZDate` escreve `+01:00`
         — o mesmo instante, outro texto —, e este valor vai ao browser e volta
         quando se escolhe a vaga: tem de ter uma forma só. */
      inicio: new Date(vaga.inicio.getTime()).toISOString(),
      data: vaga.data,
      hora: vaga.hora,
      livre: vaga.livre,
      /* Uma vaga com pedidos mostra-se mais cheia **depois** de lá estar o
         pedido — o «1» de quem acabou de marcar conta. */
      afluencia: afluenciaDe(vaga.ocupadas, vaga.livre, c.casa),
    })),
  };
}

/**
 * A hora escolhida, confirmada no servidor ao enviar. É o mesmo cálculo do
 * calendário (`validarLevantamento`), de propósito: o que o browser mostrou é o
 * que o servidor aceita, e o calendário é uma ajuda e não uma garantia
 * (`pedidos.md` › O levantamento). Diz também se a hora é a confirmar.
 */
export async function confirmarLevantamento(
  linhas: unknown,
  levantamento: Date,
  fonte: Fonte,
  agora: Date,
): Promise<{ ok: true; aConfirmar: boolean } | { ok: false; motivo: "indisponivel" | "cesto-invalido" | "vaga-cheia" }> {
  const c = await contexto(linhas, fonte, agora);
  if (!c) return { ok: false, motivo: "cesto-invalido" };
  const ocupadas = await fonte.ocupacao(levantamento, levantamento);
  const validado = validarLevantamento(c.cesto, levantamento, c.desde, c.config, ocupadas);
  return validado.ok ? { ok: true, aConfirmar: c.aConfirmar } : validado;
}
