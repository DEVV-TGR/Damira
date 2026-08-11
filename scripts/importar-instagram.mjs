/**
 * Recorta as fotografias da grelha do Instagram a partir de capturas de ecrã.
 *
 *   npm run instagram -- <pasta-com-capturas>
 *
 * ## Porque existe
 *
 * O Instagram do Santo Burga está atrás de login e não há forma de lá chegar por
 * programa. O que há são **capturas de ecrã do perfil**, e cada uma traz uma
 * grelha de miniaturas. Este script recorta essas miniaturas, deduplica o que se
 * repete entre capturas e grava-as em `public/instagram/`.
 *
 * ⚠️ **O que sai daqui tem 368 × 462 px** — é o tamanho a que a grelha do
 * Instagram serve as miniaturas, já comprimidas, e a captura comprime outra vez.
 * Isso não é um defeito a corrigir com ampliação: é o tecto, e decide onde estas
 * imagens podem entrar no site. Servem para ladrilhos de mosaico e para a faixa
 * a correr; **não servem para nada que apareça grande**. Ver o README.
 *
 * Quando o cliente mandar os originais, isto deixa de ser preciso.
 *
 * ## O que este script não resolve
 *
 * ⚠️ **Pode deixar a mesma fotografia duas vezes, com enquadramentos diferentes.**
 * Duas capturas em pontos de scroll distintos apanham a mesma imagem deslocada
 * algumas dezenas de píxeis, e as distâncias entre esses pares e entre
 * fotografias genuinamente diferentes **sobrepõem-se** — medi-o: 29 a 64 nos
 * duplicados contra 42 no par distinto mais próximo. Não há limiar que os separe,
 * e apertar mais começaria a deitar fora fotografias boas.
 *
 * Por isso a última poda é à mão. São vinte imagens a olhar uma vez; escrever
 * heurística para isso custava mais do que vale e falhava na remessa seguinte.
 */
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const origem = process.argv[2];

if (!origem) {
  console.error("uso: npm run instagram -- <pasta-com-capturas>");
  process.exit(1);
}

const DESTINO = "public/instagram";

/**
 * A geometria da grelha, medida em capturas de 2000 px de largura: quatro
 * colunas com goteira de dois píxeis.
 *
 * As linhas variam de captura para captura consoante o ponto de scroll, por isso
 * o script **procura-as** em vez de as ter escritas: a grelha tem goteiras
 * horizontais quase brancas, e é isso que as denuncia.
 */
const LARGURA_ESPERADA = 2000;
const COLUNAS = [258, 630, 1002, 1373];
/**
 * Medidos nas capturas, não estimados: a grelha do Instagram tem **passo de 492
 * px** com uma goteira de um píxel, o que dá uma célula de 491.
 *
 * A primeira versão deste script assumiu 462 e cortava todas as fotografias a
 * meio — e como o recorte continuava a "parecer uma fotografia", passou
 * despercebido até alguém olhar para as vinte de uma vez.
 */
const CELULA = { largura: 368, altura: 491 };
const PASSO = 492;
/**
 * Margem cortada a cada aresta.
 *
 * O desfasamento da grelha acerta em píxeis inteiros, mas capturas com pontos de
 * scroll diferentes ficam desalinhadas por três ou quatro — o suficiente para
 * entrar uma tira da interface do Instagram no topo do recorte. Uma tira branca
 * de cinco píxeis num ladrilho é visível e não se explica; seis píxeis de margem
 * eliminam-na e não custam nada.
 */
const MARGEM = 6;

/** Brilho médio de cada linha, medido só na largura da grelha. */
async function brilhoPorLinha(caminho, altura) {
  const largura = COLUNAS.at(-1) + CELULA.largura - COLUNAS[0];
  const raw = await sharp(caminho)
    .extract({ left: COLUNAS[0], top: 0, width: largura, height: altura })
    .greyscale()
    .raw()
    .toBuffer();

  const brilho = new Float64Array(altura);
  for (let y = 0; y < altura; y++) {
    let soma = 0;
    for (let x = 0; x < largura; x++) soma += raw[y * largura + x];
    brilho[y] = soma / largura;
  }
  return brilho;
}

