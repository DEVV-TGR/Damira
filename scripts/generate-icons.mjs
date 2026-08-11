/**
 * Gera o favicon e os ícones da app a partir das iniciais em `marca.json`.
 *
 *   npm run icons
 *
 * ⚠️ **É um marcador de lugar, tal como o `Marca.tsx`.** O monograma "SB" em
 * caixa alta sobre magenta serve para o site não andar com o ícone do Next, não
 * para ficar. Quando aparecer o logótipo em vetor — as mãos a segurar o
 * hambúrguer —, troca-se o SVG aqui dentro **e** corre-se este script outra vez,
 * ao mesmo tempo: são dois sítios e esquecer um deixa o site com duas marcas.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "src", "app");

const marca = JSON.parse(
  await readFile(join(raiz, "src", "data", "marca.json"), "utf8"),
);

/* As iniciais saem do nome — muda o nome, mudam os ícones. */
const iniciais = marca.nome
  .split(/\s+/)
  .map((palavra) => palavra[0])
  .join("")
  .toUpperCase();

/* O magenta da marca, o mesmo de `globals.css`. Um ícone é sempre grande o
   suficiente para o contraste do texto pequeno não se aplicar. */
const MAGENTA = "#ec008c";

const svg = (lado) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${MAGENTA}"/>
  <text x="50" y="50" fill="#ffffff"
        font-family="Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${iniciais.length > 2 ? 34 : 46}"
        text-anchor="middle" dominant-baseline="central"
        letter-spacing="-1">${iniciais}</text>
</svg>`;

const png = (lado) => sharp(Buffer.from(svg(lado))).png().toBuffer();

/* O `favicon.ico` é servido como PNG: todos os browsers com quota de mercado
   aceitam-no há mais de uma década, e poupa uma dependência só para empacotar
   ICO. */
await writeFile(join(destino, "favicon.ico"), await png(48));
await writeFile(join(destino, "icon.png"), await png(512));
await writeFile(join(destino, "apple-icon.png"), await png(180));

console.log(`Ícones gerados com as iniciais "${iniciais}".`);
