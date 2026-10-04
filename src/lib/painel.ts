import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { AvisoAtencao, ConfiguracaoDaCasa, Pedido, Produto } from "@/lib/dados/tipos";
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

export type EventoHistorico = {
  quando: Date;
  o: "criado" | "pago" | "impresso" | "entregue" | "cancelado";
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
  return eventos
    .flatMap(([quando, o]) => (quando ? [{ quando, o }] : []))
    .sort((a, b) => a.quando.getTime() - b.quando.getTime());
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

  for (const pedido of vivos) {
    if (pedido.chegouTarde) {
      avisos.push({ tipo: "chegou-tarde", pedidoId: pedido.id, referencia: pedido.referencia });
    }
    const dia = diaDeLisboa(pedido.levantamentoEm);
    if (casa.diasFechados.some((d) => d.data === dia && d.fecha !== "cozinha")) {
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
