import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * As **combinações perfeitas** — os seis pares que o menu impresso sugere, no
 * rodapé da última coluna.
 *
 * ## Porque é isto que vem logo a seguir ao herói
 *
 * O herói levanta a pergunta *o que é que eles têm?* e a resposta honesta são 95
 * artigos, que não cabem numa homepage e não interessam a quem ainda não entrou.
 * O que responde bem é **o que a casa recomenda**, e a Damira já o escreveu: no
 * canto do menu, em letra pequena, há seis pares — um café e um brigadeiro, um
 * matcha gelado e um croissant recheado.
 *
 * ⚠️ **Isto é conteúdo do impresso, não uma lista inventada por nós.** É a
 * diferença entre destacar o que a casa afirma e escolher seis artigos ao acaso
 * porque a página precisava de uma grelha. A Damira não marca *best sellers* em
 * lado nenhum — e por isso o site também não os mostra. Ver o `ementa.ts`.
 *
 * A lista vive nas mensagens e não nos dados porque **é copy**: um par é uma
 * frase da casa, não a referência a dois artigos que se possam ir buscar por
 * `id` (o "Café" da primeira linha nem sequer é um artigo da carta — o que a
 * carta tem é *Café com Natas*).
 */
export function Combinacoes() {
  const t = useTranslations("inicio.combinacoes");
  /* `raw` porque é uma lista e o next-intl só interpola strings. Vem do mesmo
     ficheiro de mensagens, valida-se ao build como o resto. */
  const pares = t.raw("pares") as { a: string; b: string }[];

  return (
    <section aria-labelledby="combinacoes" className="seccao">
      <div className="envolvente">
        <p className="olho">{t("olho")}</p>
        <h2 id="combinacoes" className="titulo-display titulo-beta mt-5 max-w-[18ch]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[46ch] text-tinta-suave">{t("texto")}</p>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-tinta/10 sm:grid-cols-2 lg:grid-cols-3">
          {pares.map((par) => (
            <li
              key={`${par.a}-${par.b}`}
              className="bg-papel px-6 py-8 sm:px-8 sm:py-10"
            >
              <p className="titulo-display titulo-gama leading-tight">{par.a}</p>
              {/* O "+" é o conteúdo — é o que faz o par ser um par. Fica em
                  tijolo e sozinho na linha, que é como está no impresso. */}
              <p
                aria-hidden
                className="titulo-display my-2 text-2xl leading-none text-tijolo"
              >
                +
              </p>
              <p className="titulo-display titulo-gama leading-tight">{par.b}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/ementa"
          className="premivel mt-10 inline-block rounded-full border border-tinta/25 px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-tinta hover:text-papel"
        >
          {t("verTudo")}
        </Link>
      </div>
    </section>
  );
}
