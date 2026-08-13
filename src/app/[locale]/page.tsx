import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Hero } from "@/components/inicio/Hero";
import { Trio } from "@/components/inicio/Trio";
import { Paes } from "@/components/inicio/Paes";
import { Escalada } from "@/components/inicio/Escalada";
import { CasaCheia } from "@/components/inicio/CasaCheia";
import { Fecho } from "@/components/inicio/Fecho";
import { FitaSantos } from "@/components/inicio/FitaSantos";
import { Casa } from "@/components/casas/Casa";
import { restaurantes } from "@/data/restaurantes";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PaginaInicial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inicio locale={locale as Locale} />;
}

/**
 * # A homepage
 *
 * ## A sequência
 *
 * *Apetite* (o herói) → *a prova* (três carnes, três santos) → *a peculiaridade*
 * (o pão de cor) → *a ousadia* (a escalada até às 640 gramas) → *a casa* (o
 * mosaico) → *o sítio e o convite* (as moradas e o fecho).
 *
 * **O trio vem logo a seguir ao herói** porque responde à pergunta que o herói
 * levanta — *o que é que eles têm?* — e responde-lhe em três cartões, não em
 * trinta. Aqui esteve um mural com os quarenta nomes (bonito, e nenhum deles com
 * preço ou fotografia) e depois cinco filas de família, que eram cinco secções
 * disfarçadas de uma. **A homepage abre o apetite; a ementa é que serve a
 * carta.** Os quarenta nomes continuam no site, na fita do fundo.
 *
 * ⚠️ **Os pães vinham depois da escalada e trocaram.** O pico da página é a
 * escalada — escura, alta, com os números a crescer — e estava a meio: a página
 * atingia o ponto mais alto aos 50 % e declinava durante o resto. Com o pão de
 * cor antes, as duas curiosidades da carta escalam uma para a outra (pão
 * cor-de-rosa → 640 gramas) e a ousadia passa a ser a última coisa sobre comida
 * antes de dizermos onde é.
 *
 * ## Os dois registos, que é de onde vem o ritmo
 *
 * A marca tem duas fontes verdadeiras — a carta impressa e o Instagram — e a
 * página **alterna** entre elas em vez de as misturar em todas as secções:
 *
 * - blocos de **carta**: tipografia a mandar, com a fotografia dentro de cartões
 *   (as famílias, a escalada);
 * - blocos de **casa**: imagem a mandar, a sangrar, sem tipografia grande (pães,
 *   mosaico, fecho).
 *
 * Antes eram cinco secções com a mesma anatomia — etiqueta, título, parágrafo,
 * grelha — quatro delas com **o mesmo tamanho de título**, todas encostadas à
 * mesma goteira. A página tinha uma aresta vertical do topo ao fundo.
 *
 * ## O movimento
 *
 * Três gestos, e cada um de espécie diferente: as duas filas do herói (deriva
 * fotográfica, contam como um), os reels a tocar (conteúdo em movimento) e a
 * fita, uma vez só, a costurar para o rodapé. Eram cinco, e com cinco nada se
 * destaca.
 */
function Inicio({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio");

  return (
    <>
      <Hero />

      {/* Uma carne de cada, e é o JSON que escolhe quais: marcar outro artigo
          como `bestSeller` troca o destaque sem tocar nesta página. */}
      <Trio locale={locale} />

      <Paes locale={locale} />
      <Escalada locale={locale} />
      <CasaCheia />

      <section aria-labelledby="casas" className="seccao bg-papel-fundo">
        <div className="envolvente">
          {/* Sem etiqueta: "Onde estamos" por cima de "As nossas casas" dizia
              duas vezes a mesma coisa. A única que sobra na página é a da
              escalada, onde o texto é o nome verdadeiro de uma categoria da
              carta impressa. */}
          <h2 id="casas" className="titulo-display titulo-beta max-w-[14ch]">
            {t("casas.titulo")}
          </h2>
          <p className="mt-4 max-w-[46ch] text-tinta-suave">{t("casas.texto")}</p>

          <div className="mt-14 space-y-14">
            {restaurantes.map((casa) => (
              <Casa key={casa.id} casa={casa} />
            ))}
          </div>
        </div>
      </section>

      <Fecho />

      {/* Sobre tinta, a escoar para o rodapé. Ver o comentário do componente. */}
      <FitaSantos />
    </>
  );
}
