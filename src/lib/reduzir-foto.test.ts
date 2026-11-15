import { describe, expect, it } from "vitest";
import { extensaoDe, LADO_MAXIMO, medidasReduzidas } from "./reduzir-foto";

describe("medidasReduzidas", () => {
  it("reduz o lado maior para 1600 e mantém a proporção", () => {
    expect(medidasReduzidas({ largura: 4032, altura: 3024 })).toEqual({ largura: 1600, altura: 1200 });
    expect(medidasReduzidas({ largura: 3024, altura: 4032 })).toEqual({ largura: 1200, altura: 1600 });
  });

  it("nunca aumenta uma foto pequena", () => {
    expect(medidasReduzidas({ largura: 800, altura: 600 })).toEqual({ largura: 800, altura: 600 });
    expect(medidasReduzidas({ largura: LADO_MAXIMO, altura: 10 })).toEqual({ largura: LADO_MAXIMO, altura: 10 });
  });

  it("aceita outro máximo", () => {
    expect(medidasReduzidas({ largura: 4000, altura: 2000 }, 1000)).toEqual({ largura: 1000, altura: 500 });
  });

  it("um panorama muito estreito não fica com zero píxeis", () => {
    expect(medidasReduzidas({ largura: 20000, altura: 5 })).toEqual({ largura: 1600, altura: 1 });
  });

  it("recusa uma foto sem medidas, em vez de desenhar uma tela vazia", () => {
    expect(() => medidasReduzidas({ largura: 0, altura: 300 })).toThrow(RangeError);
    expect(() => medidasReduzidas({ largura: Number.NaN, altura: 300 })).toThrow(RangeError);
  });
});

describe("extensaoDe", () => {
  it("WebP quando o browser o escreveu, JPEG em todos os outros casos", () => {
    expect(extensaoDe("image/webp")).toBe("webp");
    expect(extensaoDe("image/jpeg")).toBe("jpg");
  });
});
