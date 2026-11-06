import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

/* ⚠️ Se isto passar a ir à base de dados, um monitor de 5 em 5 minutos mantém-na
   acordada para sempre (regra 6 do `AGENTS.md`). O mock rebenta se alguém a
   importar. */
vi.mock("@/lib/dados", () => {
  throw new Error("o /api/saude não pode tocar nos dados");
});

describe("/api/saude", () => {
  it("responde que a aplicação está de pé, sem cache", async () => {
    const resposta = GET();
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
    expect(await resposta.json()).toEqual({ ok: true });
  });
});
