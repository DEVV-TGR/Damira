import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { textoDosDiasSemEncomenda } from "./dias-sem-encomenda";

const agora = new TZDate(2026, 11, 1, 0, 30, "Europe/Lisbon");
describe("a nota dos dias sem encomenda", () => {
  it("agrupa dias curtos e não mostra intervalos passados nem fora da janela", () => {
    expect(textoDosDiasSemEncomenda([
      { de: "2026-12-23", ate: "2026-12-24" }, { de: "2026-12-30", ate: "2026-12-31" },
      { de: "2026-11-30", ate: "2026-11-30" }, { de: "2027-02-01", ate: "2027-02-01" },
    ], agora, 30, "pt")).toBe("23, 24, 30 e 31/12");
  });
  it("mantém o intervalo em curso e escreve os compridos por extenso", () => {
    expect(textoDosDiasSemEncomenda([{ de: "2026-11-30", ate: "2026-12-06" }], agora, 30, "pt")).toBe("de 30/11 a 06/12");
    expect(textoDosDiasSemEncomenda([{ de: "2026-12-23", ate: "2026-12-23" }], agora, 30, "en")).toBe("23/12");
  });
});
