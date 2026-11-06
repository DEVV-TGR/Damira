import { getPayloadFromClientToken } from "@vercel/blob/client";
import { describe, expect, it, vi } from "vitest";
import { apagarFotos, fotosQueSairam, MAXIMO_POR_FOTO, tratarEnvioDeFoto, type DependenciasDoEnvio } from "./fotos";

/* Só a forma de um token: o `handleUpload` assina com ele sem ir à rede. */
const TOKEN = "vercel_blob_rw_lojateste_segredodeteste";
const AGORA = new Date("2026-11-06T10:00:00Z");
const LOJA = "https://abc123.public.blob.vercel-storage.com";

const dependencias = (alteracoes: Partial<DependenciasDoEnvio> = {}): DependenciasDoEnvio => ({
  token: TOKEN,
  papel: async () => "gerente",
  agora: () => AGORA,
  ...alteracoes,
});

const pedidoDeToken = (pathname: string) =>
  new Request("https://damira.test/painel/fotos", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname, multipart: false, clientPayload: null } }),
  });

const enviar = async (pedido: Request, deps = dependencias()) => {
  const resposta = await tratarEnvioDeFoto(pedido, deps);
  return { status: resposta.status, corpo: await resposta.json() };
};

describe("quem pode enviar", () => {
  it("a gerente recebe um token, sem a foto passar pelo nosso servidor", async () => {
    const { status, corpo } = await enviar(pedidoDeToken("produtos/nata.webp"));
    expect(status).toBe(200);
    expect(corpo.type).toBe("blob.generate-client-token");
    expect(corpo.clientToken).toMatch(/^vercel_blob_client_/);
  });

  it.each([
    ["sem sessão", null],
    ["o balcão", "funcionario"],
  ] as const)("%s não: esconder o botão não é proteger", async (_nome, papel) => {
    const { status, corpo } = await enviar(pedidoDeToken("produtos/nata.webp"), dependencias({ papel: async () => papel }));
    expect(status).toBe(403);
    expect(corpo.clientToken).toBeUndefined();
  });
});

describe("o que o token deixa enviar", () => {
  const payload = async () => getPayloadFromClientToken((await enviar(pedidoDeToken("produtos/nata.webp"))).corpo.clientToken);

  it("só WebP e JPEG, até ao tamanho máximo", async () => {
    expect(await payload()).toMatchObject({
      allowedContentTypes: ["image/webp", "image/jpeg"],
      maximumSizeInBytes: MAXIMO_POR_FOTO,
    });
  });

  it("um nome impossível de adivinhar, e nunca por cima de outra", async () => {
    expect(await payload()).toMatchObject({ addRandomSuffix: true });
    expect((await payload()).allowOverwrite).not.toBe(true);
  });

  it("vale dez minutos", async () => {
    expect((await payload()).validUntil).toBe(AGORA.getTime() + 10 * 60_000);
  });

  it.each(["outra-pasta/nata.webp", "produtos/../segredo.webp", "produtos/nata.exe", "produtos/nata.html", "produtos/.webp", ""])(
    "recusa o caminho «%s»",
    async (caminho) => {
      const { status, corpo } = await enviar(pedidoDeToken(caminho));
      expect(status).toBe(400);
      expect(corpo.clientToken).toBeUndefined();
    },
  );
});

describe("o que não é um pedido de token", () => {
  it("o aviso de envio concluído não se aceita: não pedimos aviso nenhum", async () => {
    const pedido = new Request("https://damira.test/painel/fotos", {
      method: "POST",
      body: JSON.stringify({ type: "blob.upload-completed", payload: { blob: {}, tokenPayload: null } }),
    });
    expect((await enviar(pedido)).status).toBe(400);
  });

  it("um corpo que não é JSON dá 400, e não rebenta", async () => {
    const pedido = new Request("https://damira.test/painel/fotos", { method: "POST", body: "não é json" });
    expect((await enviar(pedido)).status).toBe(400);
  });

  it("sem o token na Vercel, responde que não está configurado, e di-lo no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, corpo } = await enviar(pedidoDeToken("produtos/nata.webp"), dependencias({ token: undefined }));
    expect(status).toBe(503);
    expect(corpo).toEqual({ erro: "por-configurar" });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});

describe("trocar uma foto apaga a antiga", () => {
  it("só as que saíram", () => {
    expect(fotosQueSairam([`${LOJA}/a.webp`, `${LOJA}/b.webp`], [`${LOJA}/b.webp`, `${LOJA}/c.webp`])).toEqual([`${LOJA}/a.webp`]);
    expect(fotosQueSairam([`${LOJA}/a.webp`], [`${LOJA}/a.webp`])).toEqual([]);
  });

  it("⚠️ só as do Blob: as de `public/` e as de fora não são nossas para apagar", () => {
    expect(fotosQueSairam(["/fotos/montra.webp", "https://exemplo.com/a.webp", `${LOJA}/a.webp`], [])).toEqual([`${LOJA}/a.webp`]);
  });

  it("apaga as fotos, e sem nenhuma não vai à rede", async () => {
    const apagar = vi.fn(async () => {});
    await apagarFotos([`${LOJA}/a.webp`], apagar);
    expect(apagar).toHaveBeenCalledWith([`${LOJA}/a.webp`]);
    apagar.mockClear();
    await apagarFotos([], apagar);
    expect(apagar).not.toHaveBeenCalled();
  });

  it("⚠️ se apagar falhar, o produto já está gravado: fica no log, e não sobe", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(apagarFotos([`${LOJA}/a.webp`], async () => Promise.reject(new Error("rede")))).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
