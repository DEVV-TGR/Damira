import { upload } from "@vercel/blob/client";
import { ROTA_DO_ENVIO } from "./fotos-rota";

/**
 * Envia uma foto já reduzida (WebP, ~1600 px) diretamente para o Vercel Blob, e
 * devolve o endereço, que se grava com o produto. Para os componentes de cliente:
 * o token pede-se ao servidor, e a foto não passa por ele (`fotos.ts`).
 */
export async function enviarFoto(foto: Blob): Promise<string> {
  const { url } = await upload(`produtos/${crypto.randomUUID()}.webp`, foto, {
    access: "public",
    handleUploadUrl: ROTA_DO_ENVIO,
    contentType: "image/webp",
  });
  return url;
}
