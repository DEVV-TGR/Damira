import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { CATALOGO_JSON } from "@/lib/dados/json";
import { COZINHA_DE_EXEMPLO } from "@/lib/dados/exemplo";
import type { ConfiguracaoDaCasa, Pedido, Produto } from "@/lib/dados/tipos";
import {
  avisosDosPedidos,
  contarPorPreencher,
  diaDeLisboa,
  esgotadoHoje,
  faltaPagarCent,
  fimDaPausa,
  diaPorExtenso,
  entradaDoProduto,
  filtrarProdutos,
  historicoDe,
  intervaloDeDias,
  novidades,
  paraCent,
  organizarBalcao,
  rotuloPagamento,
} from "./painel";

const seteAsVinteUma = [{ abre: "07:00", fecha: "21:00" }];
const TODOS_OS_DIAS: ConfiguracaoDaCasa["loja"] = {
  domingo: seteAsVinteUma,
  segunda: seteAsVinteUma,
  terca: seteAsVinteUma,
  quarta: seteAsVinteUma,
  quinta: seteAsVinteUma,
  sexta: seteAsVinteUma,
  sabado: seteAsVinteUma,
};

const lisboa = (mes: number, dia: number, h: number, m = 0) => new TZDate(2026, mes - 1, dia, h, m, "Europe/Lisbon");

describe("por preencher", () => {
  const produto = (alteracoes: Partial<Produto>): Produto => ({ ...CATALOGO_JSON[0], ...alteracoes });

  it("conta fotos, alergénios e tempos em falta, e lista quem falta", () => {
    const contas = contarPorPreencher([
      produto({ id: "completo", fotos: ["/a.webp"], alergenios: ["ovo"], tempoProducao: { unidade: "dias", valor: 1 } }),
      produto({ id: "sem-nada", fotos: [], alergenios: null, tempoProducao: null }),
      produto({ id: "so-sem-foto", fotos: [], alergenios: [], tempoProducao: { unidade: "horas", valor: 2 } }),
    ]);
    expect(contas).toEqual({ semFoto: 2, semAlergenios: 1, semTempo: 1, produtos: ["sem-nada", "so-sem-foto"] });
  });

  it("«sem alergénios» respondido não conta como por preencher, e os arquivados não contam", () => {
    const contas = contarPorPreencher([
      produto({ id: "respondido", alergenios: [] }),
      produto({ id: "arquivado", alergenios: null, arquivado: true }),
    ]);
    expect(contas.semAlergenios).toBe(0);
    expect(contas.produtos).not.toContain("arquivado");
  });

  it("hoje, nos JSON, falta tudo: os 107 sem alergénios e sem tempo", () => {
    const contas = contarPorPreencher(CATALOGO_JSON);
    expect(contas.semAlergenios).toBe(107);
    expect(contas.semTempo).toBe(107);
  });
});

describe("esgotado hoje", () => {
  it("vale só no dia de Lisboa em que foi marcado", () => {
    const agora = lisboa(10, 5, 10);
    expect(esgotadoHoje({ esgotadoNoDia: "2026-10-05" }, agora)).toBe(true);
    expect(esgotadoHoje({ esgotadoNoDia: "2026-10-04" }, agora)).toBe(false);
    expect(esgotadoHoje({ esgotadoNoDia: null }, agora)).toBe(false);
  });

  it("o dia é o de Lisboa e não o de UTC", () => {
    expect(diaDeLisboa(new Date("2026-07-15T23:30:00Z"))).toBe("2026-07-16");
  });
});

