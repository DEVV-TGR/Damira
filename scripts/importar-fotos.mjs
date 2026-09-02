/**
 * Importa fotografias para `public/`, prontas a servir.
 *
 *   node scripts/importar-fotos.mjs <origem> <destino>
 *   node scripts/importar-fotos.mjs ~/fotos-leca public/casas/leca
 *
 * Redimensiona ao lado maior de 1600 px, converte para WebP e numera por ordem
 * alfabética da origem. **A ordem importa**: a primeira de cada casa é a capa do
 * bloco, e é a que tem de dizer num relance qual das duas casas é.
 *
 * Existe para a próxima remessa de fotografias ser um comando e não uma tarde
 * de Photoshop — e para todas as imagens do site terem o mesmo tratamento, que
 * é o que impede uma galeria com metade das fotos ao dobro do peso.
 */
import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const [origem, destino, ladoPedido] = process.argv.slice(2);

if (!origem || !destino) {
  console.error("uso: node scripts/importar-fotos.mjs <origem> <destino> [lado-maior]");
  process.exit(1);
}

/**
 * 1600 px chega para ecrãs Retina a toda a largura sem servir ficheiros de 2 MB.
 *
 * O terceiro argumento sobrepõe-no, e existe por causa do herói: aquele bloco
 * ocupa a largura toda do ecrã, e a 1600 px num monitor grande a ampliação
 * vê-se. ⚠️ **Não subir isto para todas as fotografias** — uma imagem de 2400 px
 * num cartão de 400 é peso servido para nada, e o cartão é o caso normal.
 */
const LADO_MAIOR = Number(ladoPedido) || 1600;

if (ladoPedido && !Number.isFinite(LADO_MAIOR)) {
  console.error(`lado-maior tem de ser um número: recebi "${ladoPedido}"`);
  process.exit(1);
}
const ACEITES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const ficheiros = (await readdir(origem))
  .filter((nome) => ACEITES.has(extname(nome).toLowerCase()))
  .sort();

if (ficheiros.length === 0) {
  console.error(`nada para importar em ${origem}`);
  process.exit(1);
}

await mkdir(destino, { recursive: true });

let n = 0;
for (const nome of ficheiros) {
  const saida = join(destino, `${String(++n).padStart(2, "0")}.webp`);
  const dados = await sharp(await readFile(join(origem, nome)))
    /* `withoutEnlargement` para uma foto pequena não ser esticada até ficar
       macia — mais vale servi-la ao tamanho que tem. */
    .resize(LADO_MAIOR, LADO_MAIOR, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(saida, dados);
  const { width, height } = await sharp(dados).metadata();
  console.log(`${saida}  ${width}×${height}  ${Math.round(dados.length / 1024)} kB`);
}

console.log(`\n${n} fotografias em ${destino}.`);
