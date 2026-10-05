import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { HorarioSemanal, TempoProducao, VagaOcupada } from "@/lib/horarios";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
import { CATALOGO_JSON, CONFIGURACAO_JSON, criarFonteJson, criarFonteJsonComEstado, type OpcoesFonteJson } from "./json";
import { diaDeLisboa } from "@/lib/painel";
import type { ConfiguracaoDaCasa, FonteDeDados, Pedido, Produto } from "./tipos";

/**
 * # ⚠️ Valores de exemplo — **não são da casa**
 *
 * A Damira ainda não deu o horário da cozinha nem os tempos de produção, e o
 * calendário não se constrói sem eles. Estes números existem para o cesto, o
 * calendário e o checkout poderem ser feitos e testados **enquanto** ela não
 * responde. São plausíveis e são inventados.
 *
 * Por isso vivem aqui e não no catálogo: o `json.ts` diz a verdade (`null`, por
 * preencher), e só quem pede o exemplo de propósito o recebe — os testes, e o
 * **modo de teste** (`LOJA_EM_TESTE=1`, ver `src/lib/modo-teste.ts`), em local
 * ou no ar.
 *
 * ⚠️ **No ar, só com o modo de teste ligado.** Um prazo inventado no site no ar
 * é um cliente que aparece na quinta para um bolo que ninguém disse que estava
 * pronto na quinta — a não ser que o site diga, numa faixa à vista, que os
 * prazos são de exemplo. É isso que o interruptor garante: liga os dois ao
 * mesmo tempo. Se um dia isto rebentar na Vercel, a correção é preencher os
 * dados ou ligar o modo de teste — não é tirar a guarda.
 *
 * ⚠️ **São só o que falta, nunca o que manda.** A gerente vai editar o horário e
 * os tempos no painel (#40, #45); esses valores chegam pela base de dados e este
 * ficheiro só tapa o que ainda estiver `null`.
 */

/** Por família. A carta conta-se em horas de cozinha; o resto, em dias. */
export const TEMPOS_DE_EXEMPLO: Record<Produto["familia"], TempoProducao> = {
  ementa: { unidade: "horas", valor: 24 },
  festa: { unidade: "dias", valor: 2 },
  bolo: { unidade: "dias", valor: 3 },
  medida: { unidade: "dias", valor: 5 },
  box: { unidade: "dias", valor: 1 },
};

const oitoAsDezoito = [{ abre: "08:00", fecha: "18:00" }];

/**
 * Pedidos por meia hora, de exemplo — a pergunta 3 da mensagem à Andreia. É o
 * que dá cores ao calendário (a afluência conta em percentagem deste limite) e
 * o que enche uma vaga.
 */
export const LIMITE_POR_VAGA_DE_EXEMPLO = 4;

export const COZINHA_DE_EXEMPLO: HorarioSemanal = {
  segunda: oitoAsDezoito,
  terca: oitoAsDezoito,
  quarta: oitoAsDezoito,
  quinta: oitoAsDezoito,
  sexta: oitoAsDezoito,
  sabado: oitoAsDezoito,
  domingo: oitoAsDezoito,
};

const recusarEmProducao = (ambiente: Ambiente) => {
  if (ambiente.VERCEL_ENV === "production" && !emModoDeTeste(ambiente)) {
    throw new Error(
      "src/lib/dados/exemplo.ts: os valores de exemplo só correm no ar com o modo " +
        "de teste ligado (LOJA_EM_TESTE=1), que mostra a faixa a dizê-lo.",
    );
  }
};

/**
 * A fonte dos JSON com os buracos tapados pelo exemplo. **Só** preenche o que
 * está `null` — um tempo que a casa já tenha dado nunca é trocado pelo de
 * exemplo.
 */
/**
 * Um pedido pago a chegar agora, como se o Stripe o tivesse confirmado. **Só
 * existe no modo de teste**, e não é da `FonteDeDados`: a base de dados nunca o
 * terá, porque a única porta para `pago` é o `marcarPago` (#42, regra 4).
 */
export type SimularPedidoPago = (agora: Date, opcoes: { talaoFalhou: boolean }) => Pedido;

export type FonteDeExemplo = FonteDeDados & { simularPedidoPago?: SimularPedidoPago };

