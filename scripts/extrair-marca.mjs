/**
 * Extrai o logótipo e o motivo gráfico da marca dos menus impressos para
 * `public/marca/`.
 *
 *   npm run marca
 *
 * A Damira tem dois sinais gráficos próprios e mais nada:
 *
 * - **o logótipo** — "damira", com o *m* desenhado como três ondas de vapor, e
 *   a assinatura "desde 1996" ao lado;
 * - **as ondas sozinhas** — o mesmo vapor, usado como carimbo no topo das
 *   páginas. É o `m` do logótipo recortado, e é por isso que funciona: repete
 *   uma letra da marca em vez de acrescentar um ícone novo.
 *
 * ## Porque saem como PNG de alfa
 *
 * O mesmo motivo do Santo Burga: guarda-se **só a forma** — opaco onde há
 * desenho, transparente onde não há — e no CSS usa-se como `mask-image` sobre
 * um bloco de cor. Um ficheiro serve o logo em creme sobre o preto, em preto
 * sobre o creme e as ondas em bordô, sem gerar três imagens.
 *
 * ⚠️ **Isto é um marcador de lugar, não o logótipo.** O que sai daqui é
 * rasterizado a partir de um PDF achatado a 300 dpi: chega para cabeçalho,
 * rodapé e ícones e não escala para lá disso. O vetor tem de vir do cliente —
 * ver o README.
 *
 * A origem é o `Menu Almoço Sábado e Domingo.pdf` e não o `Menu A4`: é o único
 * onde o logótipo aparece **branco sobre o preto da marca**, que é o contraste
 * que dá a máscara mais limpa. No A4 o logo não aparece de todo.
 */
import { mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import sharp from "sharp";

const correr = promisify(execFile);

const PDF = "referencias/Menu Almoço Sábado e Domingo.pdf";
const DESTINO = "public/marca";
const TEMP = ".marca-tmp";
/* 300 dpi: o traço fica com borda suave que serve de antisserrilhado à máscara. */
const DPI = 300;

/**
 * As coordenadas são em píxeis da página renderizada a 300 dpi (1753 × 2480) e
 * foram medidas a olho contra o recorte. Se algum dia o PDF de origem mudar de
 * paginação, é aqui que se mexe — e vê-se logo, porque o recorte sai torto.
 */
const RECORTES = [
  {
    nome: "logotipo",
    /* Só a palavra, sem a assinatura: é o que entra no cabeçalho, onde
       "desde 1996" a 14 px seria uma mancha ilegível. */
    x: 710, y: 2360, w: 250, h: 95,
  },
  {
    nome: "logotipo-assinado",
    /* Com o "desde 1996". Vai para o rodapé e para os dados de partilha, onde
       há espaço para o ler — e onde a data é argumento. */
    x: 710, y: 2360, w: 385, h: 95,
  },
  {
    nome: "ondas",
    /* O carimbo do topo. É o mesmo desenho do *m*, mas o do topo está em bordô
       sobre o preto e tem margem à volta — recortá-lo daqui evita andar a
       separar a letra das vizinhas. */
    x: 795, y: 20, w: 165, h: 120,
  },
];

await rm(TEMP, { recursive: true, force: true });
await mkdir(TEMP, { recursive: true });
await mkdir(DESTINO, { recursive: true });

await correr("pdftoppm", ["-r", String(DPI), "-png", "-f", "1", "-l", "1", PDF, join(TEMP, "p")]);

const pagina = join(TEMP, "p-1.png");

for (const { nome, x, y, w, h } of RECORTES) {
  /* `toBuffer()` no meio não é decoração: o `sharp` avalia o pipeline por
     inteiro no fim, e encadear medições ou operações de canal depois de um
     `extract` opera sobre a imagem de entrada, não sobre o recorte. Ver o
     AGENTS.md do Santo Burga, que foi onde isto mordeu. */
  const recorte = await sharp(pagina)
    .extract({ left: x, top: y, width: w, height: h })
    .toBuffer();

  /* O desenho é claro sobre fundo escuro, ao contrário do Santo Burga (escuro
     sobre claro). Por isso **não se inverte**: o cinzento já é, tal e qual, a
     opacidade que se quer — 255 no traço, 0 no fundo. O `linear` estica o que
     sobra do preto do papel, que nunca é 0 puro depois do JPEG. */
  const alfa = await sharp(recorte)
    .greyscale()
    .linear(1.6, -20)
    .toBuffer();

  const saida = join(DESTINO, `${nome}.png`);
  await sharp({
    create: { width: w, height: h, channels: 3, background: "#000000" },
  })
    .joinChannel(alfa)
    .png()
    .toFile(saida);

  console.log(`${saida}  ${w}×${h}`);
}

await rm(TEMP, { recursive: true, force: true });
console.log(`\n${RECORTES.length} peças em ${DESTINO}.`);
