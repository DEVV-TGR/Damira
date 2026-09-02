"use client";

import { useTranslations } from "next-intl";
import { useCesto } from "./CestoProvider";
import type { ItemCesto } from "@/lib/cesto";

/**
 * O botão que junta um artigo ao pedido.
 *
 * ## O estado depois de carregar não é decoração
 *
 * ⚠️ Quando o artigo já está no cesto, o botão **mostra quantos** e continua a
 * funcionar para juntar mais. Um botão que fica igual depois de carregado deixa
 * a pessoa sem saber se acertou, e a reacção normal a isso é carregar outra vez
 * — o que num carrinho quer dizer pedir dois bolos por engano.
 *
 * ## Sem cesto, sem botão
 *
 * Fora do `CestoProvider` isto não renderiza nada. É a razão de o `useCesto`
 * devolver `null` em vez de atirar: um cartão reutilizado noutra página perde o
 * botão em vez de partir a página.
 */
export function BotaoJuntar({
  item,
  variante = "principal",
}: {
  item: Omit<ItemCesto, "quantidade">;
  variante?: "principal" | "discreta";
}) {
  const t = useTranslations("encomendas.cesto");
  const contexto = useCesto();
  if (!contexto) return null;

  const noCesto = contexto.cesto.find((i) => i.id === item.id);

  const base =
    "premivel alvo-toque inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold";
  const cor =
    variante === "principal"
      ? "bg-tijolo text-papel hover:bg-tinta"
      : "border-2 border-current hover:bg-tinta hover:text-papel";

  return (
    <button
      type="button"
      onClick={() => contexto.juntar(item)}
      className={`${base} ${cor}`}
    >
      {noCesto ? t("juntado") : t("juntar")}
      {noCesto && (
        <span className="rounded-full bg-papel/25 px-2 py-0.5 tabular-nums">
          {noCesto.quantidade}
        </span>
      )}
    </button>
  );
}
