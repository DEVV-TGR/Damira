/**
 * Prepara os reels do Instagram para o site.
 *
 *   npm run reels                      # originais/reels → public/reels
 *   npm run reels -- <origem> <destino>
 *
 * De cada vídeo saem **dois** ficheiros com o mesmo nome: o `.mp4` que toca e o
 * `.webp` que é o cartaz. O componente `Reel` precisa dos dois — o cartaz é o
 * que se vê antes de o vídeo carregar, com `prefers-reduced-motion`, e em
 * qualquer browser que não consiga tocar.
 *
 * ## Porque não se serve o ficheiro original
 *
 * ⚠️ **O que sai do telemóvel é HEVC, e o HEVC não toca em Chrome nem em
 * Firefox.** Num Safari via-se o vídeo e em mais lado nenhum — que é o pior tipo
 * de defeito, porque quem programa em Mac não dá por ele. Daqui sai H.264, que
 * toca em tudo o que interessa desde 2010.
 *
 * Também não é só uma questão de codec: os originais pesam entre 2,5 e 9,3 MB
 * para 5 a 12 segundos. Quatro desses numa página são 30 MB.
 *
 * ## Os números, medidos e não estimados
 *
 * No mais pesado dos quatro (12 s), a 720 px de largura e 8 s de corte:
 *
 * | Codificação      | Peso   |
 * |------------------|--------|
 * | H.264 CRF 28     | 829 kB |
 * | **H.264 CRF 30** | 686 kB |
 * | H.264 CRF 32     | 569 kB |
 * | VP9 CRF 36       | 753 kB |
 *
 * **Não há webm.** O VP9 saiu *maior* do que o H.264 e duplicava o tempo de
 * codificação — servir dois formatos só se justifica quando o segundo ganha.
 *
 * ## O áudio sai
 *
 * `-an`, e não é só para poupar bytes: um vídeo que toca sozinho **tem** de
 * estar em silêncio (é o que os browsers exigem para deixar arrancar sem
 * clique). Uma faixa de áudio que nunca se ouve é peso morto e uma armadilha
 * para quem um dia tire o `muted` sem pensar.
 */
import { readdir, mkdir, rm } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";

const correr = promisify(execFile);

const origem = process.argv[2] ?? "originais/reels";
const destino = process.argv[3] ?? "public/reels";

/**
 * 720 px é a largura nativa dos ficheiros — não se amplia nada. É também o
 * tecto útil: o ladrilho maior do mosaico ronda os 480 px de CSS.
 */
const LARGURA = 720;
/**
 * Oito segundos. Três dos quatro reels já são mais curtos do que isto, por isso
 * na prática só corta o de doze — e um ciclo curto é melhor num ladrilho que
 * repete sem fim do que um plano que demora a voltar ao princípio.
 */
const SEGUNDOS = 8;
/** Ver a tabela acima. */
const CRF = 30;
/**
 * O cartaz sai a **um segundo** e não do primeiro fotograma: um vídeo de
 * telemóvel começa quase sempre com a exposição ainda a acertar ou a câmara em
 * movimento, e esse fotograma é o que fica parado no ecrã de quem pediu menos
 * movimento.
 */
const CARTAZ_EM = 1;

const ACEITES = new Set([".mov", ".mp4", ".m4v"]);

const ficheiros = (await readdir(origem))
  .filter((nome) => ACEITES.has(extname(nome).toLowerCase()))
  .sort();

if (ficheiros.length === 0) {
  console.error(`nada para preparar em ${origem}`);
  process.exit(1);
}

await mkdir(destino, { recursive: true });

for (const nome of ficheiros) {
  const id = basename(nome, extname(nome));
  const entrada = join(origem, nome);
  const video = join(destino, `${id}.mp4`);
  const cartaz = join(destino, `${id}.webp`);

  await correr(ffmpeg, [
    "-y", "-loglevel", "error",
    "-i", entrada,
    "-t", String(SEGUNDOS),
    "-an",
    /* `-2` mantém a proporção e garante altura par, que o H.264 exige. */
    "-vf", `scale=${LARGURA}:-2`,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", String(CRF),
    /* Sem isto o vídeo fica ilegível em browsers e leitores mais antigos. */
    "-pix_fmt", "yuv420p",
    /* Põe o índice no início do ficheiro: o vídeo começa a tocar enquanto
       descarrega, em vez de esperar pelo último byte. */
    "-movflags", "+faststart",
    video,
  ]);

  /* O fotograma sai em PNG para um ficheiro temporário e só depois vira WebP —
     encadear o `sharp` à saída do `ffmpeg` por `pipe` poupava um ficheiro e
     custava a legibilidade toda do script. */
  const temporario = join(destino, `${id}.cartaz.png`);
  await correr(ffmpeg, [
    "-y", "-loglevel", "error",
    "-ss", String(CARTAZ_EM),
    "-i", entrada,
    "-frames:v", "1",
    "-vf", `scale=${LARGURA}:-2`,
    temporario,
  ]);
  await sharp(temporario).webp({ quality: 80 }).toFile(cartaz);
  await rm(temporario);

  const { width, height } = await sharp(cartaz).metadata();
  const { size } = await (await import("node:fs/promises")).stat(video);
  console.log(
    `${video}  ${width}×${height}  ${Math.round(size / 1024)} kB  +  ${cartaz}`,
  );
}

console.log(`\n${ficheiros.length} reels em ${destino}.`);
