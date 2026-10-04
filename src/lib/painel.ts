import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { AvisoAtencao, ConfiguracaoDaCasa, EntradaProduto, Pedido, Produto } from "@/lib/dados/tipos";
import { FUSO, inicioDaProducao } from "@/lib/horarios";
import { formatarCent } from "@/lib/preco";

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

// ——— Pedidos ———

/**
 * O que falta pagar na loja. **Calcula-se, não se guarda** (`pedidos.md` ›
 * Dinheiro): um campo derivado guardado é um campo que um dia não bate certo.
 */
export const faltaPagarCent = (pedido: Pick<Pedido, "totalCent" | "pagoOnlineCent">): number =>
  Math.max(0, pedido.totalCent - pedido.pagoOnlineCent);

/**
 * O que ainda se pode devolver: o pago online menos os reembolsos que não
 * falharam (um pendente já está a caminho). É o teto de qualquer reembolso.
 */
export const porDevolverCent = (pedido: Pick<Pedido, "pagoOnlineCent" | "reembolsos">): number =>
  pedido.pagoOnlineCent - pedido.reembolsos.filter((r) => r.estado !== "falhado").reduce((s, r) => s + r.valorCent, 0);

export type EventoHistorico = {
  quando: Date;
  o: "criado" | "pago" | "impresso" | "entregue" | "cancelado" | "reagendado" | "reembolso";
  /** O que o rótulo sozinho não diz: o valor e o estado de um reembolso. */
  detalhe?: string;
};

/**
 * O histórico do detalhe do pedido, a partir das datas que o pedido já guarda.
 * Os reembolsos entram com o Stripe (#49). ⚠️ Desfazer um «entregue» apaga o
 * `entregueEm`, e com ele essa linha: o histórico mostra o que o pedido **é**.
 */
