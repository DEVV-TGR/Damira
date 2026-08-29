/**
 * Gera o favicon e os ícones da app a partir do motivo das ondas.
 *
 *   npm run icons
 *
 * ## Porque são as ondas e não as iniciais
 *
 * O Santo Burga, de onde este script vem, punha um monograma "SB" em caixa alta
 * sobre a cor da marca. Aqui isso daria "CD", que não diz nada a ninguém — e a
 * Damira tem uma coisa melhor: **as três ondas são o `m` do logótipo**, são o
 * único desenho próprio da marca e leem-se a 16 px, que é o tamanho a que um
 * favicon vive de verdade.
 *
 * ⚠️ **Continua a ser um marcador de lugar, tal como o `Marca.tsx`.** As ondas
 * saem de um PDF rasterizado a 300 dpi (ver `extrair-marca.mjs`). Quando
 * aparecer o logótipo em vetor, troca-se lá **e** corre-se este script outra
 * vez, ao mesmo tempo: são dois sítios e esquecer um deixa o site com duas
 * marcas.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "src", "app");
const ondas = join(raiz, "public", "marca", "ondas.png");

/* O tijolo da marca, o mesmo de `globals.css`. Um ícone é sempre grande o
   suficiente para o contraste do texto pequeno não se aplicar. */
const TIJOLO = "#923d38";
/* O papel da marca. Ver a mesma folha. */
const PAPEL = "#fafbfb";

/**
 * O desenho ocupa 52% do lado.
 *
 * ⚠️ **Não é uma escolha estética.** Um favicon de 16 px com o desenho a
 * sangrar até à margem lê-se como uma mancha; a 52%, as três ondas ainda se
 * distinguem umas das outras. Foi afinado a olhar para o separador do browser,
 * que é o único sítio onde este ficheiro é visto.
 */
const OCUPACAO = 0.52;

async function icone(lado) {
  const dentro = Math.round(lado * OCUPACAO);

  /* A máscara é alfa: opaca no traço, transparente no resto. Para a pintar de
     papel, compõe-se uma superfície de papel e usa-se a máscara como recorte —
     é o mesmo que o CSS faz com `mask-image`, e é por isso que existe um único
     ficheiro para todas as cores. */
  const alfa = await sharp(ondas)
    .resize(dentro, dentro, { fit: "inside" })
    .ensureAlpha()
    .extractChannel("alpha")
    .toBuffer();

  const { width, height } = await sharp(alfa).metadata();

  const desenho = await sharp({
    create: { width, height, channels: 3, background: PAPEL },
  })
    .joinChannel(alfa)
    .png()
    .toBuffer();

  return sharp({
    create: { width: lado, height: lado, channels: 4, background: TIJOLO },
  })
    .composite([{ input: desenho, gravity: "center" }])
    .png()
    .toBuffer();
}

/* O `favicon.ico` é servido como PNG: todos os browsers com quota de mercado
   aceitam-no há mais de uma década, e poupa uma dependência só para empacotar
   ICO. */
await writeFile(join(destino, "favicon.ico"), await icone(48));
await writeFile(join(destino, "icon.png"), await icone(512));
await writeFile(join(destino, "apple-icon.png"), await icone(180));

console.log("Ícones gerados a partir de public/marca/ondas.png.");
