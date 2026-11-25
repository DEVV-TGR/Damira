import "server-only";
import { after } from "next/server";
import { enviarEmailsPendentes } from "./enviar";

/** Chamar só depois de a transação que põe emails na fila ter terminado com sucesso. */
export function enviarDepois(): void {
  try {
    after(async () => { await enviarEmailsPendentes({ agora: new Date(), limite: 10 }); });
  } catch {
    // Nem a ausência de contexto do Next pode tornar um pedido gravado num erro no browser.
    console.error("[emails] after-indisponivel");
  }
}
