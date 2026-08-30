import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/inicio/Hero";
import { Combinacoes } from "@/components/inicio/Combinacoes";
import { Vegan } from "@/components/inicio/Vegan";
import { Festas } from "@/components/inicio/Festas";
import { Fotografia } from "@/components/inicio/Fotografia";
import { Fecho } from "@/components/inicio/Fecho";
import { Contactos } from "@/components/casa/Contactos";
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
 * *Quem somos* (o herói) → *o que se come* (as combinações do impresso) →
 * *o que nos torna diferentes* (a carta vegan) → *até onde vamos* (as festas) →
 * *onde é e a que horas* (os contactos) → *o convite* (o fecho).
 *
 * **As combinações vêm logo a seguir ao herói** porque respondem à pergunta que
 * o herói levanta — *o que é que eles têm?* — e respondem-lhe em seis pares, não
 * em noventa e cinco artigos. A homepage abre o apetite; a ementa é que serve a
 * carta.
 *
 * ## Os três argumentos, por ordem de força
 *
 * A Damira tem três coisas que as outras pastelarias da rua não têm, e a página
 * gasta-as por ordem crescente:
 *
 * 1. **as combinações** — a casa a dizer o que sabe bem com o quê. É simpático;
 *    não é decisivo.
 * 2. **a carta vegan** — metade da ementa. Isto já é raro, e é o que faz alguém
 *    atravessar Ermesinde.
 * 3. **as festas** — até setenta pessoas, com preço fechado. É o que muda o
 *    valor de uma encomenda de três euros para mil.
 *
 * A secção de fotografia fica **entre as festas e os contactos**, e o lugar foi
 * decidido antes de haver uma única fotografia: é onde a página passa do que a
 * casa vende para o que a casa é, imediatamente antes de dizer onde fica. Ver o
 * `Fotografia.tsx` — as imagens que lá estão são as que sobreviveram, e não uma
 * sessão fotográfica.
 *
 * ## O ritmo das superfícies
 *
 * fotografia → papel → verde → tinta → papel → papel-fundo → tinta.
 *
 * Nunca duas superfícies de cor seguidas, e o escuro só nos dois momentos que o
 * merecem: o pico (as festas) e o chão (o fecho e o rodapé, que são o mesmo
 * bloco). O herói deixou de ser tijolo chapado e passou a ser fotografia com o
 * tijolo por cima — a cor continua lá, mas agora tem uma imagem por baixo.
 */
function Inicio({ locale }: { locale: Locale }) {
  return (
    <>
      <Hero />
      <Combinacoes />
      <Vegan />
      <Festas locale={locale} />
      <Fotografia />
      <Contactos />
      <Fecho />
    </>
  );
}
