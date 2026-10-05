import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";

/**
 * # O motor de horários — quando se pode levantar um pedido
 *
 * As regras estão em `docs/loja/horarios.md`; isto é a tradução delas. Quando
 * uma muda, mudam as duas no mesmo PR.
 *
 * ## ⚠️ Funções puras, e é isso que as torna úteis
 *
 * Tudo entra por argumento — a configuração, as vagas ocupadas e o instante
 * `agora` — e nada se lê de fora: nem a base de dados, nem o relógio. É por
 * isso que **a mesma função corre no calendário do browser e na validação do
 * servidor**: duas implementações iam discordar no primeiro caso difícil, e o
 * cliente escolhia uma vaga que o servidor recusava. E é por isso que se testa.
 *
 * ## ⚠️ Tudo em hora de Lisboa, pela biblioteca de fusos
 *
 * A Vercel está em UTC, e de novembro a março Lisboa também — um `getHours()`
 * esquecido dá a hora certa durante meses e erra uma hora a partir de 28 de
 * março. Aqui não há leituras da hora local: os dias e as horas do relógio da
 * loja constroem-se com `TZDate` em `Europe/Lisbon`, e os dias somam-se com o
 * `addDays` do `date-fns` no mesmo fuso — nunca a somar 24 horas, porque há
 * dois domingos por ano que não as têm. Há um teste que lê esta fonte e recusa
 * o que leria o relógio ou a hora local.
 *
 * Os instantes devolvidos são `TZDate` de Lisboa: `getHours()` *neles* dá a
 * hora da loja. ⚠️ E o `toISOString()` deles escreve o desvio de Lisboa
 * (`2026-10-06T11:00:00.000+01:00`) e não um `Z`: é o mesmo instante, e o
 * Postgres guarda-o certo num `timestamptz`, mas **não é o mesmo texto** — quem
 * comparar instantes compara `getTime()`, nunca as strings. As vagas trazem
 * ainda `data` e `hora` já escritas, porque o calendário mostra **sempre** a
 * hora de Lisboa, também em inglês — um cliente em Londres que vê «10:00» na
 * hora dele chega uma hora antes de o bolo estar pronto.
 */

export const FUSO = "Europe/Lisbon";
const EM_LISBOA = { in: tz(FUSO) };

/* As mesmas chaves do `casa.json`, para a migração para a base de dados não ter
   de traduzir nomes de dias. Por ordem do `getDay`, que começa ao domingo. */
const DIAS_DA_SEMANA = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;

export type DiaDaSemana = (typeof DIAS_DA_SEMANA)[number];

/** Um período aberto, em hora de Lisboa: `"08:00"` a `"18:00"`. */
export type Intervalo = { abre: string; fecha: string };

/**
 * O horário de uma semana. Uma **lista** por dia e não um só intervalo, porque
 * uma cozinha que pára ao almoço não produz das 12h às 14h — e um dia com a
 * lista vazia é um dia fechado.
 */
export type HorarioSemanal = Record<DiaDaSemana, readonly Intervalo[]>;

/**
 * Um feriado ou férias. ⚠️ Fechar um dia **não cancela** os pedidos que já
 * existem para ele (ver `horarios.md`) — isto só decide o que o calendário
 * mostra daqui para a frente.
 */
export type DiaFechado = {
  /** `"2026-12-25"`, dia de Lisboa. */
  data: string;
  fecha: "cozinha" | "loja" | "ambas";
};

export type ConfiguracaoHorarios = {
  /** Quando se produz. Conta para o tempo de produção. */
  cozinha: HorarioSemanal;
  /** Quando se levanta. Só aqui há vagas. */
  loja: HorarioSemanal;
  diasFechados: readonly DiaFechado[];
  duracaoVagaMinutos: number;
  /** `null` é o interruptor da gerente desligado: as vagas não enchem. */
  limitePorVaga: number | null;
  /** Até quantos dias depois de hoje vai o calendário. Hoje é o dia 0. */
  diasAFrente: number;
};

