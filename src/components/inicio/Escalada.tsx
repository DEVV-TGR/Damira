import { useTranslations } from "next-intl";
import { escalada } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatarPreco } from "@/lib/preco";

/**
 * "Para os Corajosos": 320 g → 480 g → 640 g.
 *
 * A secção existe porque **esta é a coisa mais improvável da carta** e estava
 * escondida a meio de uma lista de doze secções. Um hambúrguer de 640 gramas
 * conta-se sozinho — só precisa de espaço e de os números aparecerem por ordem.
 *
 * A barra de cada bloco é **proporcional às gramas a sério** (320 é metade de
 * 640, e desenha-se a metade). Podia ser decorativa e ninguém dava por isso;
 * sendo real, a secção mostra a escalada em vez de a afirmar.
 */
export function Escalada({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio.corajosos");
  const artigos = escalada();
  const maximo = artigos.at(-1)?.gramas ?? 1;

  return (
    <section className="seccao bg-tinta text-papel">
      <div className="envolvente">
        <p className="olho text-coral">{t("olho")}</p>
        {/* `titulo-alfa`: é um dos dois momentos altos da página e o tamanho
            di-lo. Ver a escala de três degraus em `globals.css`. */}
        <h2 className="titulo-display titulo-alfa mt-4 max-w-[15ch]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[46ch] text-papel/70">{t("texto")}</p>

        <ol className="mt-16 space-y-14">
          {artigos.map((artigo, indice) => (
            <li key={artigo.id} className="surgir">
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                <p
                  className="titulo-display tabular-nums leading-[0.8]"
                  /* Cresce com a posição: o último é quase o dobro do primeiro,
                     e é o tamanho do número que faz a escalada sentir-se. */
                  style={{
                    fontSize: `clamp(${3.5 + indice * 1.25}rem, ${9 + indice * 3}vw, ${6 + indice * 2.5}rem)`,
                  }}
                >
                  {artigo.gramas}
                  <span className="text-[0.4em] align-top">g</span>
                </p>

                <div className="flex-1 text-right">
                  <h3 className="titulo-display text-2xl sm:text-3xl">
                    <Link
                      href={`/ementa#${artigo.id}`}
                      className="underline decoration-coral decoration-2 underline-offset-8 hover:text-coral"
                    >
                      {artigo.nome}
                    </Link>
                  </h3>
                  <p className="mt-2 tabular-nums text-papel/70">
                    {formatarPreco(artigo.preco, locale)}
                  </p>
                </div>
              </div>

              {/* Barra proporcional às gramas. */}
              <div className="mt-5 h-1.5 w-full bg-papel/15">
                <div
                  className="h-full bg-coral"
                  style={{ width: `${((artigo.gramas ?? 0) / maximo) * 100}%` }}
                />
              </div>

              {artigo.descricao && (
                <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-papel/65">
                  {artigo.descricao[locale]}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
