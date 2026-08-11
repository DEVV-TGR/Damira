import { marca } from "@/data/marca";

/** 358 × 760 — a proporção do desenho, para a largura sair da altura sozinha. */
const PROPORCAO = 358 / 760;

/**
 * O logótipo: as mãos a segurar o hambúrguer, dentro da moldura, mais o nome.
 *
 * O desenho é o do menu impresso, extraído do PDF como máscara de alfa (ver
 * `scripts/extrair-tracos.mjs`). Ser máscara e não imagem é o que permite ao
 * traço tomar a cor do texto à volta — a magenta no papel, a papel sobre a
 * tinta — sem gerar uma imagem por cor.
 *
 * Deixou de ser marcador de lugar. O que continua a faltar é o **vetor**: isto
 * é rasterizado a 300 dpi e não escala para lá de umas centenas de pixéis. Para
 * cabeçalho, rodapé e ícones chega; para um outdoor não.
 */
export function Marca({
  className = "",
  empilhado = false,
}: {
  className?: string;
  empilhado?: boolean;
}) {
  const desenho = (altura: string) => (
    <span
      aria-hidden
      className="traco block shrink-0"
      style={{
        height: altura,
        width: `calc(${altura} * ${PROPORCAO})`,
        maskImage: "url(/tracos/logotipo.png)",
        WebkitMaskImage: "url(/tracos/logotipo.png)",
      }}
    />
  );

  if (empilhado) {
    return (
      <span className={`flex flex-col gap-4 ${className}`}>
        {desenho("4.5em")}
        <span className="titulo-display leading-[0.85]">
          {marca.nome.split(" ").map((palavra) => (
            <span key={palavra} className="block">
              {palavra}
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {desenho("1.7em")}
      <span
        className="titulo-display"
        style={{ fontVariationSettings: '"wdth" 80, "opsz" 20' }}
      >
        {marca.nome}
      </span>
    </span>
  );
}
