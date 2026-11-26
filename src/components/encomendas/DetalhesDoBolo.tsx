"use client";

import { useTranslations } from "next-intl";
import type { ItemCesto } from "@/lib/cesto";

/**
 * O bolo personalizado no cesto e no resumo do pedido: as escolhas, uma por
 * linha, e quantas fotos leva. Sem isto a linha dizia só «Bolo personalizado»,
 * e quem revia o pedido antes de o enviar não via o que tinha montado.
 */
export function DetalhesDoBolo({ item }: { item: Pick<ItemCesto, "bolo" | "detalhes"> }) {
  const t = useTranslations("produto.bolo");
  if (!item.bolo) return null;
  const fotos = [
    item.bolo.fotosReferencia.length > 0 ? t("fotosNoCesto", { n: item.bolo.fotosReferencia.length }) : null,
    item.bolo.fotoImprimir ? t("fotoNoCesto") : null,
  ].filter(Boolean);
  return (
    <ul className="mt-1 text-sm text-tinta-suave">
      {(item.detalhes ?? []).map((linha) => (
        <li key={linha}>{linha}</li>
      ))}
      {fotos.length > 0 && <li>{fotos.join(" · ")}</li>}
    </ul>
  );
}