export function fonteDeExemplo(
  opcoes: OpcoesFonteJson & { pedidosDeExemplo?: boolean; pedidosDoPainel?: boolean } = {},
  ambiente: Ambiente = process.env,
  agora: Date = new Date(),
): FonteDeExemplo {
  recusarEmProducao(ambiente);
  const catalogo = (opcoes.catalogo ?? CATALOGO_JSON).map((produto) => ({
    ...produto,
    tempoProducao: produto.tempoProducao ?? TEMPOS_DE_EXEMPLO[produto.familia],
  }));
  const base = opcoes.configuracao ?? CONFIGURACAO_JSON;
  const configuracao = {
    ...base,
    cozinha: base.cozinha ?? COZINHA_DE_EXEMPLO,
    limitePorVaga: base.limitePorVaga ?? LIMITE_POR_VAGA_DE_EXEMPLO,
  };
  const { fonte, estado } = criarFonteJsonComEstado({
    ...opcoes,
    catalogo,
    configuracao,
    ...(opcoes.pedidosDeExemplo ? { ocupacaoExtra: pedidosDeExemplo(configuracao) } : {}),
    ...(opcoes.pedidosDoPainel
      ? { pedidos: [...(opcoes.pedidos ?? []), ...pedidosDoPainelDeExemplo(agora, catalogo, configuracao)] }
      : {}),
  });
  if (!opcoes.pedidosDoPainel) return fonte;

  let simulados = 0;
  const simularPedidoPago: SimularPedidoPago = (quando, { talaoFalhou }) => {
    simulados++;
    const carta = [...estado.porId.values()].find(
      (p) => p.origem === "ementa" && p.aVendaOnline && !p.arquivado && p.unidade === "un" && p.variantes[0].precoCent !== null,
    )!;
    /* Para daqui a uma hora, arredondado à meia hora: chega a «levantam hoje» se
       a loja ainda estiver aberta, a «próximos» se não. */
    const levantamentoEm = new Date(Math.ceil((quando.getTime() + 60 * 60_000) / 1_800_000) * 1_800_000);
    const linhas = [linhaDoPedido(carta)];
    const totalCent = linhas.reduce((soma, l) => soma + l.totalCent, 0);
    const pagoEm = new Date(quando.getTime());
    const nome = `Cliente Simulado ${simulados}`;
    const pedido: Pedido = {
      id: `simulado-${quando.getTime()}-${simulados}`,
      referencia: referenciaUnica(`simulado ${quando.getTime()} ${simulados}`, quando, (r) =>
        estado.porReferencia.has(r),
      ),
      estado: "pago",
      criadoEm: new Date(quando.getTime() - 3 * 60_000),
      levantamentoEm,
      cliente: { nome, email: paraEmail(nome), telefone: "+351910009999", nif: null, contaId: null },
      linhas,
      observacoes: talaoFalhou ? "Simulado com o talão a falhar." : null,
      totalCent,
      modoPagamento: "total",
      pagoOnlineCent: totalCent,
      reembolsadoCent: 0,
      chegouTarde: false,
      pagoEm,
      impressoEm: talaoFalhou ? null : new Date(pagoEm.getTime() + 5_000),
      entregueEm: null,
      canceladoEm: null,
      canceladoPor: null,
      reembolsos: [],
      avisosTratados: [],
      reagendadoEm: null,
    };
    estado.pedidos.set(pedido.id, pedido);
    estado.porReferencia.set(pedido.referencia, pedido.id);
    estado.versao++;
    return pedido;
  };
  return { ...fonte, simularPedidoPago };
}

// ——— Pedidos de exemplo ———

const DIAS_DA_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;
const LISBOA = { in: tz("Europe/Lisbon") };

/* Um número «ao acaso» que é sempre o mesmo para o mesmo texto (FNV-1a). Não é
   para segurança: é para o calendário de exemplo não mudar a cada visita, e o
   servidor recusar ao enviar exatamente as horas que o calendário mostrou
   cheias. */
const sorteio = (texto: string): number => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  /* ⚠️ A mistura final (a do MurmurHash3). Sem ela, datas seguidas
     («2026-10-20», «2026-10-21»…) davam números vizinhos, e o calendário de
     exemplo saía em blocos: dez dias vermelhos seguidos, nenhum laranja. */
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/**
 * ⚠️ **Pedidos inventados, para o calendário em modo de teste mostrar como fica
 * com procura** — pedido do cliente a 04/10. Cada dia tem uma intensidade ao
 * acaso (dias calmos, dias cheios) e cada meia hora um número de pedidos à
 * volta dela, até ao limite. Contam como pedidos a sério para a ocupação: uma
 * hora cheia de exemplo é recusada ao enviar, como seria uma verdadeira.
 *
 * Só existem com o modo de teste ligado, e a faixa diz que as vagas ocupadas
 * são de exemplo. Os verdadeiros somam-se a estes.
 */
