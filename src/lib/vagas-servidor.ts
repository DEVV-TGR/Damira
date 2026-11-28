import { TZDate, tz } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import type { ConfiguracaoDaCasa, FonteDeDados, Produto, ResultadoCotacao } from "@/lib/dados/tipos";
import { diasSemEncomendaNoCalendario, vagas, validarLevantamento, type ArtigoDoCesto, type ConfiguracaoHorarios } from "@/lib/horarios";
import { artigosParaHorarios } from "@/lib/dados/artigos-horarios";
import { nomeDe } from "@/lib/vista";
import type { Locale } from "@/i18n/routing";

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

export type DiaSemEncomendaDoCalendario = { data: string; produtos: string[] };

export type ResultadoVagas =
  /**
   * `aConfirmar`: falta o horário da cozinha ou o tempo de um produto (a casa
   * ainda não os deu, e o modo de teste está desligado), e não se sabe a que
   * horas o pedido fica pronto. As vagas são então **as horas em que a loja está
   * aberta, a partir de amanhã** — o calendário deixa escolher dia e hora, como
   * sempre, mas a hora é **pretendida** e confirma-se com a pessoa. Não se
   * inventa um prazo: diz-se que é para confirmar.
   */
  | { ok: true; vagas: VagaDoCalendario[]; diasSemEncomenda: DiaSemEncomendaDoCalendario[]; aConfirmar: boolean }
  /* `cesto-invalido`: um artigo que não existe, abaixo do mínimo, fora de venda. */
  | { ok: false; motivo: "cesto-invalido" };

export type ConsultaCompra = {
  cotacao: ResultadoCotacao;
  vagas: ResultadoVagas;
};

const LISBOA = { in: tz("Europe/Lisbon") };

type Contexto = {
  produtos: Produto[];
  cesto: ArtigoDoCesto[];
  config: ConfiguracaoHorarios;
  casa: ConfiguracaoDaCasa;
  /* O «agora» a partir do qual se contam as vagas: o verdadeiro, ou o começo de
     amanhã quando a hora é a confirmar. */
  desde: Date;
  aConfirmar: boolean;
  semJanela: boolean;
};

/* Sem produção preenchida não se promete um prazo: só as horas da loja a
   partir de amanhã. Os bloqueios dos produtos continuam a valer nesse caminho. */
async function contexto(cotado: ResultadoCotacao, fonte: Fonte, agora: Date): Promise<Contexto | null> {
  // Só as linhas validadas pela cotação entram no motor de horários.
  if (!cotado.ok || !cotado.cotacao.valida || cotado.cotacao.linhas.length === 0) return null;
  const produtos = await Promise.all(cotado.cotacao.linhas.map(linha => fonte.produtoPorId(linha.produtoId)));
  if (!produtos.every(produto => produto !== null)) return null;
  const casa = await fonte.configuracaoDaCasa();
  const comTempos = casa.cozinha !== null && produtos.every(p => p.tempoProducao !== null);
  // O motor conta a partir de amanhã no percurso a confirmar: «esgotado hoje» já acabou.
  return {
    produtos,
    cesto: artigosParaHorarios(produtos, agora, comTempos).map(artigo => ({ ...artigo, esgotadoHoje: comTempos && artigo.esgotadoHoje })),
    config: { ...casa, cozinha: comTempos ? casa.cozinha! : casa.loja, diasAFrente: comTempos ? casa.diasAFrente : Math.max(0, casa.diasAFrente - 1) },
    casa,
    desde: comTempos ? agora : startOfDay(addDays(agora, 1, LISBOA), LISBOA),
    aConfirmar: !comTempos,
    semJanela: !comTempos && casa.diasAFrente === 0,
  };
}

export async function vagasDoCesto(linhas: unknown, fonte: Fonte, agora: Date, locale: Locale = "pt"): Promise<ResultadoVagas> {
  return (await consultarCompraDoCesto(linhas, fonte, agora, locale)).vagas;
}

/** A mesma cotação alimenta o resumo e valida as linhas do calendário. */
export async function consultarCompraDoCesto(linhas: unknown, fonte: Fonte, agora: Date, locale: Locale = "pt"): Promise<ConsultaCompra> {
  const cotacao = await fonte.cotarCesto(linhas);
  return { cotacao, vagas: await vagasDaCotacao(cotacao, fonte, agora, locale) };
}

