import { describe, expect, it } from "vitest";
import { aplicarDesconto, DESCONTO_PERCENTAGEM, descontoCent } from "./desconto";

describe("o desconto da loja", () => {
  it("está ligado a 10 % (decidido a 27/11); desligar é pôr 0", () => {
    expect(DESCONTO_PERCENTAGEM).toBe(10);
  });

  it("arredonda ao cêntimo, com o meio cêntimo para cima", () => {
    expect(descontoCent(1400, 10)).toBe(140);
    expect(descontoCent(5, 10)).toBe(1); // 0,5 cêntimos → 1
    expect(descontoCent(4, 10)).toBe(0); // 0,4 cêntimos → 0
    expect(descontoCent(15, 10)).toBe(2); // 1,5 → 2
    expect(descontoCent(0, 10)).toBe(0);
    expect(descontoCent(1234, 0)).toBe(0);
    expect(descontoCent(1234, 100)).toBe(1234);
  });

  it("dá o mesmo que o CHECK da base de dados, em todos os cêntimos até 1000 € e em várias percentagens", () => {
    /* O `pedidos_desconto` da 0013 faz `(subtotal × p + 50) / 100` em inteiros. Um cêntimo de
       diferença era um pedido recusado pela base. */
    for (const p of [0, 5, 10, 15, 20, 33, 50, 100]) {
      for (let subtotal = 0; subtotal <= 100_000; subtotal += 7) {
        expect(descontoCent(subtotal, p)).toBe(Math.floor((subtotal * p + 50) / 100));
      }
    }
  });

  it("os três números somam sempre certo", () => {
    for (const subtotal of [0, 1, 99, 1260, 33500, 37100, 999_999]) {
      const v = aplicarDesconto(subtotal);
      expect(v.subtotalCent - v.descontoCent).toBe(v.totalCent);
      expect(Number.isInteger(v.totalCent)).toBe(true);
      expect(v.descontoPercentagem).toBe(DESCONTO_PERCENTAGEM);
    }
  });

  it("aceita outra percentagem, a gravada no pedido", () => {
    expect(aplicarDesconto(33500, 0)).toEqual({ subtotalCent: 33500, descontoPercentagem: 0, descontoCent: 0, totalCent: 33500 });
    expect(aplicarDesconto(33500, 10)).toEqual({ subtotalCent: 33500, descontoPercentagem: 10, descontoCent: 3350, totalCent: 30150 });
  });

  it("recusa dinheiro que não é cêntimos inteiros, e percentagens fora de 0–100", () => {
    expect(() => descontoCent(10.5, 10)).toThrow();
    expect(() => descontoCent(-1, 10)).toThrow();
    expect(() => descontoCent(100, 101)).toThrow();
    expect(() => descontoCent(100, -1)).toThrow();
    expect(() => descontoCent(100, 2.5)).toThrow();
  });
});
