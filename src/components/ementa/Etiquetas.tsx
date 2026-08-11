import { useTranslations } from "next-intl";

/**
 * O selo do impresso. Lá é um carimbo redondo cor-de-rosa; aqui é uma etiqueta,
 * porque um carimbo redondo com texto lá dentro ou fica ilegível em telemóvel ou
 * ocupa o espaço de duas linhas de ementa.
 *
 * Usa `bloco-magenta-texto` e não o magenta da marca — ver a tabela de contraste
 * em `globals.css`.
 */
export function SeloBestSeller() {
  const t = useTranslations("ementa");
  return (
    <span className="bloco-magenta-texto rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
      {t("bestSeller")}
    </span>
  );
}

/**
 * Pão rosa e pão azul, cada um na sua cor.
 *
 * O azul da etiqueta é o turquesa da marca, e não um azul qualquer: é a cor com
 * que o impresso escreve `.PÃO AZUL.`
 */
export function EtiquetaPao({ pao }: { pao: "rosa" | "azul" }) {
  const t = useTranslations("ementa.paes");
  const cor =
    pao === "rosa"
      ? "bloco-magenta-texto"
      : "bg-turquesa text-tinta";

  return (
    <span
      className={`${cor} rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider`}
    >
      {t(pao)}
    </span>
  );
}

export function EtiquetaVegetariano() {
  const t = useTranslations("ementa");
  return (
    <span className="rounded-full border border-tinta px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
      {t("vegetariano")}
    </span>
  );
}