describe("fim da pausa", () => {
  const casa = { loja: TODOS_OS_DIAS, diasFechados: [] };

  it("meia hora e uma hora contam do agora", () => {
    const agora = lisboa(10, 5, 10);
    expect(fimDaPausa("30min", agora, casa)?.getTime()).toBe(lisboa(10, 5, 10, 30).getTime());
    expect(fimDaPausa("1h", agora, casa)?.getTime()).toBe(lisboa(10, 5, 11).getTime());
  });

  it("«até amanhã» acaba à abertura do próximo dia em que a loja abre", () => {
    /* Sábado, 10 de outubro, às 20h00, com o domingo fechado: segunda às 7h00. */
    const semDomingo = { loja: { ...TODOS_OS_DIAS, domingo: [] }, diasFechados: [] };
    expect(fimDaPausa("ate-amanha", lisboa(10, 10, 20), semDomingo)?.getTime()).toBe(lisboa(10, 12, 7).getTime());
  });

  it("um dia fechado à loja salta-se; um fechado só à cozinha não", () => {
    const agora = lisboa(10, 5, 20);
    const lojaFechada = { loja: TODOS_OS_DIAS, diasFechados: [{ data: "2026-10-06", fecha: "loja" as const }] };
    const cozinhaFechada = { loja: TODOS_OS_DIAS, diasFechados: [{ data: "2026-10-06", fecha: "cozinha" as const }] };
    expect(fimDaPausa("ate-amanha", agora, lojaFechada)?.getTime()).toBe(lisboa(10, 7, 7).getTime());
    expect(fimDaPausa("ate-amanha", agora, cozinhaFechada)?.getTime()).toBe(lisboa(10, 6, 7).getTime());
  });

  it("atravessa a mudança de hora de 25/10: às 7h00 de inverno, que são 7h00 UTC", () => {
    const fim = fimDaPausa("ate-amanha", lisboa(10, 24, 22), casa);
    expect(fim?.toISOString()).toBe("2026-10-25T07:00:00.000Z");
  });

  it("uma loja que nunca abre não tem fim de pausa, e não fica presa", () => {
    const fechada = Object.fromEntries(Object.keys(TODOS_OS_DIAS).map((dia) => [dia, []])) as unknown as ConfiguracaoDaCasa["loja"];
    expect(fimDaPausa("ate-amanha", lisboa(10, 5, 10), { loja: fechada, diasFechados: [] })).toBeNull();
  });
});

// ——— Pedidos ———

const linha = (produtoId: string, quantidade = 1): Pedido["linhas"][number] => ({
  produtoId,
  varianteId: "unica",
  nome: produtoId,
  variante: null,
  escolhas: [],
  unidade: "un",
  quantidade,
  precoUnitarioCent: 1000,
  totalCent: 1000 * quantidade,
  notas: null,
});

const pedido = (id: string, alteracoes: Partial<Pedido> = {}): Pedido => ({
  id,
  referencia: `DAM-0710-${id.toUpperCase()}`,
  estado: "pago",
  criadoEm: lisboa(10, 5, 9),
  levantamentoEm: lisboa(10, 8, 15),
  cliente: { nome: "Cliente", email: "cliente@example.com", telefone: null, nif: null, contaId: null },
  linhas: [linha("kit")],
  observacoes: null,
  totalCent: 1000,
  modoPagamento: "total",
  pagoOnlineCent: 1000,
  reembolsadoCent: 0,
  chegouTarde: false,
  pagoEm: lisboa(10, 5, 9, 5),
  impressoEm: null,
  entregueEm: null,
  canceladoEm: null,
  canceladoPor: null,
  reembolsos: [],
  avisosTratados: [],
  reagendadoEm: null,
  ...alteracoes,
});

/* A cozinha de exemplo (8h–18h, todos os dias) e a loja das 7h às 21h. */
const CASA: ConfiguracaoDaCasa = {
  loja: TODOS_OS_DIAS,
  cozinha: COZINHA_DE_EXEMPLO,
  diasFechados: [],
  duracaoVagaMinutos: 30,
  limitePorVaga: null,
  diasAFrente: 30,
  limiaresAfluencia: { livre: 25, media: 50 },
};

const TEMPOS: Pick<Produto, "id" | "tempoProducao">[] = [
  { id: "kit", tempoProducao: { unidade: "dias", valor: 2 } },
  { id: "bolo", tempoProducao: { unidade: "horas", valor: 2 } },
  { id: "box", tempoProducao: { unidade: "dias", valor: 1 } },
  { id: "por-preencher", tempoProducao: null },
];

