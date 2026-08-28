import { marca } from "@/data/marca";

/** As proporções dos dois desenhos, para a largura sair da altura sozinha. */
const PROPORCAO = 250 / 95;
const PROPORCAO_ASSINADO = 385 / 95;

/**
 * O logótipo: a palavra *damira*, com o **m** desenhado como as três ondas de
 * vapor, e — na variante assinada — o "desde 1996" ao lado.
 *
 * ## Porque não há texto nenhum a acompanhar o desenho
 *
 * No Santo Burga, de onde este componente vem, o logótipo era uma ilustração
 * (as mãos a segurar o hambúrguer) e o nome tinha de ser escrito ao lado. Aqui o
 * desenho **é** a palavra: pôr "Confeitaria Damira" em tipografia ao lado de um
 * logótipo que já diz "damira" é escrever o nome duas vezes.
 *
 * O nome continua a chegar a quem não vê a imagem: o desenho é uma máscara e não
 * tem texto alternativo, por isso quem o usa passa um `aria-label` — e é o que o
 * cabeçalho faz.
 *
 * Ser máscara e não imagem é o que permite ao logótipo tomar a cor do texto à
 * volta — tijolo no papel, papel sobre a tinta — sem gerar uma imagem por cor.
 *
 * ⚠️ **Continua a faltar o vetor.** Isto é rasterizado a 300 dpi a partir de um
 * PDF (ver `scripts/extrair-marca.mjs`): chega para cabeçalho, rodapé e ícones,
 * e não escala para lá disso.
 */
export function Marca({
  className = "",
  assinado = false,
}: {
  className?: string;
  assinado?: boolean;
}) {
  const ficheiro = assinado ? "logotipo-assinado" : "logotipo";
  const proporcao = assinado ? PROPORCAO_ASSINADO : PROPORCAO;

  return (
    <span
      aria-hidden
      className={`traco block shrink-0 ${className}`}
      style={{
        /* A altura vem do `font-size` de quem o usa: um `em` faz o logótipo
           crescer com a tipografia à volta em vez de andar a acertar pixéis em
           cada sítio onde entra. */
        height: "1em",
        width: `calc(1em * ${proporcao})`,
        maskImage: `url(/marca/${ficheiro}.png)`,
        WebkitMaskImage: `url(/marca/${ficheiro}.png)`,
      }}
    />
  );
}

/**
 * O nome por extenso, para quando é preciso texto a sério — o `aria-label` do
 * cabeçalho, o copyright do rodapé, os dados estruturados.
 *
 * Vive aqui, e não solto por três ficheiros, porque é o mesmo facto: sai do
 * `marca.json`.
 */
export const nomeDaMarca = () => marca.nome;
