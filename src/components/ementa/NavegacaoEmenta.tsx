import { useTranslations } from "next-intl";
import type { Carta } from "@/data/ementa";

/**
 * Quatro cartas e noventa e cinco artigos. Sem esta barra, chegar ao chocolate é
 * rolar por toda a carta vegan — e num telemóvel isso são vários segundos de
 * polegar.
 *
 * ## Porque salta para cartas e não para categorias
 *
 * Porque as categorias repetem-se entre cartas: há `doces` na carta da casa e
 * `doces` na vegan, `salgados` nas duas. Uma barra com "Doces · Salgados ·
 * Doces · Salgados" não é navegação, é um enigma. As cartas são quatro, têm
 * nomes que dizem alguma coisa a quem lê ("Vegan", "Sábado e domingo") e são a
 * divisão que existe mesmo no papel.
 *
 * São âncoras normais, sem JavaScript: funcionam com o site a carregar, ficam no
 * histórico do browser e podem ser partilhadas (`/ementa#vegan`). Um *scrollspy*
 * a destacar a secção activa exigia um componente de cliente e um
 * `IntersectionObserver` para pouco mais do que enfeite.
 */
export function NavegacaoEmenta({ cartas }: { cartas: Carta[] }) {
  const t = useTranslations("ementa");

  return (
    <nav
      aria-label={t("navegar")}
      className="sticky top-16 z-40 border-y-2 border-tinta bg-papel"
    >
      <ul className="envolvente flex gap-2 overflow-x-auto py-3 text-xs uppercase tracking-[0.15em] [scrollbar-width:none]">
        {cartas.map((carta) => (
          <li key={carta}>
            <a
              href={`#${carta}`}
              /* Utilitários e não uma classe `.bloco-*`: o Tailwind v4 não
                 aplica variantes (`hover:`) a classes de `@layer components`, e
                 um `hover:bloco-...` compila-se em silêncio para nada. */
              className="titulo-display block whitespace-nowrap border border-tinta px-3.5 py-1.5 transition-colors hover:bg-tinta hover:text-papel"
            >
              {t(`cartas.${carta}.curto`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