export function historicoDe(pedido: Pedido): EventoHistorico[] {
  const eventos: [Date | null, EventoHistorico["o"]][] = [
    [pedido.criadoEm, "criado"],
    [pedido.pagoEm, "pago"],
    [pedido.impressoEm, "impresso"],
    [pedido.entregueEm, "entregue"],
    [pedido.canceladoEm, "cancelado"],
  ];
  const reembolsos: EventoHistorico[] = pedido.reembolsos.map((r) => ({
    quando: r.pedidoEm,
    o: "reembolso",
    detalhe: `${formatarCent(r.valorCent, "pt")} · ${r.estado === "concluido" ? "concluído" : r.estado}`,
  }));
  return [
    ...eventos.flatMap(([quando, o]) => (quando ? [{ quando, o }] : [])),
    ...(pedido.reagendadoEm ? [{ quando: pedido.reagendadoEm, o: "reagendado" as const }] : []),
    ...reembolsos,
  ].sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

/** Uma linha de «Produzir hoje»: um produto, somado por todos os pedidos. */
export type AProduzir = {
  produtoId: string;
  varianteId: string;
  nome: string;
  variante: string | null;
  unidade: Pedido["linhas"][number]["unidade"];
  quantidade: number;
  /** Quando tem de começar, o mais cedo de todos os pedidos. Hora de Lisboa ao mostrar. */
  comecaAte: Date;
  referencias: string[];
};

export type Balcao = {
  /** Pagos para hoje, e os cancelados de hoje, riscados até ao fim do dia. */
  levantamHoje: Pedido[];
  produzirHoje: AProduzir[];
  /** Pagos para depois de hoje. */
  proximos: Pedido[];
  /**
   * Pedidos de que não se sabe quando começar — falta o horário da cozinha ou o
   * tempo de um produto. Mostram-se à parte: uma lista de produção que os
   * calasse deixava a cozinha a descobri-los no dia.
   */
  semInicio: string[];
};

const porLevantamento = (a: Pedido, b: Pedido) => a.levantamentoEm.getTime() - b.levantamentoEm.getTime();

/**
 * Os três separadores do balcão (`painel-balcao.md`). ⚠️ **«Levantam hoje» e
 * «Produzir hoje» não são a mesma coisa**: um bolo de 3 dias para sexta aparece
 * em «Produzir» na terça e em «Levantam» na sexta. O dia é sempre o de Lisboa,
 * e o início da produção conta-se para trás com o motor de horários, por linha,
 * com o tempo de cada produto.
 *
 * Recebe os pedidos já filtrados por quem chama (o `listarPedidos`, de hoje em
 * diante) e os produtos para saber os tempos — as linhas do pedido não os
 * guardam.
 */
export function organizarBalcao(
  pedidos: readonly Pedido[],
  produtos: readonly Pick<Produto, "id" | "tempoProducao">[],
  casa: ConfiguracaoDaCasa,
  agora: Date,
): Balcao {
  const hoje = diaDeLisboa(agora);
  const tempos = new Map(produtos.map((p) => [p.id, p.tempoProducao]));
  const config = casa.cozinha === null ? null : { ...casa, cozinha: casa.cozinha };

  const levantamHoje: Pedido[] = [];
  const proximos: Pedido[] = [];
  const semInicio = new Set<string>();
  const aProduzir = new Map<string, AProduzir>();

  for (const pedido of pedidos) {
    const dia = diaDeLisboa(pedido.levantamentoEm);
    if (dia === hoje && (pedido.estado === "pago" || pedido.estado === "cancelado")) levantamHoje.push(pedido);
    if (pedido.estado !== "pago") continue;
    if (dia > hoje) proximos.push(pedido);
    if (dia < hoje) continue;

    for (const linha of pedido.linhas) {
      const tempo = tempos.get(linha.produtoId);
      const inicio = config && tempo ? inicioDaProducao([{ tempo }], pedido.levantamentoEm, config) : null;
      if (inicio === null) {
        semInicio.add(pedido.referencia);
        continue;
      }
      if (diaDeLisboa(inicio) !== hoje) continue;
      const chave = `${linha.produtoId}|${linha.varianteId}`;
      const atual = aProduzir.get(chave);
      if (atual) {
        atual.quantidade += linha.quantidade;
        if (inicio.getTime() < atual.comecaAte.getTime()) atual.comecaAte = new Date(inicio.getTime());
        if (!atual.referencias.includes(pedido.referencia)) atual.referencias.push(pedido.referencia);
      } else {
        aProduzir.set(chave, {
          produtoId: linha.produtoId,
          varianteId: linha.varianteId,
          nome: linha.nome,
          variante: linha.variante,
          unidade: linha.unidade,
          quantidade: linha.quantidade,
          comecaAte: new Date(inicio.getTime()),
          referencias: [pedido.referencia],
        });
      }
    }
  }

  return {
    levantamHoje: levantamHoje.sort(porLevantamento),
    produzirHoje: [...aProduzir.values()].sort((a, b) => a.comecaAte.getTime() - b.comecaAte.getTime()),
    proximos: proximos.sort(porLevantamento),
    semInicio: [...semInicio],
  };
}

const DEZ_MINUTOS = 10 * 60_000;

/* «Os mesmos artigos», sem contar a ordem em que se juntaram ao cesto. */
const assinatura = (pedido: Pedido) =>
  pedido.linhas
    .map((l) => `${l.produtoId}|${l.varianteId}|${l.quantidade}|${l.escolhas.join(",")}`)
    .sort()
    .join(";");

/**
 * Os avisos que saem dos próprios pedidos (`painel-gerente.md` › Precisa de
 * atenção). Só os pagos que ainda se vão levantar: depois do dia, o aviso sai
 * sozinho.
 *
 * - **Chegou tarde:** pago depois de expirar (`pedidos.md`).
 * - **Possível duplicado:** mesmo email, mesmos artigos, mesma vaga, pagos com
 *   menos de 10 minutos de diferença (`robustez.md`) — o cliente abriu dois
 *   separadores. Para o sistema são dois pedidos legítimos; decide a gerente.
 * - **Dia fechado:** marcado para um dia que entretanto fechou à loja
 *   (`horarios.md`). Fechar um dia não cancela os pedidos — avisa.
 * - **Reembolso falhado:** em qualquer pedido, de qualquer dia — o dinheiro
 *   ainda não voltou ao cliente (`pagamentos.md`).
 *
 * Um aviso que a gerente deu por tratado (`avisosTratados`) não aparece; num
 * duplicado, basta um dos dois (`pedidos.md` › Avisos tratados).
 */
export function avisosDosPedidos(
  pedidos: readonly Pedido[],
  casa: Pick<ConfiguracaoDaCasa, "diasFechados">,
  agora: Date,
): AvisoAtencao[] {
  const hoje = diaDeLisboa(agora);
  const vivos = pedidos
    .filter((p) => p.estado === "pago" && diaDeLisboa(p.levantamentoEm) >= hoje)
    .sort((a, b) => (a.pagoEm?.getTime() ?? 0) - (b.pagoEm?.getTime() ?? 0));
  const avisos: AvisoAtencao[] = [];

  const tratado = (p: Pedido, tipo: Pedido["avisosTratados"][number]) => p.avisosTratados.includes(tipo);

  for (const pedido of pedidos) {
    if (pedido.reembolsos.some((r) => r.estado === "falhado") && !tratado(pedido, "reembolso-falhado")) {
      avisos.push({ tipo: "reembolso-falhado", pedidoId: pedido.id, referencia: pedido.referencia });
    }
  }

  for (const pedido of vivos) {
    if (pedido.chegouTarde && !tratado(pedido, "chegou-tarde")) {
      avisos.push({ tipo: "chegou-tarde", pedidoId: pedido.id, referencia: pedido.referencia });
    }
    const dia = diaDeLisboa(pedido.levantamentoEm);
    if (casa.diasFechados.some((d) => d.data === dia && d.fecha !== "cozinha") && !tratado(pedido, "dia-fechado")) {
      avisos.push({ tipo: "dia-fechado", pedidoId: pedido.id, referencia: pedido.referencia, data: dia });
    }
  }

  for (let i = 0; i < vivos.length; i++) {
    for (let j = i + 1; j < vivos.length; j++) {
      const [a, b] = [vivos[i], vivos[j]];
      const perto =
        a.pagoEm !== null && b.pagoEm !== null && Math.abs(b.pagoEm.getTime() - a.pagoEm.getTime()) < DEZ_MINUTOS;
      if (
        perto &&
        !tratado(a, "possivel-duplicado") &&
        !tratado(b, "possivel-duplicado") &&
        a.cliente.email.toLowerCase() === b.cliente.email.toLowerCase() &&
        a.levantamentoEm.getTime() === b.levantamentoEm.getTime() &&
        assinatura(a) === assinatura(b)
      ) {
        avisos.push({
          tipo: "possivel-duplicado",
          pedidoIds: [a.id, b.id],
          referencias: [a.referencia, b.referencia],
        });
      }
    }
  }
  return avisos;
}

// ——— O que o balcão mostra ———

/**
 * O estado do pagamento, em grande no cartão e no talão (`painel-balcao.md`):
 * `PAGO`, ou `SINAL PAGO · FALTA 12,50 €`.
 */
export const rotuloPagamento = (pedido: Pick<Pedido, "totalCent" | "pagoOnlineCent">): string => {
  const falta = faltaPagarCent(pedido);
  return falta === 0 ? "PAGO" : `SINAL PAGO · FALTA ${formatarCent(falta, "pt")}`;
};

const DIA_DE_LISBOA = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FUSO,
});