/** O que o `horarios.md` propõe enquanto a Damira não responde. */
export const PREDEFINICOES = {
  duracaoVagaMinutos: 30,
  limitePorVaga: null,
  diasAFrente: 30,
} satisfies Partial<ConfiguracaoHorarios>;

/**
 * - `horas`: horas **de cozinha aberta**, a contar do pedido.
 * - `dias`: levantamento a partir do N-ésimo dia de cozinha aberta **depois do
 *   dia do pedido**. Não são 24 × N horas: «precisa de 3 dias» quer dizer «não
 *   se encomenda para antes de quinta».
 */
export type TempoProducao = { unidade: "horas" | "dias"; valor: number };

export type ArtigoDoCesto = {
  tempo: TempoProducao;
  /** «Esgotado hoje», do balcão: tira as vagas de hoje ao cesto inteiro. */
  esgotadoHoje?: boolean;
};

/**
 * Quantos pedidos já marcaram uma vaga, contando os `pendentes` (ver
 * `pedidos.md`). ⚠️ Isto serve para **mostrar**; quem decide a última vaga é a
 * restrição `CHECK` da base de dados (ver `robustez.md`).
 */
export type VagaOcupada = { inicio: Date; pedidos: number };

export type Vaga = {
  inicio: TZDate;
  fim: TZDate;
  /** `"2026-10-06"`, dia de Lisboa. */
  data: string;
  /** `"11:00"`, hora de Lisboa. */
  hora: string;
  ocupadas: number;
  livre: boolean;
};

export type Validacao =
  | { ok: true }
  | { ok: false; motivo: "indisponivel" | "vaga-cheia" };

/* Até onde se procura um dia de cozinha aberta antes de desistir. Uma
   configuração sem cozinha nenhuma não pode pôr o servidor num ciclo infinito;
   um ano e pouco cobre umas férias compridas com folga. */
const HORIZONTE_DIAS = 400;

const MS_POR_HORA = 3_600_000;

// ——— Dias e horas de Lisboa ———

/** Um dia do calendário de Lisboa, como `"2026-10-06"`. Ordena-se como texto. */
type Data = string;

const dataDe = (instante: Date): Data => format(instante, "yyyy-MM-dd", EM_LISBOA);
const horaDe = (instante: Date): string => format(instante, "HH:mm", EM_LISBOA);

/** Uma hora do relógio de Lisboa nesse dia. `minutos` pode chegar a 24 × 60. */
const instante = (data: Data, minutos: number): TZDate => {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new TZDate(ano, mes - 1, dia, Math.floor(minutos / 60), minutos % 60, FUSO);
};

const somarDias = (data: Data, dias: number): Data =>
  dataDe(addDays(instante(data, 0), dias, EM_LISBOA));

const diaDaSemana = (data: Data): DiaDaSemana =>
  DIAS_DA_SEMANA[getDay(instante(data, 0), EM_LISBOA)];

// ——— Validação da configuração ———

