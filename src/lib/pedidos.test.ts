import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { quandoVoltaALoja } from "./pedidos";

const lisboa = (dia: number, h: number, m = 0) => new TZDate(2026, 9, dia, h, m, "Europe/Lisbon");

describe("até quando a loja está em pausa", () => {
  it("no mesmo dia, só a hora — de Lisboa", () => {
    expect(quandoVoltaALoja(lisboa(7, 11, 30), lisboa(7, 10), "pt-PT")).toBe("11:30");
  });

  it("noutro dia, o dia por extenso: «até às 07:00» lia-se como hoje", () => {
    expect(quandoVoltaALoja(lisboa(8, 7), lisboa(7, 20), "pt-PT")).toBe("quinta-feira, 8 de outubro, 07:00");
  });

  it("sem pausa, ou com a pausa já passada, nada", () => {
    expect(quandoVoltaALoja(null, lisboa(7, 10), "pt-PT")).toBeNull();
    expect(quandoVoltaALoja(lisboa(7, 9), lisboa(7, 10), "pt-PT")).toBeNull();
  });
});