/** «quinta-feira, 8 de outubro», em Lisboa. */
export const diaPorExtenso = (instante: Date): string => DIA_DE_LISBOA.format(instante);

/**
 * O que mudou entre a leitura anterior e esta: **pedidos novos** (som e aviso)
 * e **cancelados** (som e aviso vermelho). Na primeira leitura não há nada de
 * novo — abrir o painel de manhã não é receber trinta pedidos.
 *
 * Um pedido novo é um `pago` que não estava lá antes; um cancelado é um que
 * estava `pago` e passou a `cancelado`.
 */
export function novidades(
  anteriores: ReadonlyMap<string, Pedido["estado"]> | null,
  atuais: readonly Pedido[],
): { novos: Pedido[]; cancelados: Pedido[] } {
  if (anteriores === null) return { novos: [], cancelados: [] };
  return {
    novos: atuais.filter((p) => p.estado === "pago" && !anteriores.has(p.id)),
    cancelados: atuais.filter((p) => p.estado === "cancelado" && anteriores.get(p.id) === "pago"),
  };
}

// ——— Os formulários da gestão ———

/**
 * «12,50» ou «12.5» → 1250. ⚠️ **Sem passar por um decimal** (regra 2 do
 * AGENTS.md): `12.5 * 100` dá 1250 por sorte, `0.29 * 100` dá 28,999…, e um
 * cêntimo a menos no valor mínimo é uma regra que deixa passar um pedido.
 * `null` se não for um valor em euros com até dois decimais.
 */