/**
 * Um recorte só entra se **as quatro colunas** tiverem variação de fotografia.
 *
 * É o que separa uma linha da grelha de uma barra de ferramentas do browser ou
 * do cabeçalho do perfil: esses também têm ícones e contraste, mas não têm
 * quatro blocos de imagem lado a lado.
 *
 * ⚠️ **Duas armadilhas do `sharp` mordidas aqui, e as duas falham em silêncio.**
 *
 * 1. `stats()` mede a **imagem de entrada e ignora o pipeline**. Encadear
 *    `.extract().stats()` devolve as estatísticas da captura inteira, iguais
 *    para as quatro colunas — o filtro parecia funcionar e não filtrava nada.
 *    É preciso materializar o recorte com `toBuffer()` primeiro.
 * 2. Um PNG traz canal alfa, e o alfa de uma captura opaca tem média 255. Entrar
 *    com ele na conta da claridade fazia rejeitar tudo. Só os três primeiros.
 */
async function ehFotografia(caminho, topo) {
  for (const esquerda of COLUNAS) {
    /* A célula inteira **e** a sua faixa de topo.
       Verificar só a célula inteira deixava passar recortes que apanhavam a
       barra de destaques do perfil por cima de meia fotografia: a metade de
       baixo dava variação que chegava para o conjunto passar. A faixa de topo
       denuncia-os — num recorte bem alinhado ela já é fotografia. */
    for (const altura of [CELULA.altura, 70]) {
      const recorte = await sharp(caminho)
        .extract({ left: esquerda, top: topo, width: CELULA.largura, height: altura })
        .toBuffer();
      const { channels } = await sharp(recorte).stats();
      const cor = channels.slice(0, 3);
      /* Uma fotografia varia em todos os canais; um painel branco com um ícone
         tem variação num e quase nada nos outros. */
      const variacao = Math.min(...cor.map((c) => c.stdev));
      const claridade = Math.min(...cor.map((c) => c.mean));
      if (variacao < 22 || claridade > 228) return false;
    }
  }
  return true;
}

/**
 * Onde começa a primeira linha da grelha.
 *
 * Encaixa-se uma rede de passo 492 e ordenam-se os desfasamentos pelo brilho
 * médio das linhas que caem na goteira. **Mas o mais claro não é o certo**: as
 * barras do browser são branco puro e ganham a qualquer goteira. Por isso
 * percorre-se a lista por ordem e fica-se pelo primeiro desfasamento que produza
 * pelo menos uma linha com quatro fotografias.
 */
async function desfasamentoDaGrelha(caminho, altura) {
  const brilho = await brilhoPorLinha(caminho, altura);

  const candidatos = [];
  for (let d = 0; d < PASSO; d++) {
    let soma = 0;
    let n = 0;
    /* A goteira fica na linha imediatamente antes de cada célula. */
    for (let y = d - 1; y + CELULA.altura < altura; y += PASSO) {
      if (y < 0) continue;
      soma += brilho[y];
      n++;
    }
    if (n > 0) candidatos.push({ d, pontuacao: soma / n });
  }
  candidatos.sort((a, b) => b.pontuacao - a.pontuacao);

  for (const { d } of candidatos) {
    for (let topo = d; topo + CELULA.altura <= altura; topo += PASSO) {
      if (await ehFotografia(caminho, topo)) return afinar(caminho, d, altura);
    }
  }
  return null;
}

/**
 * Afina o desfasamento ao píxel.
 *
 * O encaixe grosseiro escolhe pelo brilho da goteira, e às vezes prende-se a uma
 * barra branca da interface a algumas dezenas de píxeis do sítio certo. O
 * sintoma não é um erro — é um recorte **bem formado mas mal enquadrado**, que
 * apanha uma tira de interface no topo e desliza a fotografia para baixo. Depois
 * a mesma fotografia sai duas vezes de duas capturas, com enquadramentos
 * diferentes de mais para a deduplicação as reconhecer.
 *
 * A afinação procura, à volta do palpite, a posição em que a **faixa de topo é
 * mais fotográfica** — porque num recorte alinhado a primeira linha de píxeis já
 * é fotografia, e num desalinhado é interface.
 */