/* Uma configuração errada rebenta em vez de calcular. Um horário «25:00» que
   desse um calendário qualquer era um pedido marcado para uma hora que não
   existe, e só se descobria ao balcão. */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const emMinutos = (hora: string, podeSerMeiaNoite: boolean): number => {
  if (podeSerMeiaNoite && hora === "24:00") return 24 * 60;
  if (!HORA.test(hora)) throw new RangeError(`Hora inválida: «${hora}».`);
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const validarTempo = ({ unidade, valor }: TempoProducao): void => {
  const valido =
    unidade === "dias"
      ? Number.isInteger(valor) && valor >= 0
      : Number.isFinite(valor) && valor >= 0;
  if (!valido) throw new RangeError(`Tempo de produção inválido: ${valor} ${unidade}.`);
};

const validarInteiro = (nome: string, valor: number, minimo: number): void => {
  if (!Number.isInteger(valor) || valor < minimo) {
    throw new RangeError(`${nome} inválido: ${valor}.`);
  }
};

// ——— Os períodos abertos de um dia ———

type Periodo = { abre: number; fecha: number };

const fechado = (config: ConfiguracaoHorarios, data: Data, lado: "cozinha" | "loja") =>
  config.diasFechados.some(
    (dia) => dia.data === data && (dia.fecha === lado || dia.fecha === "ambas"),
  );

/** Em minutos desde a meia-noite, por ordem. Vazio se fechado. */
const periodosEmMinutos = (
  config: ConfiguracaoHorarios,
  data: Data,
  lado: "cozinha" | "loja",
): Periodo[] => {
  if (fechado(config, data, lado)) return [];
  const periodos = config[lado][diaDaSemana(data)]
    .map(({ abre, fecha }) => {
      const periodo = { abre: emMinutos(abre, false), fecha: emMinutos(fecha, true) };
      if (periodo.fecha <= periodo.abre) {
        throw new RangeError(`Intervalo que fecha antes de abrir: ${abre}–${fecha}.`);
      }
      return periodo;
    })
    .sort((a, b) => a.abre - b.abre);
  /* Dois períodos sobrepostos contavam as horas de cozinha a dobrar, e o bolo
     aparecia pronto antes de o ser. */
  for (let i = 1; i < periodos.length; i++) {
    if (periodos[i].abre < periodos[i - 1].fecha) {
      throw new RangeError(`Períodos sobrepostos ${lado === "loja" ? "na loja" : "na cozinha"}.`);
    }
  }
  return periodos;
};

/**
 * Os mesmos períodos como instantes (ms). A partir daqui conta-se tempo
 * **decorrido**, e aí somar milissegundos está certo: seis horas de cozinha são
 * seis horas reais. O que nunca se faz é somar milissegundos para mudar de
 * **dia** ou chegar a uma **hora do relógio** — isso é sempre pelo `instante`.
 */
const periodosDaCozinha = (config: ConfiguracaoHorarios, data: Data): Periodo[] =>
  periodosEmMinutos(config, data, "cozinha").map(({ abre, fecha }) => ({
    abre: instante(data, abre).getTime(),
    fecha: instante(data, fecha).getTime(),
  }));

const temCozinha = (config: ConfiguracaoHorarios, data: Data) =>
  periodosEmMinutos(config, data, "cozinha").length > 0;

// ——— Para a frente: quando fica pronto ———

const prontoDoArtigo = (
  { tempo }: ArtigoDoCesto,
  agora: Date,
  config: ConfiguracaoHorarios,
): number | null => {
  validarTempo(tempo);
  const desde = agora.getTime();
  if (tempo.valor === 0) return desde;

  if (tempo.unidade === "horas") {
    let falta = tempo.valor * MS_POR_HORA;
    let data = dataDe(agora);
    for (let i = 0; i <= HORIZONTE_DIAS; i++, data = somarDias(data, 1)) {
      for (const { abre, fecha } of periodosDaCozinha(config, data)) {
        if (fecha <= desde) continue;
        // Um pedido feito com a cozinha fechada começa a contar quando ela abre.
        const inicio = Math.max(abre, desde);
        if (falta <= fecha - inicio) return inicio + falta;
        falta -= fecha - inicio;
      }
    }
    return null;
  }

  /* Dias: o dia do pedido não conta, seja qual for a hora a que se pediu. O
     resultado é a meia-noite do N-ésimo dia; quem o leva à abertura da loja
     (ou ao dia seguinte, se a loja fechar) é a procura de vagas. */
  let data = dataDe(agora);
  let contados = 0;
  for (let i = 0; i < HORIZONTE_DIAS; i++) {
    data = somarDias(data, 1);
    if (temCozinha(config, data) && ++contados === tempo.valor) {
      return instante(data, 0).getTime();
    }
  }
  return null;
};

/* Cesto com vários artigos: fica o mais tardio, misturem-se as unidades que se
   misturarem. Um artigo impossível torna o cesto impossível. */
const prontoDoCesto = (
  cesto: readonly ArtigoDoCesto[],
  agora: Date,
  config: ConfiguracaoHorarios,
): number | null => {
  let maisTardio = agora.getTime();
  for (const artigo of cesto) {
    const pronto = prontoDoArtigo(artigo, agora, config);
    if (pronto === null) return null;
    maisTardio = Math.max(maisTardio, pronto);
  }
  return maisTardio;
};

/**
 * O instante em que a cozinha acaba o cesto. **Não é uma vaga**: pode cair às
 * 9h59, ou com a loja fechada. Para o que se mostra ao cliente, ver
 * `primeiroLevantamento`.
 */
export function prontoEm(
  cesto: readonly ArtigoDoCesto[],
  agora: Date,
  config: ConfiguracaoHorarios,
): TZDate | null {
  const pronto = prontoDoCesto(cesto, agora, config);
  return pronto === null ? null : new TZDate(pronto, FUSO);
}

// ——— As vagas ———

const vagasDoDia = (config: ConfiguracaoHorarios, data: Data) => {
  const duracao = config.duracaoVagaMinutos;
  const lista: { inicio: TZDate; fim: TZDate }[] = [];
  for (const { abre, fecha } of periodosEmMinutos(config, data, "loja")) {
    /* Só vagas inteiras: a loja que fecha às 21h tem a última às 20h30. Cada
       vaga constrói-se pela hora do relógio, e não a somar 30 minutos à
       anterior, para uma loja aberta durante a mudança de hora não ficar com
       as vagas desalinhadas do mostrador. */
    for (let m = abre; m + duracao <= fecha; m += duracao) {
      lista.push({ inicio: instante(data, m), fim: instante(data, m + duracao) });
    }
  }
  return lista;
};

/**
 * As vagas do calendário, de hoje até `diasAFrente`, a partir do momento em que
 * o cesto está pronto. As cheias **continuam na lista** com `livre: false`: o
 * calendário mostra-as riscadas, e o cliente percebe que o dia não está vazio.
 */
export function vagas(
  cesto: readonly ArtigoDoCesto[],
  agora: Date,
  config: ConfiguracaoHorarios,
  ocupadas: readonly VagaOcupada[] = [],
): Vaga[] {
  validarInteiro("Duração da vaga", config.duracaoVagaMinutos, 1);
  validarInteiro("Dias à frente", config.diasAFrente, 0);
  if (config.limitePorVaga !== null) {
    validarInteiro("Limite por vaga", config.limitePorVaga, 0);
  }

  const pronto = prontoDoCesto(cesto, agora, config);
  if (pronto === null) return [];

  const porInicio = new Map<number, number>();
  for (const { inicio, pedidos } of ocupadas) {
    porInicio.set(inicio.getTime(), (porInicio.get(inicio.getTime()) ?? 0) + pedidos);
  }

  const hoje = dataDe(agora);
  const ultimo = somarDias(hoje, config.diasAFrente);
  const esgotadoHoje = cesto.some((artigo) => artigo.esgotadoHoje);

  const lista: Vaga[] = [];
  for (let data = hoje; data <= ultimo; data = somarDias(data, 1)) {
    // «Esgotado hoje» volta sozinho amanhã — por isso é o dia, não o artigo.
    if (esgotadoHoje && data === hoje) continue;
    for (const { inicio, fim } of vagasDoDia(config, data)) {
      if (inicio.getTime() < pronto) continue;
      const contadas = porInicio.get(inicio.getTime()) ?? 0;
      lista.push({
        inicio,
        fim,
        data,
        hora: horaDe(inicio),
        ocupadas: contadas,
        livre: config.limitePorVaga === null || contadas < config.limitePorVaga,
      });
    }
  }
  return lista;
}

/**
 * A primeira vaga em que o cesto se pode levantar — **cheia ou não**: é o que a
 * cozinha consegue, não o que sobra. `null` se não houver nenhuma até
 * `diasAFrente` (um bolo de 40 dias com um calendário de 30 não se encomenda).
 */
export function primeiroLevantamento(
  cesto: readonly ArtigoDoCesto[],
  agora: Date,
  config: ConfiguracaoHorarios,
): TZDate | null {
  return vagas(cesto, agora, config)[0]?.inicio ?? null;
}

/**
 * A validação do servidor ao criar o pedido. É o **mesmo** cálculo do
 * calendário, de propósito: o que o browser mostrou é o que o servidor aceita.
 *
 * ⚠️ Passar aqui não garante a vaga — entre esta leitura e a escrita outro
 * pedido pode ocupá-la. Quem decide a última é a base de dados (`robustez.md`).
 */
export function validarLevantamento(
  cesto: readonly ArtigoDoCesto[],
  levantamento: Date,
  agora: Date,
  config: ConfiguracaoHorarios,
  ocupadas: readonly VagaOcupada[] = [],
): Validacao {
  const vaga = vagas(cesto, agora, config, ocupadas).find(
    (candidata) => candidata.inicio.getTime() === levantamento.getTime(),
  );
  if (!vaga) return { ok: false, motivo: "indisponivel" };
  if (!vaga.livre) return { ok: false, motivo: "vaga-cheia" };
  return { ok: true };
}

// ——— Para trás: quando a produção tem de começar ———

const inicioDoArtigo = (
  { tempo }: ArtigoDoCesto,
  levantamento: Date,
  config: ConfiguracaoHorarios,
): number | null => {
  validarTempo(tempo);
  const ate = levantamento.getTime();
  if (tempo.valor === 0) return ate;

  if (tempo.unidade === "horas") {
    // O levantamento menos N horas de cozinha, contadas para trás.
    let falta = tempo.valor * MS_POR_HORA;
    let data = dataDe(levantamento);
    for (let i = 0; i <= HORIZONTE_DIAS; i++, data = somarDias(data, -1)) {
      for (const { abre, fecha } of periodosDaCozinha(config, data).reverse()) {
        if (abre >= ate) continue;
        const fim = Math.min(fecha, ate);
        if (falta <= fim - abre) return fim - falta;
        falta -= fim - abre;
      }
    }
    return null;
  }

  /* Dias: a abertura da cozinha no primeiro dos N dias de cozinha aberta que
     acabam no dia do levantamento. O próprio dia conta, como conta para a
     frente — o bolo de 3 dias pedido na segunda conta terça, quarta e quinta e
     levanta-se na quinta à abertura, antes de a cozinha abrir. É literal ao
     `horarios.md`; se a casa contar de outra forma, muda o número no artigo. */
  let data = dataDe(levantamento);
  let contados = 0;
  for (let i = 0; i <= HORIZONTE_DIAS; i++, data = somarDias(data, -1)) {
    const periodos = periodosDaCozinha(config, data);
    if (periodos.length > 0 && ++contados === tempo.valor) return periodos[0].abre;
  }
  return null;
};

/**
 * Quando a produção do pedido tem de começar. Num pedido com vários artigos, o
 * que começa mais cedo. É o que alimenta o prazo de cancelamento e o separador
 * «Produzir hoje» do balcão.
 */
export function inicioDaProducao(
  cesto: readonly ArtigoDoCesto[],
  levantamento: Date,
  config: ConfiguracaoHorarios,
): TZDate | null {
  let maisCedo = levantamento.getTime();
  for (const artigo of cesto) {
    const inicio = inicioDoArtigo(artigo, levantamento, config);
    if (inicio === null) return null;
    maisCedo = Math.min(maisCedo, inicio);
  }
  return new TZDate(maisCedo, FUSO);
}

/**
 * Se ainda é antes de a produção começar. ⚠️ É **só a parte do horário**: se o
 * cliente pode mesmo cancelar depende também do interruptor da gerente e da
 * sessão iniciada (ver `pedidos.md`, «Cancelar»).
 */
export function dentroDoPrazoDeCancelamento(
  cesto: readonly ArtigoDoCesto[],
  levantamento: Date,
  agora: Date,
  config: ConfiguracaoHorarios,
): boolean {
  const inicio = inicioDaProducao(cesto, levantamento, config);
  return inicio !== null && agora.getTime() < inicio.getTime();
}
