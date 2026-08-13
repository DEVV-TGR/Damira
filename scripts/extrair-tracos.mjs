/**
 * Extrai as ilustrações a traço do menu impresso para `public/tracos/`.
 *
 *   npm run tracos
 *
 * O impresso traz desenhos a um traço — o logótipo (as mãos a segurar o
 * hambúrguer), o hambúrguer grande e a taça de sangria — que são a única
 * ilustração própria que a marca tem. Usá-los é a diferença entre grafismo do
 * Santo Burga e ícones de biblioteca.
 *
 * ## Porque saem como PNG de alfa e não como imagem normal
 *
 * O que se guarda é **só a forma**: preto opaco onde há traço, transparente onde
 * não há. No CSS usa-se como `mask-image` sobre um bloco de cor, e o mesmo
 * ficheiro serve para desenhar o traço a magenta, a turquesa ou a tinta sem
 * gerar três imagens. É também o que permite mudar a cor num tema sem voltar
 * aqui.
 *
 * Cada desenho vive no impresso sobre um fundo chapado — traço escuro sobre
 * turquesa, traço magenta sobre coral. A `chave` de cada recorte é o par de
 * valores que separa um do outro depois de passar a cinzentos e inverter:
 * abaixo de `corte` é fundo, acima é traço, e o `ganho` estica o que sobra até
 * ao preto e ao branco. Foram afinados a olho contra o PDF — se um desenho sair
 * com fundo sujo ou com o traço comido, é aqui que se mexe.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import sharp from "sharp";

const correr = promisify(execFile);

const PDF = "referencias/Santo-burga_MENU_2024_PT.pdf";
const DESTINO = "public/tracos";
const TEMP = ".tracos-tmp";
/* 300 dpi: o traço fica com borda suave que serve de antisserrilhado à máscara. */
const DPI = 300;

const RECORTES = [
  {
    nome: "logotipo",
    /* As mãos a segurar o hambúrguer, dentro da moldura. É o logótipo. */
    pagina: 1, x: 203, y: 193, w: 358, h: 760,
    corte: 100, ganho: 2.6,
  },
  {
    nome: "hamburguer",
    /* O hambúrguer grande, em magenta sobre turquesa, ao fundo da página 1. */
    pagina: 1, x: 2145, y: 2378, w: 950, h: 960,
    corte: 95, ganho: 3,
  },
  {
    nome: "taca",
    /* A taça de sangria, em magenta sobre coral, na página 2. */
    pagina: 2, x: 4130, y: 1620, w: 720, h: 1680,
    corte: 90, ganho: 3,
  },
];

await mkdir(DESTINO, { recursive: true });
await mkdir(TEMP, { recursive: true });

for (const r of RECORTES) {
  const prefixo = join(TEMP, r.nome);
  await correr("pdftoppm", [
    "-png", "-r", String(DPI),
    "-f", String(r.pagina), "-l", String(r.pagina),
    "-x", String(r.x), "-y", String(r.y),
    "-W", String(r.w), "-H", String(r.h),
    PDF, prefixo,
  ]);

  const origem = `${prefixo}-${r.pagina}.png`;

  /* Cinzentos → inverter (o traço passa a claro, o fundo a escuro) → esticar
     para o fundo cair a zero e o traço subir a 255. O resultado é a máscara. */
  const mascara = await sharp(origem)
    .greyscale()
    .negate()
    .linear(r.ganho, -r.corte * r.ganho)
    .toBuffer();

  const { width, height } = await sharp(mascara).metadata();

  /* Uma tela preta com a máscara colada como canal alfa. O preto nunca chega a
     ver-se — quem lhe dá cor é o `mask-image` do CSS. */
  const png = await sharp({
    create: { width, height, channels: 3, background: "#000000" },
  })
    .joinChannel(mascara)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const saida = join(DESTINO, `${r.nome}.png`);
  await writeFile(saida, png);
  console.log(`${saida}  ${width}×${height}  ${Math.round(png.length / 1024)} kB`);
}

await rm(TEMP, { recursive: true, force: true });
console.log(`\n${RECORTES.length} traços em ${DESTINO}.`);
