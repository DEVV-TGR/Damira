import { useTranslations } from "next-intl";

/**
 * A folha verde da carta vegan, reduzida a uma etiqueta.
 *
 * Usa `bloco-verde-texto` e não o verde da marca: papel sobre o verde da marca
 * dá 3,89:1 e uma etiqueta é texto pequeno. Ver a tabela em `globals.css`.
 *
 * ⚠️ **É a única etiqueta do site, e é de propósito.** O Santo Burga tinha três
 * — best seller, pão rosa, pão azul —, todas afirmadas pelo impresso dele. Os
 * impressos da Damira não marcam artigos mais pedidos nem nada equivalente; a
 * folha verde é o único selo que existe, e inventar um segundo era pôr o site a
 * afirmar coisas que a casa não afirma.
 */
export function EtiquetaVegan() {
  const t = useTranslations("ementa");
  return (
    <span className="bloco-verde-texto rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
      {t("vegan")}
    </span>
  );
}
