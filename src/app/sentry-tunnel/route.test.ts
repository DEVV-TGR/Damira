import { beforeEach, describe, expect, it, vi } from "vitest";

const encaminhar = vi.hoisted(() => vi.fn<(pedido: Request) => Promise<Response>>(async () => new Response(null, { status: 200 })));
vi.mock("@sentry/nextjs/tunnel", () => ({ POST: encaminhar }));

import { POST } from "./route";

describe("POST /sentry-tunnel", () => {
  beforeEach(() => encaminhar.mockClear());

  it("não deixa o IP de quem visita seguir para o Sentry", async () => {
    await POST(
      new Request("http://localhost/sentry-tunnel", {
        method: "POST",
        body: "envelope",
        headers: {
          "x-forwarded-for": "85.1.2.3",
          "x-vercel-forwarded-for": "85.1.2.3",
          "cf-connecting-ip": "85.1.2.3",
          "user-agent": "Firefox",
        },
      }),
    );

    const pedido = encaminhar.mock.calls[0][0];
    expect([...pedido.headers.keys()].filter((nome) => /ip|forwarded/.test(nome))).toEqual([]);
    expect(pedido.headers.get("user-agent")).toBe("Firefox");
    expect(await pedido.text()).toBe("envelope");
  });
});
