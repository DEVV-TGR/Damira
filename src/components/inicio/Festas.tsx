import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { encomendas, desdeQuanto } from "@/data/encomendas";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/**
 * As festas: três gamas, três dimensões, e o preço a subir.
 *
 * ## O pico da página
 *
 * É a secção escura, e é de propósito: no Santo Burga o pico era a escalada das
 * gramas — 320, 480, 640 — e funcionava porque tinha um número a crescer e uma
 * barra a acompanhá-lo. Aqui o número que cresce é **quantas pessoas**, de vinte
 * a setenta, e o que ele conta é o mesmo: até onde é que esta casa vai.
 *
 * ## A barra mede pessoas, não preço
 *
 * ⚠️ E é uma decisão, não um detalhe. Desenhada a preço, a barra dizia que o kit
 * de 70 pessoas é seis vezes o de 20 — que é verdade na fatura e é irrelevante
 * para quem está a escolher. Desenhada a pessoas, diz o que a pergunta é:
 * *quantos somos?*
 *
 * ⚠️ **Não se divide o preço pelo número de pessoas.** Um "16,75 € por pessoa"
 * era simpático e era falso: os escalões não são proporcionais (o Premium de 40
 * custa 650 € e o de 20 custa 335 €, que não é metade), e o número por pessoa
 * anuncia uma conta que a casa não faz. Ver `encomendas.ts`.
 */
export function Festas({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio.festas");
  const maior = Math.max(
    ...encomendas.kitsFesta.flatMap((k) => k.escaloes.map((e) => e.pessoas)),
  );

  return (
    <section aria-labelledby="festas" className="seccao bg-tinta text-papel">
      <div className="envolvente">
        <p className="olho text-papel">{t("olho")}</p>
        <h2 id="festas" className="titulo-display titulo-alfa mt-5 max-w-[14ch]">
          {t("titulo")}
        </h2>
        {/* Sobre tinta há folga para diluir o branco: a 85 % ainda dá mais de
            10:1. Sobre o tijolo não haveria — ver a tabela em `globals.css`. */}
        <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-papel/85">
          {t("texto")}
        </p>

        <ul className="mt-14 space-y-10">
          {encomendas.kitsFesta.map((kit) => (
            <li key={kit.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="titulo-display titulo-gama">{kit.nome[locale]}</h3>
                <p className="text-sm font-semibold uppercase tracking-widest text-papel/70">
                  {t("desde", {
                    preco: formatarPreco(desdeQuanto(kit), locale),
                  })}
                </p>
              </div>

              <ol className="mt-4 space-y-2">
                {kit.escaloes.map((escalao) => (
                  <li
                    key={escalao.pessoas}
                    className="flex items-center gap-4 text-sm"
                  >
                    <span className="w-16 shrink-0 font-semibold tabular-nums">
                      {t("pessoas", { n: escalao.pessoas })}
                    </span>
                    <span
                      aria-hidden
                      className="h-2 rounded-full bg-tijolo"
                      style={{ width: `${(escalao.pessoas / maior) * 100}%` }}
                    />
                    <span className="shrink-0 tabular-nums text-papel/70">
                      {formatarPreco(escalao.preco, locale)}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>

        <Link
          href="/encomendas"
          className="premivel mt-14 inline-block rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {t("verEncomendas")}
        </Link>
      </div>
    </section>
  );
}
