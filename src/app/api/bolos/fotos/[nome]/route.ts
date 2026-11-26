import { mostrarFotoDoBolo } from "@/lib/fotos-bolo";
import { emModoDeTeste } from "@/lib/modo-teste";

/** Uma foto do bolo, pelo nome (`bolos/<uuid>.webp` sem o `bolos/`). Ver `src/lib/fotos-bolo.ts`. */
export const dynamic = "force-dynamic";

export async function GET(_pedido: Request, { params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params;
  return mostrarFotoDoBolo(nome, { token: process.env.BLOB_READ_WRITE_TOKEN, modoDeTeste: emModoDeTeste() });
}