function pedidosDeExemplo(config: ConfiguracaoDaCasa) {
  const limite = config.limitePorVaga ?? LIMITE_POR_VAGA_DE_EXEMPLO;
  return (desde: Date, ate: Date): VagaOcupada[] => {
    const ocupadas: VagaOcupada[] = [];
    for (let dia = desde; dia.getTime() <= ate.getTime() + 86_400_000; dia = addDays(dia, 1, LISBOA)) {
      const data = format(dia, "yyyy-MM-dd", LISBOA);
      const [ano, mes, numDia] = data.split("-").map(Number);
      /* De 0 (calmo) a 3 (cheio): a cor do dia sai daqui. */
      const intensidade = Math.floor(sorteio(data) * 4);
      for (const { abre, fecha } of config.loja[DIAS_DA_SEMANA[getDay(dia, LISBOA)]]) {
        const [ha, ma] = abre.split(":").map(Number);
        const [hf, mf] = fecha.split(":").map(Number);
        for (let m = ha * 60 + ma; m + config.duracaoVagaMinutos <= hf * 60 + mf; m += config.duracaoVagaMinutos) {
          const ruido = Math.round(sorteio(`${data} ${m}`) * 2 - 1);
          const pedidos = Math.max(0, Math.min(limite, intensidade + ruido));
          const inicio = new TZDate(ano, mes - 1, numDia, Math.floor(m / 60), m % 60, "Europe/Lisbon");
          if (pedidos > 0 && inicio >= desde && inicio <= ate) ocupadas.push({ inicio, pedidos });
        }
      }
    }
    return ocupadas;
  };
}

// ——— Pedidos de exemplo no painel ———

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* Inventados e às claras: nunca dados reais de clientes, nem em testes (AGENTS.md). */
const CLIENTES = [
  "Ana Exemplo", "Rui Teste", "Marta Exemplo", "João Teste", "Inês Exemplo", "Pedro Teste", "Carla Exemplo",
  "Tiago Teste", "Sofia Exemplo", "Bruno Teste", "Rita Exemplo", "Nuno Teste", "Luísa Exemplo", "Hugo Teste",
] as const;

const paraEmail = (nome: string) =>
  `${nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, ".")}@example.com`;

/* A linha como o pedido a guarda: a fotografia do momento, com o preço do
   catálogo (`pedidos.md`). Um pedido de exemplo nunca cobra o que o site não
   cobraria. */
const linhaDoPedido = (produto: Produto, quantidade?: number): Pedido["linhas"][number] => {
  const variante = produto.variantes[0];
  const qtd = quantidade ?? produto.quantidadeMinima;
  const preco = variante.precoCent!;
  return {
    produtoId: produto.id,
    varianteId: variante.id,
    nome: produto.nome.pt,
    variante: variante.rotulo?.pt ?? null,
    escolhas: [],
    unidade: produto.unidade,
    quantidade: qtd,
    precoUnitarioCent: preco,
    totalCent: Math.round(preco * qtd),
    notas: null,
  };
};

/* `DAM-DDMM-XXXX` a partir de uma semente: a mesma semente dá a mesma
   referência. Tenta outra se essa já existir. */
const referenciaUnica = (semente: string, criadoEm: Date, existe: (referencia: string) => boolean): string => {
  for (let tentativa = 0; ; tentativa++) {
    let sufixo = "";
    for (let i = 0; i < 4; i++) sufixo += ALFABETO[Math.floor(sorteio(`${semente} ${i} ${tentativa}`) * ALFABETO.length)];
    const referencia = `DAM-${format(criadoEm, "ddMM", LISBOA)}-${sufixo}`;
    if (!existe(referencia)) return referencia;
  }
};

type Pedir = {
  /** Dias a partir de hoje (Lisboa). Negativo é passado. */
  dia: number;
  hora: string;
  produtos: { produto: Produto; quantidade?: number }[];
  estado?: Pedido["estado"];
  cliente: number;
  sinal?: boolean;
  chegouTarde?: boolean;
  /** Minutos depois do pagamento do pedido anterior — o duplicado. */
  pagoMinutosDepoisDe?: number;
  notas?: string;
};

