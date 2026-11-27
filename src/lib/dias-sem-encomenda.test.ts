import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { partesDosDiasSemEncomenda } from "./dias-sem-encomenda";

const agora = new TZDate(2026, 11, 1, 0, 30, "Europe/Lisbon");
describe("a nota dos dias sem encomenda", () => {
  it("agrupa dias curtos e não mostra intervalos passados nem fora da janela", () => {
    expect(partesDosDiasSemEncomenda([
      { de: "2026-12-23", ate: "2026-12-24" }, { de: "2026-12-30", ate: "2026-12-31" },
      { de: "2026-11-30", ate: "2026-11-30" }, { de: "2027-02-01", ate: "2027-02-01" },
    ], agora, 30, "pt")).toEqual({ dias: "23, 24, 30 e 31/12", intervalos: [] });
  });
  it("mantém os extremos dos intervalos separados das palavras da tradução", () => {
    expect(partesDosDiasSemEncomenda([{ de: "2026-11-30", ate: "2026-12-06" }], agora, 30, "pt"))
      .toEqual({ dias: null, intervalos: [{ de: "30/11", ate: "6/12" }] });
    expect(partesDosDiasSemEncomenda([{ de: "2026-12-23", ate: "2026-12-23" }], agora, 30, "en"))
      .toEqual({ dias: "23/12", intervalos: [] });
  });
  it("não põe zeros nos dias e separa dias soltos dos intervalos em ambas as línguas", () => {
    const datas = [{ de: "2026-12-02", ate: "2026-12-02" }, { de: "2026-12-23", ate: "2026-12-24" }, { de: "2026-12-10", ate: "2026-12-16" }];
    for (const locale of ["pt", "en"] as const) {
      expect(partesDosDiasSemEncomenda(datas, agora, 30, locale)).toEqual({
        dias: locale === "pt" ? "2, 23 e 24/12" : "2, 23, and 24/12",
        intervalos: [{ de: "10/12", ate: "16/12" }],
      });
    }
  });
  it("não devolve conteúdo quando não há datas a mostrar", () => {
    expect(partesDosDiasSemEncomenda([], agora, 30, "pt")).toEqual({ dias: null, intervalos: [] });
  });
});
