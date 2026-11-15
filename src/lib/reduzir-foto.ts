/**
 * # Reduzir uma foto no browser, antes de a enviar (#32, #40)
 *
 * Uma foto de telemóvel tem 3–8 MB e 4000 px de lado; o site mostra-a a pouco
 * mais de 1000. Reduzida aqui, chega ao Blob com uma fração do peso, e o envio
 * por dados móveis, ao balcão, acaba antes de a gerente desistir
 * (`painel-gerente.md` › Fotos).
 *
 * ⚠️ **Volta-se sempre a desenhar a foto, mesmo que já seja pequena.** Desenhá-la
 * num `<canvas>` deita fora os metadados EXIF, e entre eles está o **sítio onde a
 * foto foi tirada**. Para a gerente é a morada da loja, que é pública; para um
 * cliente que manda a foto do filho para o bolo (#51) é a casa dele.
 *
 * ⚠️ **WebP, e JPEG quando o browser não o sabe escrever.** O Safari lê WebP mas
 * não o codifica num canvas: o `toBlob("image/webp")` devolve um PNG sem avisar,
 * que pesa dez vezes mais e o token do envio recusa. Num iPhone sai portanto JPEG,
 * que o servidor também aceita (`src/lib/fotos.ts`).
 */

/** O lado maior, em píxeis. Chega para a página de produto num ecrã de alta densidade. */
export const LADO_MAXIMO = 1600;

const QUALIDADE_WEBP = 0.82;
const QUALIDADE_JPEG = 0.85;

export type Medidas = { largura: number; altura: number };

/** As medidas reduzidas, com a proporção da original. Nunca aumenta uma foto pequena. */
export function medidasReduzidas(original: Medidas, maximo = LADO_MAXIMO): Medidas {
  const { largura, altura } = original;
  if (!(largura > 0 && altura > 0)) throw new RangeError("Uma foto sem medidas não se reduz.");
  const fator = Math.min(1, maximo / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

/** A extensão do endereço da foto, a partir do tipo que o browser conseguiu escrever. */
export const extensaoDe = (tipo: string): "webp" | "jpg" => (tipo === "image/webp" ? "webp" : "jpg");

export type FotoReduzida = {
  foto: Blob;
  /** As medidas da foto que a pessoa escolheu, antes de reduzir: é por elas que se sabe se dá para imprimir (#51). */
  original: Medidas;
};

export class FotoIlegivel extends Error {
  constructor() {
    super("O browser não conseguiu abrir esta foto.");
    this.name = "FotoIlegivel";
  }
}

/* Um `<img>` e não o `createImageBitmap`: os browsers rodam o `<img>` pela
   orientação do EXIF (uma foto tirada ao alto fica ao alto), e o
   `createImageBitmap` não o faz da mesma forma em todos. */
function abrir(ficheiro: Blob): Promise<HTMLImageElement> {
  const endereco = URL.createObjectURL(ficheiro);
  const imagem = new Image();
  imagem.decoding = "async";
  imagem.src = endereco;
  return imagem
    .decode()
    .then(() => imagem)
    .catch(() => {
      /* Um HEIC no Chrome do Android, um ficheiro que não é imagem. */
      throw new FotoIlegivel();
    })
    .finally(() => URL.revokeObjectURL(endereco));
}

const escrever = (tela: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob | null>((resolver) => tela.toBlob(resolver, tipo, qualidade));

/** Reduz a foto e devolve-a em WebP (ou JPEG, no Safari). Só no browser. */
export async function reduzirFoto(ficheiro: Blob, maximo = LADO_MAXIMO): Promise<FotoReduzida> {
  const imagem = await abrir(ficheiro);
  const original = { largura: imagem.naturalWidth, altura: imagem.naturalHeight };
  const { largura, altura } = medidasReduzidas(original, maximo);

  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d");
  if (!contexto) throw new FotoIlegivel();
  /* Um PNG com transparência ficava com o fundo preto em JPEG. */
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(imagem, 0, 0, largura, altura);

  const webp = await escrever(tela, "image/webp", QUALIDADE_WEBP);
  const foto = webp?.type === "image/webp" ? webp : await escrever(tela, "image/jpeg", QUALIDADE_JPEG);
  if (!foto) throw new FotoIlegivel();
  return { foto, original };
}
