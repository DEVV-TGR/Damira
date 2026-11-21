import { tratarEnvioDeFoto } from "@/lib/fotos";
import { contextoDoPainel } from "@/lib/painel-servidor";

/**
 * O token para enviar uma foto de um produto (`src/lib/fotos.ts`). Só liga as
 * peças. ⚠️ O papel sai da sessão, no servidor (regra 8 do `AGENTS.md`), e a rota
 * vive em `/painel` porque é aí que o cookie da sessão vale.
 */
export const dynamic = "force-dynamic";

export function POST(pedido: Request) {
  return tratarEnvioDeFoto(pedido, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    papel: async () => (await contextoDoPainel())?.papel ?? null,
    agora: () => new Date(),
  });
}