export function paraCent(texto: string): number | null {
  const lido = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(texto.trim().replace(/\s*€$/, ""));
  if (!lido) return null;
  return Number(lido[1]) * 100 + Number((lido[2] ?? "").padEnd(2, "0"));
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Os dias escolhidos no filtro (`"2026-10-07"`), como instantes: do começo do
 * primeiro ao fim do último, **em hora de Lisboa**. Um `new Date("2026-10-07")`
 * seria meia-noite em UTC — uma hora a menos no verão, e os pedidos da meia-noite
 * à uma ficavam do lado errado.
 */
export function intervaloDeDias(desde: string | null, ate: string | null): { desde?: Date; ate?: Date } {
  const instante = (data: string, dias: number) => {
    const [ano, mes, dia] = data.split("-").map(Number);
    return new Date(new TZDate(ano, mes - 1, dia + dias, 0, 0, FUSO).getTime());
  };
  return {
    ...(desde && DATA.test(desde) ? { desde: instante(desde, 0) } : {}),
    ...(ate && DATA.test(ate) ? { ate: new Date(instante(ate, 1).getTime() - 1) } : {}),
  };
}

// ——— Os produtos, na gestão (#40) ———

/**
 * Os 14 alergénios de declaração obrigatória na UE (Regulamento 1169/2011,
 * anexo II). É a lista que a gerente marca; um alergénio que já esteja escrito
 * no produto e não seja destes continua lá — não se apaga o que a casa escreveu.
 */
export const ALERGENIOS_UE = [
  "Glúten",
  "Crustáceos",
  "Ovos",
  "Peixe",
  "Amendoins",
  "Soja",
  "Leite",
  "Frutos de casca rija",
  "Aipo",
  "Mostarda",
  "Sésamo",
  "Sulfitos",
  "Tremoço",
  "Moluscos",
] as const;

/**
 * O produto como o formulário o grava (`EsquemaEntradaProduto`): sem o id, o
 * arquivado, o fora de venda e o esgotado, que têm funções próprias. As
 * variantes levam o seu id — é o que não as deixa trocar nos cestos de quem já
 * as juntou.
 */
export function entradaDoProduto(produto: Produto): EntradaProduto {
  const { id: _id, arquivado: _a, foraDeVenda: _f, esgotadoNoDia: _e, ...entrada } = produto;
  void [_id, _a, _f, _e];
  return entrada;
}

export type VistaProdutos = "todos" | "por-preencher" | "a-venda" | "fora" | "arquivados";

const semAcentos = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Falta foto, alergénios ou tempo de produção — o que a casa tem de preencher. */
export const porPreencher = (p: Produto) => p.fotos.length === 0 || p.alergenios === null || p.tempoProducao === null;

/**
 * A lista de produtos da gestão, filtrada. Os arquivados só aparecem na vista
 * deles: um produto apagado no meio da lista era um produto que alguém voltava
 * a pôr à venda sem querer.
 */
export function filtrarProdutos(
  produtos: readonly Produto[],
  { procura, vista, familia }: { procura: string; vista: VistaProdutos; familia: Produto["familia"] | "todas" },
): Produto[] {
  const termo = semAcentos(procura.trim());
  return produtos.filter((p) => {
    if (vista === "arquivados" ? !p.arquivado : p.arquivado) return false;
    if (vista === "por-preencher" && !porPreencher(p)) return false;
    if (vista === "a-venda" && !(p.aVendaOnline && !p.foraDeVenda)) return false;
    if (vista === "fora" && p.aVendaOnline && !p.foraDeVenda) return false;
    if (familia !== "todas" && p.familia !== familia) return false;
    return termo === "" || semAcentos(`${p.nome.pt} ${p.id}`).includes(termo);
  });
}
