import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { CATALOGO_JSON } from "@/lib/dados/json";
import type { ConfiguracaoDaCasa, Produto } from "@/lib/dados/tipos";
import { contarPorPreencher, diaDeLisboa, esgotadoHoje, fimDaPausa } from "./painel";

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
