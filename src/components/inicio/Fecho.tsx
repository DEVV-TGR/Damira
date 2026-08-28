import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Marca } from "@/components/Marca";
import { marca } from "@/data/marca";

/**
 * O fecho da homepage: o primeiro andar do bloco escuro que acaba a página.
 *
 * ## Uma cor só, do fecho ao fim
 *
 * O fecho e o rodapé partilham a **tinta** e leem-se como um bloco só. O tijolo
 * fica onde tem força — no herói e no botão daqui. ⚠️ Um bloco de cor entalado
 * entre o papel e o rodapé escuro fazia o fim da página ler-se como três coisas
 * seguidas em vez de uma aterragem; foi o defeito que este componente teve no
 * Santo Burga, e a correção veio com ele.
 *
 * ## A morada não está aqui
 *
 * Está na secção de contactos, logo acima, e no rodapé, logo abaixo. Uma
 * terceira vez no meio das duas não é reforço, é uma página que ninguém compôs.
 * O que este bloco tem de próprio é a marca em tamanho — o site nunca a mostra
 * assim grande em mais lado nenhum — e a única acção que falta a quem chegou ao
 * fim.
 */
export function Fecho() {
  const t = useTranslations("inicio.fecho");
  const inicio = useTranslations("inicio");

  return (
    <section aria-labelledby="fecho" className="overflow-hidden bg-tinta text-papel">
      <div className="envolvente py-[clamp(4rem,9vw,7rem)]">
        <h2 id="fecho" className="sr-only">
          {t("titulo")}
        </h2>

        {/* O logótipo assinado — com o "desde 1996" — e é o único sítio do site
            onde ele aparece deste tamanho. O nome por extenso vai no
            `aria-label`, porque o desenho é uma máscara e não tem texto. */}
        <span
          role="img"
          aria-label={marca.nome}
          className="block text-[clamp(2rem,5vw,3.5rem)]"
        >
          <Marca assinado />
        </span>

        <p className="mt-10 max-w-[36ch] text-lg leading-relaxed text-papel/85">
          {t("texto")}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/ementa"
            className="premivel rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
          >
            {inicio("verEmenta")}
          </Link>
          <Link
            href="/encomendas"
            className="premivel rounded-full border border-papel/40 px-7 py-4 text-sm font-semibold uppercase tracking-widest hover:bg-papel hover:text-tinta"
          >
            {inicio("verEncomendas")}
          </Link>
        </div>
      </div>
    </section>
  );
}
