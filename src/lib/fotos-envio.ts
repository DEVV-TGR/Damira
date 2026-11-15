import { upload } from "@vercel/blob/client";
import { ROTA_DO_ENVIO } from "./fotos-rota";
import { extensaoDe } from "./reduzir-foto";

/**
 * Envia uma foto já reduzida (`reduzirFoto`: WebP, ou JPEG no Safari) diretamente
 * para o Vercel Blob, e devolve o endereço, que se grava com o produto. Para os
 * componentes de cliente: o token pede-se ao servidor, e a foto não passa por ele
 * (`fotos.ts`).
 *
 * ⚠️ O tipo e a extensão saem da foto e não se fixam em WebP: o Safari não escreve
 * WebP num canvas, e um JPEG enviado como `.webp` ficava com o tipo errado no Blob.
 */
export async function enviarFoto(foto: Blob): Promise<string> {
  const tipo = foto.type === "image/webp" ? "image/webp" : "image/jpeg";
  const { url } = await upload(`produtos/${crypto.randomUUID()}.${extensaoDe(tipo)}`, foto, {
    access: "public",
    handleUploadUrl: ROTA_DO_ENVIO,
    contentType: tipo,
  });
  return url;
}