describe("os separadores do balcão", () => {
  /* Quarta, 7 de outubro, às 10h00. */
  const QUARTA = lisboa(10, 7, 10);

  it("«levantam hoje» e «produzir hoje» não são a mesma lista", () => {
    const balcao = organizarBalcao(
      [
        pedido("kit1", { levantamentoEm: lisboa(10, 8, 15) }), // kit de 2 dias para quinta: começa hoje
        pedido("kit2", { levantamentoEm: lisboa(10, 8, 10), linhas: [linha("kit", 2)] }),
        pedido("bolo", { levantamentoEm: lisboa(10, 7, 15), linhas: [linha("bolo")] }), // 2 h, para hoje às 15h
        pedido("box", { levantamentoEm: lisboa(10, 10, 11), linhas: [linha("box")] }), // sábado: começa sábado
      ],
      TEMPOS,
      CASA,
      QUARTA,
    );
    expect(balcao.levantamHoje.map((p) => p.id)).toEqual(["bolo"]);
    expect(balcao.proximos.map((p) => p.id)).toEqual(["kit2", "kit1", "box"]);
    expect(balcao.produzirHoje).toEqual([
      expect.objectContaining({
        produtoId: "kit",
        quantidade: 3,
        comecaAte: lisboa(10, 7, 8),
        referencias: ["DAM-0710-KIT1", "DAM-0710-KIT2"],
      }),
      expect.objectContaining({ produtoId: "bolo", quantidade: 1, comecaAte: lisboa(10, 7, 13) }),
    ]);
    expect(balcao.semInicio).toEqual([]);
  });

  it("um bolo de dois dias aparece em «produzir» na véspera e em «levantam» no dia", () => {
    const kit = pedido("kit1", { levantamentoEm: lisboa(10, 8, 15) });
    const naQuinta = organizarBalcao([kit], TEMPOS, CASA, lisboa(10, 8, 9));
    expect(naQuinta.levantamHoje.map((p) => p.id)).toEqual(["kit1"]);
    expect(naQuinta.produzirHoje).toEqual([]);
  });

  it("os cancelados de hoje ficam (riscados); entregues, pendentes e expirados não", () => {
    const balcao = organizarBalcao(
      [
        pedido("canc", { estado: "cancelado", levantamentoEm: lisboa(10, 7, 12) }),
        pedido("entr", { estado: "entregue", levantamentoEm: lisboa(10, 7, 11) }),
        pedido("pend", { estado: "pendente", levantamentoEm: lisboa(10, 7, 11) }),
        pedido("expi", { estado: "expirado", levantamentoEm: lisboa(10, 7, 11) }),
      ],
      TEMPOS,
      CASA,
      QUARTA,
    );
    expect(balcao.levantamHoje.map((p) => p.id)).toEqual(["canc"]);
    expect(balcao.produzirHoje).toEqual([]);
  });

  it("sem tempo ou sem cozinha não se sabe quando começar — e isso diz-se, não se cala", () => {
    const semTempo = pedido("semt", { linhas: [linha("por-preencher")] });
    expect(organizarBalcao([semTempo], TEMPOS, CASA, QUARTA).semInicio).toEqual(["DAM-0710-SEMT"]);
    const semCozinha = organizarBalcao([pedido("kit1")], TEMPOS, { ...CASA, cozinha: null }, QUARTA);
    expect(semCozinha.semInicio).toEqual(["DAM-0710-KIT1"]);
    expect(semCozinha.produzirHoje).toEqual([]);
  });

  it("«hoje» é o dia de Lisboa: à meia-noite e meia de verão, já é o dia seguinte", () => {
    const madrugada = new Date("2026-07-15T23:30:00Z");
    const deDia16 = pedido("dia16", { levantamentoEm: new TZDate(2026, 6, 16, 10, 0, "Europe/Lisbon") });
    expect(organizarBalcao([deDia16], TEMPOS, CASA, madrugada).levantamHoje.map((p) => p.id)).toEqual(["dia16"]);
  });
});

