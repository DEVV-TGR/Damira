/**
 * A seta de um `<summary>` que abre e fecha: aponta para baixo com a secção
 * fechada e roda para cima com ela aberta.
 *
 * ⚠️ **O marcador nativo sai e esta entra no lugar dele** (`list-none` e
 * `::-webkit-details-marker` no `<summary>`). O triângulo do browser fica à
 * esquerda, colado ao título, e muda de desenho de browser para browser; ao lado
 * de um título de 56 px lia-se como pontuação e não como controlo.
 *
 * Fica `aria-hidden`: o estado aberto/fechado já o anuncia o `<summary>`, que é
 * um botão nativo. Uma seta com nome era o leitor de ecrã a dizer duas vezes a
 * mesma coisa.
 *
 * ⚠️ **As classes estão escritas por inteiro, e não montadas com o nome do
 * grupo.** O Tailwind lê o código à procura de classes; um
 * `group-open/${grupo}:rotate-180` nunca chega ao CSS, e a seta deixava de rodar
 * sem erro nenhum.
 */
const RODA = {
  seccao: "group-open/seccao:rotate-180",
  categoria: "group-open/categoria:rotate-180",
} as const;

export function SetaMinimizar({
  grupo,
  pequena = false,
}: {
  /** O `<details>` a que a seta responde: `group/seccao` ou `group/categoria`. */
  grupo: keyof typeof RODA;
  /** Para as categorias, cujo título é uma etiqueta e não um título grande. */
  pequena?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border-2 border-tinta/20 transition-colors group-hover/sumario:border-tinta ${
        pequena ? "size-8" : "size-11"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${pequena ? "size-4" : "size-5"} transition-[rotate] duration-300 ease-(--ease-saida) motion-reduce:transition-none ${RODA[grupo]}`}
      >
        <path d="M5 7.5 10 12.5 15 7.5" />
      </svg>
    </span>
  );
}
