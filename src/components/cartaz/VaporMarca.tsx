/** Motivo da marca nos cartões de reels sem vídeo. */
export function VaporMarca({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 130" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round">
        {/* Os caminhos exactos de `public/marca/ondas.svg`. Não são uma
            aproximação do desenho: são o desenho. */}
        <path d="M22 116C14 96 32 84 24 64c-5-13 2-24 4-30" pathLength={1} />
        <path d="M62 116C54 94 72 82 64 60c-5-14 2-26 4-32" pathLength={1} />
        <path d="M102 116C94 92 112 80 104 56c-5-15 2-28 4-34" pathLength={1} />
      </g>
    </svg>
  );
}
