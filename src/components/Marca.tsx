import { marca } from "@/data/marca";

/**
 * O nome escrito em tipo de display, à falta do logótipo.
 *
 * ⚠️ **É um marcador de lugar.** O logótipo a sério — as mãos a segurar o
 * hambúrguer, dentro da moldura — existe no menu impresso mas só rasterizado;
 * quando aparecer em vetor, troca-se o interior deste componente e muda em todo
 * o site de uma vez. Ver o README.
 *
 * `empilhado` põe uma palavra por linha, como no impresso. O cabeçalho usa a
 * versão em linha, que é a única que cabe numa barra de altura fixa.
 */
export function Marca({
  className = "",
  empilhado = false,
}: {
  className?: string;
  empilhado?: boolean;
}) {
  if (!empilhado) {
    return <span className={`titulo-display ${className}`}>{marca.nome}</span>;
  }

  return (
    <span className={`titulo-display leading-[0.85] ${className}`}>
      {marca.nome.split(" ").map((palavra) => (
        <span key={palavra} className="block">
          {palavra}
        </span>
      ))}
    </span>
  );
}
