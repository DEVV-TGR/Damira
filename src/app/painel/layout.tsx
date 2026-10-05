import type { Metadata, Viewport } from "next";
import { corpo, display } from "@/lib/fontes";
import "../globals.css";

/**
 * O layout raiz do painel. O site não tem layout de raiz — os da loja vivem em
 * `[locale]` —, e o painel fica de fora de propósito (`painel.md`): é para a
 * equipa, só em português, e não passa pelo `next-intl` nem pelo `proxy.ts`.
 *
 * Sem cabeçalho, rodapé, cesto nem analytics da loja: no tablet do balcão cada
 * píxel é para os pedidos.
 */
export const metadata: Metadata = {
  title: "Painel — Damira",
  /* Fora dos motores de busca, e também no `robots.txt`. */
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1f1d1b" };

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${display.variable} ${corpo.variable}`}>
      <body className="min-h-dvh bg-papel-fundo text-tinta">{children}</body>
    </html>
  );
}