describe("precisa de atenção", () => {
  const HOJE = lisboa(10, 7, 10);

  it("um pago que chegou tarde avisa enquanto não passar o dia", () => {
    const tarde = pedido("tard", { chegouTarde: true });
    expect(avisosDosPedidos([tarde], CASA, HOJE)).toEqual([
      { tipo: "chegou-tarde", pedidoId: "tard", referencia: "DAM-0710-TARD" },
    ]);
    const passado = pedido("tard", { chegouTarde: true, levantamentoEm: lisboa(10, 6, 15) });
    expect(avisosDosPedidos([passado], CASA, HOJE)).toEqual([]);
  });

  it("dois pedidos iguais pagos com menos de 10 minutos são um possível duplicado", () => {
    const a = pedido("aaaa", { linhas: [linha("kit"), linha("bolo")] });
    const b = pedido("bbbb", {
      linhas: [linha("bolo"), linha("kit")],
      cliente: { ...a.cliente, email: "CLIENTE@example.com" },
      pagoEm: lisboa(10, 5, 9, 12),
    });
    expect(avisosDosPedidos([a, b], CASA, HOJE)).toEqual([
      {
        tipo: "possivel-duplicado",
        pedidoIds: ["aaaa", "bbbb"],
        referencias: ["DAM-0710-AAAA", "DAM-0710-BBBB"],
      },
    ]);
  });

  it("com 10 minutos ou mais, outra vaga, ou outro email, não é duplicado", () => {
    const a = pedido("aaaa");
    expect(avisosDosPedidos([a, pedido("bbbb", { pagoEm: lisboa(10, 5, 9, 16) })], CASA, HOJE)).toEqual([]);
    expect(avisosDosPedidos([a, pedido("bbbb", { levantamentoEm: lisboa(10, 8, 16) })], CASA, HOJE)).toEqual([]);
    const outroEmail = pedido("bbbb", { cliente: { ...a.cliente, email: "outra@example.com" } });
    expect(avisosDosPedidos([a, outroEmail], CASA, HOJE)).toEqual([]);
  });

  it("um pedido num dia que entretanto fechou à loja avisa; fechado só à cozinha, não", () => {
    const p = pedido("fech");
    const lojaFechada = { diasFechados: [{ data: "2026-10-08", fecha: "loja" as const }] };
    const cozinhaFechada = { diasFechados: [{ data: "2026-10-08", fecha: "cozinha" as const }] };
    expect(avisosDosPedidos([p], lojaFechada, HOJE)).toEqual([
      { tipo: "dia-fechado", pedidoId: "fech", referencia: "DAM-0710-FECH", data: "2026-10-08" },
    ]);
    expect(avisosDosPedidos([p], cozinhaFechada, HOJE)).toEqual([]);
  });
});

describe("o detalhe do pedido", () => {
  it("o que falta pagar calcula-se, e nunca é negativo", () => {
    expect(faltaPagarCent({ totalCent: 4000, pagoOnlineCent: 1200 })).toBe(2800);
    expect(faltaPagarCent({ totalCent: 4000, pagoOnlineCent: 4000 })).toBe(0);
  });

  it("o histórico sai das datas do pedido, por ordem", () => {
    const p = pedido("hist", {
      impressoEm: lisboa(10, 5, 9, 6),
      entregueEm: lisboa(10, 8, 15, 2),
    });
    expect(historicoDe(p).map((e) => e.o)).toEqual(["criado", "pago", "impresso", "entregue"]);
  });
});

describe("o que o balcão mostra", () => {
  it("o pagamento lê-se em grande: PAGO, ou o que falta", () => {
    expect(rotuloPagamento({ totalCent: 4000, pagoOnlineCent: 4000 })).toBe("PAGO");
    expect(rotuloPagamento({ totalCent: 4000, pagoOnlineCent: 2750 }).replace(/\s/g, " ")).toBe(
      "SINAL PAGO · FALTA 12,50 €",
    );
  });

  it("o dia por extenso é o de Lisboa", () => {
    expect(diaPorExtenso(new Date("2026-07-15T23:30:00Z"))).toBe("quinta-feira, 16 de julho");
  });

  it("na primeira leitura não há novidades — abrir o painel não é receber os pedidos todos", () => {
    expect(novidades(null, [pedido("aaaa")])).toEqual({ novos: [], cancelados: [] });
  });

  it("um pago que não estava lá é novo; um pago que passou a cancelado é cancelado", () => {
    const antes = new Map<string, Pedido["estado"]>([
      ["aaaa", "pago"],
      ["bbbb", "pago"],
    ]);
    const resultado = novidades(antes, [
      pedido("aaaa"),
      pedido("bbbb", { estado: "cancelado" }),
      pedido("cccc"),
      pedido("dddd", { estado: "entregue" }),
    ]);
    expect(resultado.novos.map((p) => p.id)).toEqual(["cccc"]);
    expect(resultado.cancelados.map((p) => p.id)).toEqual(["bbbb"]);
  });
});