/**
 * ⚠️ **Pedidos inventados, para o painel ter o que mostrar em modo de teste**
 * (pedido do cliente a 04/10). Só o Stripe paga um pedido (#42), e sem base de
 * dados (#29) o balcão e a gerente abriam vazios.
 *
 * Relativos ao **dia de Lisboa de `agora`**, e sempre os mesmos para o mesmo dia
 * — as referências saem do dia e do número, e não do acaso. Cada um existe para
 * mostrar uma coisa: um pago para hoje, um com dinheiro em falta, um entregue,
 * um cancelado (riscado), um kit de festa que se produz hoje para amanhã, um que
 * chegou tarde, dois iguais pagos com 4 minutos (o «possível duplicado»), os
 * próximos dias e o arquivo.
 *
 * Os produtos vêm do catálogo **por família** e o preço é o dele: um pedido de
 * exemplo nunca cobra um valor que o site não cobraria. As horas caem dentro do
 * horário da loja, e os dias fechados saltam-se.
 */
export function pedidosDoPainelDeExemplo(
  agora: Date,
  catalogo: readonly Produto[],
  casa: ConfiguracaoDaCasa,
): Pedido[] {
  const hoje = diaDeLisboa(agora);
  const primeiro = (familia: Produto["familia"]) =>
    catalogo.find((p) => p.familia === familia && p.variantes[0].precoCent !== null && !p.arquivado);
  const festa = primeiro("festa");
  const bolo = primeiro("bolo");
  const box = primeiro("box");
  const carta = catalogo.find(
    (p) => p.origem === "ementa" && p.aVendaOnline && p.unidade === "un" && p.variantes[0].precoCent !== null,
  );
  if (!festa || !bolo || !box || !carta) return [];

  const dataEm = (dias: number) => diaDeLisboa(addDays(agora, dias, LISBOA));
  const meioDia = (data: string) => {
    const [ano, mes, dia] = data.split("-").map(Number);
    return new TZDate(ano, mes - 1, dia, 12, 0, "Europe/Lisbon");
  };
  const periodos = (data: string) =>
    casa.diasFechados.some((d) => d.data === data && d.fecha !== "cozinha")
      ? []
      : casa.loja[DIAS_DA_SEMANA[getDay(meioDia(data), LISBOA)]];

  /* O dia aberto mais perto de `dias`, a andar no sentido de `passo`. */
  const aberto = (dias: number, passo: 1 | -1): number => {
    for (let d = dias, i = 0; i < 14; d += passo, i++) if (periodos(dataEm(d)).length > 0) return d;
    return dias;
  };
  const amanha = aberto(1, 1);
  const depois = aberto(amanha + 1, 1);
  const daquiA4 = aberto(Math.max(4, depois + 1), 1);
  const ontem = aberto(-1, -1);
  const anteontem = aberto(ontem - 1, -1);
  const hojeAberto = periodos(hoje).length > 0;

  /* A hora pedida, dentro do primeiro período da loja nesse dia. */
  const instante = (data: string, hora: string): Date => {
    const [ano, mes, dia] = data.split("-").map(Number);
    const p = periodos(data)[0] ?? { abre: "09:00", fecha: "18:00" };
    const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    const m = Math.min(Math.max(minutos(hora), minutos(p.abre)), minutos(p.fecha === "24:00" ? "23:59" : p.fecha) - 30);
    return new Date(new TZDate(ano, mes - 1, dia, Math.floor(m / 60), m % 60, "Europe/Lisbon").getTime());
  };

  const lista: Pedir[] = [
    ...(hojeAberto
      ? ([
          { dia: 0, hora: "15:00", produtos: [{ produto: carta }], cliente: 0, notas: "Sem açúcar em pó, por favor." },
          { dia: 0, hora: "11:30", produtos: [{ produto: festa }], cliente: 1 },
          { dia: 0, hora: "17:30", produtos: [{ produto: box }, { produto: carta }], cliente: 2, sinal: true },
          { dia: 0, hora: "10:00", produtos: [{ produto: bolo }], cliente: 3 },
          { dia: 0, hora: "09:30", produtos: [{ produto: carta }], cliente: 4, estado: "entregue" },
          { dia: 0, hora: "16:00", produtos: [{ produto: box }], cliente: 5, estado: "cancelado" },
        ] satisfies Pedir[])
      : []),
    { dia: amanha, hora: "12:00", produtos: [{ produto: festa }], cliente: 6 },
    { dia: amanha, hora: "10:30", produtos: [{ produto: carta }], cliente: 7, chegouTarde: true },
    { dia: amanha, hora: "16:30", produtos: [{ produto: bolo }], cliente: 8 },
    { dia: depois, hora: "11:00", produtos: [{ produto: festa }, { produto: carta }], cliente: 9 },
    { dia: depois, hora: "11:00", produtos: [{ produto: festa }, { produto: carta }], cliente: 9, pagoMinutosDepoisDe: 4 },
    { dia: daquiA4, hora: "15:00", produtos: [{ produto: bolo }], cliente: 10 },
    { dia: daquiA4, hora: "10:00", produtos: [{ produto: box }], cliente: 11 },
    { dia: ontem, hora: "12:30", produtos: [{ produto: festa }], cliente: 12, estado: "entregue" },
    { dia: anteontem, hora: "09:00", produtos: [{ produto: carta }], cliente: 13, estado: "entregue" },
  ];

  const referencias = new Set<string>();
  const pedidos: Pedido[] = [];
  lista.forEach((p, n) => {
    const data = dataEm(p.dia);
    const levantamentoEm = instante(data, p.hora);
    const anterior = pedidos.at(-1);
    /* Pedido dois dias antes do levantamento, às 10h00 (ou à hora de agora, se
       for de hoje para hoje). O duplicado é pago minutos depois do anterior. */
    const criadoEm =
      p.pagoMinutosDepoisDe !== undefined && anterior
        ? new Date(anterior.criadoEm.getTime() + p.pagoMinutosDepoisDe * 60_000)
        : instante(dataEm(Math.min(p.dia - 2, -1)), "10:00");
    const pagoEm = new Date(criadoEm.getTime() + (p.chegouTarde ? 35 : 3) * 60_000);

    const linhas = p.produtos.map(({ produto, quantidade }) => linhaDoPedido(produto, quantidade));
    const totalCent = linhas.reduce((soma, l) => soma + l.totalCent, 0);
    const referencia = referenciaUnica(`${hoje} ${n}`, criadoEm, (r) => referencias.has(r));
    referencias.add(referencia);

    const estado = p.estado ?? "pago";
    const nome = CLIENTES[p.cliente];
    pedidos.push({
      id: `exemplo-${hoje}-${n + 1}`,
      referencia,
      estado,
      criadoEm,
      levantamentoEm,
      cliente: {
        nome,
        email: paraEmail(nome),
        telefone: `+35191000${String(1000 + p.cliente).slice(-4)}`,
        nif: null,
        contaId: null,
      },
      linhas,
      observacoes: p.notas ?? null,
      totalCent,
      modoPagamento: p.sinal ? "sinal" : "total",
      /* Com sinal, 30 % pago online; o resto cobra-se na loja. */
      pagoOnlineCent: p.sinal ? Math.round(totalCent * 0.3) : totalCent,
      reembolsadoCent: 0,
      chegouTarde: p.chegouTarde ?? false,
      pagoEm,
      impressoEm: new Date(pagoEm.getTime() + 60_000),
      entregueEm: estado === "entregue" ? new Date(levantamentoEm.getTime() + 5 * 60_000) : null,
      canceladoEm: estado === "cancelado" ? new Date(pagoEm.getTime() + 60 * 60_000) : null,
      canceladoPor: estado === "cancelado" ? "gerente" : null,
      reembolsos: [],
      avisosTratados: [],
      reagendadoEm: null,
    });
  });
  return pedidos;
}

/**
 * A fonte que o site usa, conforme o ambiente. **Com o modo de teste ligado,
 * tudo o que é provisório de uma vez** (`src/lib/modo-teste.ts`): os prazos e o
 * horário de exemplo, os pedidos de exemplo no calendário e no painel. Sem ele,
 * os JSON como estão — e o calendário diz «indisponível» até haver dados.
 *
 * O `agora` é o do arranque do processo: os pedidos do painel ficam presos a
 * esse dia, e um processo que atravesse a meia-noite mostra-os um dia atrás até
 * arrancar outra vez. Em modo de teste, chega.
 */
export const fonteDoAmbiente = (ambiente: Ambiente = process.env, agora: Date = new Date()): FonteDeExemplo =>
  emModoDeTeste(ambiente)
    ? fonteDeExemplo({ pedidosDeExemplo: true, pedidosDoPainel: true }, ambiente, agora)
    : criarFonteJson();