async function vagasDaCotacao(cotacao: ResultadoCotacao, fonte: Fonte, agora: Date, locale: Locale): Promise<ResultadoVagas> {
  const c = await contexto(cotacao, fonte, agora);
  if (!c) return { ok: false, motivo: "cesto-invalido" };

  if (c.semJanela) return { ok: true, aConfirmar: true, vagas: [], diasSemEncomenda: [] };

  /* Um dia a mais do que o calendário mostra: a ocupação conta instantes, e o
     último dia tem vagas até ao fecho. */
  const ocupadas = await fonte.ocupacao(c.desde, addDays(c.desde, c.config.diasAFrente + 1));
  return {
    ok: true,
    aConfirmar: c.aConfirmar,
    diasSemEncomenda: diasSemEncomendaNoCalendario(c.cesto, c.desde, c.config).map(d => ({
      data: d.data, produtos: [...new Set(d.artigos.map(i => nomeDe(c.produtos[i], locale)))],
    })),
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
 * As horas da loja num dia, para a gerente **mudar o levantamento** de um pedido
 * (`pedidos.md`). É o calendário com o horário da loja no lugar do da cozinha:
 * a gerente sabe se a cozinha consegue; o que o ecrã não deixa é escolher uma
 * hora fechada, passada ou cheia — e o servidor confirma outra vez ao gravar.
 */
export async function horasDaLoja(
  data: string,
  fonte: Pick<FonteDeDados, "configuracaoDaCasa" | "ocupacao">,
  agora: Date,
): Promise<{ inicio: string; hora: string; livre: boolean }[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return [];
  const [ano, mes, dia] = data.split("-").map(Number);
  const inicioDoDia = new Date(Date.UTC(ano, mes - 1, dia) - 14 * 3_600_000);
  const fimDoDia = new Date(Date.UTC(ano, mes - 1, dia) + 38 * 3_600_000);
  const casa = await fonte.configuracaoDaCasa();
  /* Até esse dia, por longe que seja: quem muda a data é a gerente, não o
     cliente, e o «dias à frente» do calendário não se lhe aplica. */
  const diasAte = Math.max(0, Math.ceil((fimDoDia.getTime() - agora.getTime()) / 86_400_000));
  const config = { ...casa, cozinha: casa.loja, diasAFrente: diasAte };
  const ocupadas = await fonte.ocupacao(inicioDoDia, fimDoDia);
  return vagas([], agora, config, ocupadas)
    .filter((v) => v.data === data)
    .map((v) => ({ inicio: new Date(v.inicio.getTime()).toISOString(), hora: v.hora, livre: v.livre }));
}

export type HorasParaPedido = {
  horas: Awaited<ReturnType<typeof horasDaLoja>>;
  produtosBloqueados: string[];
};

/** Aviso, sem veto: a gerente conhece a cozinha e pode combinar este dia. */
export async function horasParaPedido(
  data: string,
  produtosIds: readonly string[],
  fonte: Pick<FonteDeDados, "configuracaoDaCasa" | "ocupacao" | "listarProdutos">,
  agora: Date,
): Promise<HorasParaPedido> {
  const horas = await horasDaLoja(data, fonte, agora);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { horas, produtosBloqueados: [] };
  const ids = new Set(produtosIds);
  const produtos = (await fonte.listarProdutos({ incluirArquivados: true })).filter(p => ids.has(p.id));
  const [ano, mes, dia] = data.split("-").map(Number);
  const nesseDia = new TZDate(ano, mes - 1, dia, "Europe/Lisbon");
  const bloqueios = diasSemEncomendaNoCalendario(artigosParaHorarios(produtos, agora, false), nesseDia, { diasAFrente: 0 });
  return { horas, produtosBloqueados: [...new Set((bloqueios[0]?.artigos ?? []).map(i => produtos[i].nome.pt))] };
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
  const c = await contexto(await fonte.cotarCesto(linhas), fonte, agora);
  if (!c) return { ok: false, motivo: "cesto-invalido" };
  if (c.semJanela) return { ok: false, motivo: "indisponivel" };
  const ocupadas = await fonte.ocupacao(levantamento, levantamento);
  const validado = validarLevantamento(c.cesto, levantamento, c.desde, c.config, ocupadas);
  return validado.ok ? { ok: true, aConfirmar: c.aConfirmar } : validado;
}