describe("os formulários da gestão", () => {
  it("euros escritos à mão passam a cêntimos inteiros, sem decimais pelo caminho", () => {
    expect(paraCent("12,50")).toBe(1250);
    expect(paraCent("12.5")).toBe(1250);
    expect(paraCent("0,29")).toBe(29);
    expect(paraCent("30")).toBe(3000);
    expect(paraCent(" 15,00 € ")).toBe(1500);
  });

  it("o que não é um valor em euros é recusado", () => {
    for (const errado of ["", "abc", "12,505", "-3", "1e3", "12,"]) expect(paraCent(errado), errado).toBeNull();
  });

  it("os dias do filtro vão da meia-noite de Lisboa ao fim do último dia", () => {
    const { desde, ate } = intervaloDeDias("2026-07-15", "2026-07-16");
    expect(desde?.toISOString()).toBe("2026-07-14T23:00:00.000Z");
    expect(ate?.toISOString()).toBe("2026-07-16T22:59:59.999Z");
  });

  it("um dia em branco ou mal escrito não filtra", () => {
    expect(intervaloDeDias(null, "15/07")).toEqual({});
  });
});

describe("avisos tratados", () => {
  const HOJE = lisboa(10, 7, 10);

  it("um aviso tratado sai; num duplicado, basta um dos dois", () => {
    expect(avisosDosPedidos([pedido("tard", { chegouTarde: true, avisosTratados: ["chegou-tarde"] })], CASA, HOJE)).toEqual([]);
    const a = pedido("aaaa");
    const b = pedido("bbbb", { pagoEm: lisboa(10, 5, 9, 8), avisosTratados: ["possivel-duplicado"] });
    expect(avisosDosPedidos([a, b], CASA, HOJE)).toEqual([]);
  });

  it("um reembolso falhado avisa, seja de que dia for, até ser tratado", () => {
    const falhado = pedido("reem", {
      estado: "cancelado",
      levantamentoEm: lisboa(10, 1, 10),
      reembolsos: [{ id: "r1", valorCent: 1000, estado: "falhado", pedidoEm: lisboa(10, 1, 9) }],
    });
    expect(avisosDosPedidos([falhado], CASA, HOJE)).toEqual([
      { tipo: "reembolso-falhado", pedidoId: "reem", referencia: "DAM-0710-REEM" },
    ]);
    expect(avisosDosPedidos([{ ...falhado, avisosTratados: ["reembolso-falhado"] }], CASA, HOJE)).toEqual([]);
  });

  it("o histórico mostra a mudança de data e os reembolsos, com valor e estado", () => {
    const p = pedido("hist", {
      reagendadoEm: lisboa(10, 6, 12),
      reembolsos: [{ id: "r1", valorCent: 1250, estado: "concluido", pedidoEm: lisboa(10, 6, 13) }],
    });
    const eventos = historicoDe(p);
    expect(eventos.map((e) => e.o)).toEqual(["criado", "pago", "reagendado", "reembolso"]);
    expect(eventos.at(-1)?.detalhe?.replace(/\s/g, " ")).toBe("12,50 € · concluído");
  });
});

describe("os produtos, na gestão", () => {
  it("a entrada do formulário passa no esquema, sem o id nem o que tem função própria", async () => {
    const { EsquemaEntradaProduto } = await import("@/lib/dados/tipos");
    const kit = CATALOGO_JSON.find((p) => p.familia === "festa")!;
    const entrada = entradaDoProduto({ ...kit, alergenios: [] });
    expect(entrada).not.toHaveProperty("id");
    expect(entrada).not.toHaveProperty("arquivado");
    expect(EsquemaEntradaProduto.safeParse(entrada).success).toBe(true);
  });

  it("filtra por nome sem acentos, por família e pelo que falta preencher", () => {
    const todos = CATALOGO_JSON;
    expect(filtrarProdutos(todos, { procura: "pao", vista: "todos", familia: "todas" }).every((p) => /p[ãa]o/i.test(p.nome.pt))).toBe(true);
    expect(filtrarProdutos(todos, { procura: "", vista: "todos", familia: "festa" })).toHaveLength(3);
    expect(filtrarProdutos(todos, { procura: "", vista: "por-preencher", familia: "todas" })).toHaveLength(107);
  });

  it("os arquivados só aparecem na vista deles", () => {
    const [a, ...resto] = CATALOGO_JSON;
    const lista = [{ ...a, arquivado: true }, ...resto];
    expect(filtrarProdutos(lista, { procura: "", vista: "todos", familia: "todas" })).toHaveLength(106);
    expect(filtrarProdutos(lista, { procura: "", vista: "arquivados", familia: "todas" }).map((p) => p.id)).toEqual([a.id]);
  });
});

