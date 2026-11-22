/*
 * Gera o logótipo dos emails (`src/lib/emails/logotipo.ts`) a partir de `public/marca/logotipo.png`.
 *
 * Porque não se usa o PNG do site tal como está: é uma máscara de alfa a preto, e o site pinta-a
 * pelo CSS (`Marca.tsx`); um email não tem CSS que pinte uma imagem, por isso a cor vai já no
 * ficheiro — papel, para assentar na faixa a tijolo. E o PNG do site traz, à direita, um bocado
 * solto de outra letra do impresso, que no site o recorte esconde e no email apareceria.
 *
 * Porque vai em base64 dentro do código, e não como ficheiro: o email leva-o como anexo embutido
 * (`cid:`), e o servidor que envia (a fila, na Vercel) não tem garantido o `public/` no disco.
 *
 *   npm run marca:email
 *
 * ⚠️ Quando chegar o vetor do logótipo, trocar a origem aqui também — é o terceiro sítio, ao lado
 * do `Marca.tsx` e do `npm run icons`.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const ORIGEM = "public/marca/logotipo.png";
const DESTINO = "src/lib/emails/logotipo.ts";
const PAPEL = { r: 0xfa, g: 0xfb, b: 0xfb };
/** Largura a que aparece no email. A origem tem pouco mais de 200 px de letra: mais do que isto, desfoca. */
const LARGURA_NO_EMAIL = 150;

// O projeto compila os scripts em CommonJS, que não aceita await no topo.
async function gerar() {
  const { data, info } = await sharp(ORIGEM).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const colunaTemTinta = (x: number) => {
    for (let y = 0; y < info.height; y++) if (data[y * info.width + x] > 0) return true;
    return false;
  };
  // A marca solta é o último bloco de colunas, separado da palavra por um vão: corta-se no vão.
  let fim = info.width - 1;
  while (fim > 0 && colunaTemTinta(fim)) fim--;
  while (fim > 0 && !colunaTemTinta(fim)) fim--;
  // O sharp aplica o `trim` antes do `extract` se estiverem no mesmo pipeline (a armadilha 4 do
  // AGENTS.md, noutra forma): o recorte materializa-se primeiro.
  const cortado = await sharp(ORIGEM).extract({ left: 0, top: 0, width: fim + 1, height: info.height }).png().toBuffer();
  const recorte = await sharp(cortado).trim().png().toBuffer();
  const alfa = await sharp(recorte).extractChannel(3).toBuffer();
  const { width, height } = await sharp(recorte).metadata();
  const png = await sharp({ create: { width: width!, height: height!, channels: 3, background: PAPEL } })
    .joinChannel(alfa)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const altura = Math.round((LARGURA_NO_EMAIL * height!) / width!);
  writeFileSync(DESTINO, [
    "// Gerado por `npm run marca:email` (scripts/logotipo-email.ts). Não editar à mão.",
    "",
    "/** O logótipo da Damira a papel, para a faixa a tijolo do topo dos emails. */",
    "export const LOGOTIPO_EMAIL = {",
    `  cid: "logotipo-damira",`,
    `  largura: ${LARGURA_NO_EMAIL},`,
    `  altura: ${altura},`,
    `  base64: "${png.toString("base64")}",`,
    "} as const;",
    "",
  ].join("\n"));
  console.log(`${DESTINO}: ${width}×${height} px, ${png.length} bytes, mostrado a ${LARGURA_NO_EMAIL}×${altura}`);
}

void gerar();
