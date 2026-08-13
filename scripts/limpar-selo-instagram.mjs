/**
 * Tira o crachá do Instagram de cima das miniaturas.
 *
 *   npm run instagram:selo            # public/instagram
 *   npm run instagram:selo -- <pasta>
 *
 * A grelha do perfil desenha um **quadrado branco arredondado no canto superior
 * direito** das publicações que são reel ou carrossel. As miniaturas saem de
 * capturas de ecrã dessa grelha (ver `importar-instagram.mjs`), por isso o
 * crachá vem gravado nos píxeis — e é interface de terceiros dentro do nosso
 * desenho, ao lado de uma fotografia da casa.
 *
 * ## Corta-se, não se pinta por cima
 *
 * Encher aquele canto com o que está à volta seria **inventar píxeis** e
 * apresentá-los como fotografia. Cortar a faixa de topo perde 26 px — 5,4 % da
 * altura — e não afirma nada que não esteja lá. Nos ladrilhos, que são todos
 * `object-cover`, a diferença não se vê.
 *
 * ## O limiar não foi escolhido a olho
 *
 * Mede-se a fracção de píxeis quase brancos na janela de 22×22 onde o crachá
 * assenta. Nas doze miniaturas actuais deu:
 *
 *     limpas:  0,0 · 0,0 · 0,0 · 0,0 · 0,0 · 0,0 · 6,2 %
 *     com crachá:  41,9 · 47,3 · 55,4 · 59,3 · 67,8 %
 *
 * Trinta e cinco pontos de intervalo entre os dois grupos. O limiar fica a meio,
 * nos 25 %, e não há como tropeçar nele.
 *
 * ⚠️ **Uma delas engana a olho.** A miniatura das cadeiras turquesa traz o
 * quadrado branco **vazio**, sem o triângulo, e ao tamanho a que se vê passa por
 * um reflexo no metal. Só apareceu ao medir — que é a razão de isto ser um
 * script e não uma lista escrita à mão.
 *
 * Correr duas vezes não faz mal: depois do corte, a janela já é fotografia e o
 * ficheiro fica como está.
 */
import { readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const pasta = process.argv[2] ?? "public/instagram";

/** A janela onde o crachá assenta, contada a partir do canto superior direito. */
const JANELA = { recuo: 25, topo: 5, lado: 22 };
/** Acima disto, é branco a mais para ser fotografia. Ver a tabela acima. */
const LIMIAR = 0.25;
/** Quase branco. O crachá é branco puro; um reflexo raramente enche 22×22. */
const CLARO = 230;
/**
 * O crachá ocupa dos 6 aos 25 px de altura. Vinte e seis leva-o inteiro e não
 * corta mais do que o preciso.
 */
const CORTE = 26;

const ficheiros = (await readdir(pasta))
  .filter((nome) => extname(nome).toLowerCase() === ".webp")
  .sort();

const limpos = [];
const intactos = [];

for (const nome of ficheiros) {
  const caminho = join(pasta, nome);
  const { width, height } = await sharp(caminho).metadata();

  const cinzentos = await sharp(caminho)
    .extract({
      left: width - JANELA.recuo,
      top: JANELA.topo,
      width: JANELA.lado,
      height: JANELA.lado,
    })
    /* ⚠️ O alfa de uma captura opaca tem média 255 e envenenava a conta — a
       mesma armadilha que já mordeu no importador. */
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer();

  let claros = 0;
  for (const valor of cinzentos) if (valor > CLARO) claros++;
  const fracao = claros / cinzentos.length;

  if (fracao <= LIMIAR) {
    intactos.push(`${nome} (${(fracao * 100).toFixed(1)}%)`);
    continue;
  }

  const cortada = await sharp(caminho)
    .extract({ left: 0, top: CORTE, width, height: height - CORTE })
    .webp({ quality: 84 })
    .toBuffer();

  await writeFile(caminho, cortada);
  limpos.push(`${nome} (${(fracao * 100).toFixed(1)}% → cortada para ${width}×${height - CORTE})`);
}

if (limpos.length > 0) console.log(`crachá removido:\n  ${limpos.join("\n  ")}`);
if (intactos.length > 0) console.log(`\nsem crachá:\n  ${intactos.join("\n  ")}`);
console.log(`\n${limpos.length} de ${ficheiros.length} limpas.`);
