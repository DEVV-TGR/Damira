/**
 * Gera o favicon e os ícones da app a partir do motivo das ondas.
 *
 *   npm run icons
 *
 * ## Porque são as ondas e não o símbolo inteiro
 *
 * O Santo Burga, de onde este script vem, punha um monograma "SB" em caixa alta
 * sobre a cor da marca. Aqui isso daria "CD", que não diz nada a ninguém.
 *
 * O símbolo da casa é o vapor **e** o pão — mas ⚠️ **o pão não sobrevive a
 * 16 px**: o oval e os dois cortes lá dentro colapsam numa mancha castanha. As
 * três ondas são traços verticais separados e aguentam. A regra vem do cliente
 * e é boa: **o M para o que é pequeno, o pão para o que é grande.** O símbolo
 * completo vive nas marcas de água das capas, onde tem meia página.
 *
 * A origem é `public/marca/ondas.svg` — **vetor**, ao contrário do logótipo, que
 * é um PNG rasterizado de um PDF. O ícone de 512 px sai tão nítido como o de 48.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "src", "app");
const ondas = join(raiz, "public", "marca", "ondas.svg");

/* O tijolo da marca, o mesmo de `globals.css`. Um ícone é sempre grande o
   suficiente para o contraste do texto pequeno não se aplicar. */
const TIJOLO = "#923d38";
/* O papel da marca. Ver a mesma folha. */
const PAPEL = "#fafbfb";

/**
 * O desenho ocupa 54% do lado.
 *
 * ⚠️ **Não é uma escolha estética.** Um favicon de 16 px com o desenho a
 * sangrar até à margem lê-se como uma mancha; a 52%, as três ondas ainda se
 * distinguem umas das outras. Foi afinado a olhar para o separador do browser,
 * que é o único sítio onde este ficheiro é visto.
 */
const OCUPACAO = 0.54;

async function icone(lado) {
  const dentro = Math.round(lado * OCUPACAO);

  /* A máscara é alfa: opaca no traço, transparente no resto. Para a pintar de
     papel, compõe-se uma superfície de papel e usa-se a máscara como recorte —
     é o mesmo que o CSS faz com `mask-image`, e é por isso que existe um único
     ficheiro para todas as cores. */
  const alfa = await sharp(ondas, { density: 600 })
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

console.log("Ícones gerados a partir de public/marca/ondas.svg.");
