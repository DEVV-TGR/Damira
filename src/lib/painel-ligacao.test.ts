import { describe, expect, it } from "vitest";
import { horaDeLisboa, semLigacao, textoSemLigacao } from "./painel-ligacao";

const AGORA = new Date("2026-10-07T09:42:30Z");
const segundosAntes = (s: number) => new Date(AGORA.getTime() - s * 1000);

describe("sem ligação", () => {
  it("uma resposta há 20 segundos ainda é ligação — uma volta lenta não acende o aviso", () => {
    expect(semLigacao(segundosAntes(20), AGORA, true)).toBe(false);
  });

  it("passados 25 segundos sem resposta, acende", () => {
    expect(semLigacao(segundosAntes(26), AGORA, true)).toBe(true);
  });

  it("se o browser diz que está sem rede, acende logo", () => {
    expect(semLigacao(segundosAntes(1), AGORA, false)).toBe(true);
  });
});

describe("a hora do aviso é a de Lisboa", () => {
  it("no verão, uma hora à frente de UTC", () => {
    expect(textoSemLigacao(new Date("2026-07-15T09:42:00Z"))).toBe(
      "Sem ligação desde as 10:42 — os pedidos novos não estão a aparecer",
    );
  });

  it("no inverno, igual a UTC", () => {
    expect(horaDeLisboa(new Date("2026-12-15T09:42:00Z"))).toBe("09:42");
  });
});
