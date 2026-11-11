import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { limparEvento, OPCOES_DO_SENTRY } from "./sentry";

const evento = (campos: Partial<ErrorEvent>) => ({ type: undefined, ...campos }) as ErrorEvent;
const valorDe = (resultado: ErrorEvent) => resultado.exception?.values?.[0]?.value;
const comValor = (value: string) => evento({ exception: { values: [{ type: "Error", value }] } });

describe("limparEvento", () => {
  it("tira a pessoa, o rasto e os argumentos do console", () => {
    const limpo = limparEvento(
      evento({
        user: { email: "joana@exemplo.pt", ip_address: "85.1.2.3" },
        breadcrumbs: [{ message: "POST /encomendas/pedido" }],
        extra: { arguments: ["joana@exemplo.pt"] },
      }),
    );
    expect(limpo.user).toBeUndefined();
    expect(limpo.breadcrumbs).toBeUndefined();
    expect(limpo.extra).toBeUndefined();
  });

  it("deixa do pedido só o método, o caminho e o browser", () => {
    const limpo = limparEvento(
      evento({
        request: {
          method: "POST",
          url: "https://damira.pt/pt/encomendas/pedido?email=joana@exemplo.pt#fim",
          query_string: "email=joana@exemplo.pt",
          data: { telefone: "912345678" },
          cookies: { sessao: "abc" },
          headers: { "User-Agent": "Firefox", Referer: "https://damira.pt/?nif=123456789" },
        },
      }),
    );
    expect(limpo.request).toEqual({
      method: "POST",
      url: "https://damira.pt/pt/encomendas/pedido",
      headers: { "User-Agent": "Firefox" },
    });
  });

  it("corta os valores que o Drizzle escreve no erro", () => {
    const limpo = limparEvento(
      comValor('Failed query: insert into "pedidos" ("nome") values ($1)\nparams: Joana Silva,Rua das Flores 12,912345678'),
    );
    expect(valorDe(limpo)).toBe('Failed query: insert into "pedidos" ("nome") values ($1)\nparams: [retirado]');
  });

  it.each([
    ["um email", "recusou joana.silva+bolos@exemplo.pt", "recusou [email]"],
    ["um telemóvel", "telefone 912345678 inválido", "telefone [número] inválido"],
    ["um telemóvel com indicativo e espaços", "ligar a +351 912 345 678", "ligar a [número]"],
    ["um NIF", "NIF 123456789", "NIF [número]"],
    ["um código postal", "1000-001 Lisboa", "[código postal] Lisboa"],
  ])("tapa %s", (_nome, texto, esperado) => {
    expect(valorDe(limparEvento(comValor(texto)))).toBe(esperado);
    expect(limparEvento(evento({ message: texto })).message).toBe(esperado);
  });

  it("não toca no que serve para encontrar o erro", () => {
    const texto = "[pedidos] DAM-0309-4F7K: o serviço de email recusou (422) em pi_3Pq, às 12:30";
    expect(valorDe(limparEvento(comValor(texto)))).toBe(texto);
  });

  it("tapa também a mensagem do console.error", () => {
    const limpo = limparEvento(evento({ logentry: { message: "recusou joana@exemplo.pt", params: ["joana@exemplo.pt"] } }));
    expect(limpo.logentry).toEqual({ message: "recusou [email]" });
  });
});

describe("OPCOES_DO_SENTRY", () => {
  it("desliga tudo o que o SDK recolhe por defeito", () => {
    expect(OPCOES_DO_SENTRY.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    });
    expect(OPCOES_DO_SENTRY.maxBreadcrumbs).toBe(0);
  });
});