async function afinar(caminho, desfasamento, altura) {
  let melhor = { d: desfasamento, pontuacao: -1 };

  for (let d = desfasamento - 80; d <= desfasamento + 80; d += 2) {
    if (d < 0 || d + CELULA.altura > altura) continue;

    let pior = Infinity;
    for (const esquerda of COLUNAS) {
      const faixa = await sharp(caminho)
        .extract({ left: esquerda, top: d, width: CELULA.largura, height: 16 })
        .toBuffer();
      const { channels } = await sharp(faixa).stats();
      const cor = channels.slice(0, 3);
      /* Variação alta e claridade baixa = fotografia; o inverso = interface. */
      const nota = Math.min(...cor.map((c) => c.stdev)) - Math.max(0, Math.min(...cor.map((c) => c.mean)) - 200);
      if (nota < pior) pior = nota;
    }

    if (pior > melhor.pontuacao) melhor = { d, pontuacao: pior };
  }

  return melhor.d;
}

await mkdir(DESTINO, { recursive: true });

const capturas = (await readdir(origem))
  .filter((n) => [".png", ".jpg", ".jpeg"].includes(extname(n).toLowerCase()))
  .sort();

/** Distância média por píxel entre duas miniaturas. */
function distancia(a, b) {
  let soma = 0;
  for (let i = 0; i < a.length; i++) soma += Math.abs(a[i] - b[i]);
  return soma / a.length;
}

const vistos = [];
let guardadas = 0;

for (const nome of capturas) {
  const caminho = join(origem, nome);
  const meta = await sharp(caminho).metadata();
  if (meta.width !== LARGURA_ESPERADA) {
    console.log(`  ${nome}: ${meta.width} px de largura — não é captura do perfil, ignorada`);
    continue;
  }

  const desfasamento = await desfasamentoDaGrelha(caminho, meta.height);
  if (desfasamento === null) {
    console.log(`  ${nome}: não encontrei grelha de fotografias, ignorada`);
    continue;
  }

  for (let topo = desfasamento; topo + CELULA.altura <= meta.height; topo += PASSO) {
    if (!(await ehFotografia(caminho, topo))) continue;

    for (const esquerda of COLUNAS) {
      const recorte = await sharp(caminho)
        .extract({
          left: esquerda + MARGEM,
          top: topo + MARGEM,
          width: CELULA.largura - MARGEM * 2,
          height: CELULA.altura - MARGEM * 2,
        })
        .toBuffer();

      /* A assinatura é do **centro** da imagem, não da imagem toda.
         Duas capturas com pontos de scroll diferentes enquadram a mesma
         fotografia alguns píxeis acima ou abaixo; uma assinatura da imagem
         inteira vê nisso duas fotografias diferentes e guarda as duas. O miolo
         é o que se mantém igual. */
      const mini = await sharp(recorte)
        .extract({
          left: Math.round((CELULA.largura - MARGEM * 2) * 0.15),
          top: Math.round((CELULA.altura - MARGEM * 2) * 0.15),
          width: Math.round((CELULA.largura - MARGEM * 2) * 0.7),
          height: Math.round((CELULA.altura - MARGEM * 2) * 0.7),
        })
        .resize(16, 16, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer();
      if (vistos.some((v) => distancia(v, mini) < 14)) continue;
      vistos.push(mini);

      /* **Sem redimensionar.** Ampliar não acrescenta detalhe e esconde o tecto
         real destas imagens de quem vier a decidir onde as usar. */
      await writeFile(
        join(DESTINO, `${String(++guardadas).padStart(2, "0")}.webp`),
        await sharp(recorte).webp({ quality: 84 }).toBuffer(),
      );
    }
  }
}

console.log(
  `\n${guardadas} fotografias em ${DESTINO}, a ${CELULA.largura - MARGEM * 2}×${CELULA.altura - MARGEM * 2} px.`,
);
