import { useTranslations } from "next-intl";
import type { Categoria } from "@/data/ementa";

/**
 * Doze secções e cento e vinte e dois artigos. Sem esta barra, chegar às
 * sobremesas é rolar por toda a carta de novilho — e num telemóvel isso são
 * vários segundos de polegar.
 *
 * São âncoras normais, sem JavaScript: funcionam com o site a carregar, ficam no
 * histórico do browser e podem ser partilhadas (`/ementa#sobremesas`). Um
 * *scrollspy* a destacar a secção activa exigia um componente de cliente e um
 * `IntersectionObserver` para pouco mais do que enfeite.
 */
export function NavegacaoEmenta({ categorias }: { categorias: Categoria[] }) {
  const t = useTranslations("ementa");

  return (
    <nav
      aria-label={t("navegar")}
      className="sticky top-16 z-40 border-y-2 border-tinta bg-papel"
    >
      {/* Rola na horizontal em vez de partir para duas linhas: doze etiquetas
          empilhadas comiam metade do primeiro ecrã de um telemóvel. */}
      <ul className="envolvente flex gap-2 overflow-x-auto py-3 text-xs uppercase tracking-[0.15em] [scrollbar-width:none]">
        {categorias.map((categoria) => (
          <li key={categoria}>
            <a
              href={`#${categoria}`}
              /* Utilitários e não a classe `.bloco-magenta-texto`: o Tailwind v4
                 não aplica variantes (`hover:`) a classes de `@layer components`,
                 e um `hover:bloco-...` compila-se em silêncio para nada. */
              className="titulo-display block whitespace-nowrap border border-tinta px-3.5 py-1.5 transition-colors hover:bg-tinta hover:text-papel"
            >
              {t(`categorias.${categoria}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
