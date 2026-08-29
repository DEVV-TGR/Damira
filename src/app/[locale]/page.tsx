import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/inicio/Hero";
import { Combinacoes } from "@/components/inicio/Combinacoes";
import { Vegan } from "@/components/inicio/Vegan";
import { Festas } from "@/components/inicio/Festas";
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
 * ⚠️ **Não há aqui uma secção de fotografia da casa**, e é o buraco conhecido
 * desta página: ainda não existe fotografia da Damira que se possa usar (ver o
 * README). O sítio dela é entre as festas e os contactos, e a página está
 * composta a contar com ela — não é um espaço a preencher com o que houver.
 *
 * ## O ritmo das superfícies
 *
 * tijolo → papel → verde → tinta → papel-fundo → tinta. Nunca duas superfícies
 * de cor seguidas, e o escuro só nos dois momentos que o merecem: o pico (as
 * festas) e o chão (o fecho e o rodapé, que são o mesmo bloco).
 */
function Inicio({ locale }: { locale: Locale }) {
  return (
    <>
      <Hero />
      <Combinacoes />
      <Vegan />
      <Festas locale={locale} />
      <Contactos />
      <Fecho />
    </>
  );
}
