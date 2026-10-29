import { getTranslations, setRequestLocale } from "next-intl/server";
import { Motor } from "@/components/cartaz/Motor";
import { Vapor, type CapituloDoFolio } from "@/components/cartaz/Vapor";
import { FolhaDeRosto } from "@/components/cartaz/FolhaDeRosto";
import { Porta } from "@/components/cartaz/Porta";
import { Silencio } from "@/components/cartaz/Silencio";
import { Pao } from "@/components/cartaz/Pao";
import { Maos } from "@/components/cartaz/Maos";
import { Vitrine } from "@/components/cartaz/Vitrine";
import { Reels } from "@/components/cartaz/Reels";
import { Provar } from "@/components/cartaz/Provar";
import { Encomendar } from "@/components/cartaz/Encomendar";
import { Raro } from "@/components/cartaz/Raro";
import { Festa } from "@/components/cartaz/Festa";
import { routing, type Locale } from "@/i18n/routing";
import { listarProdutos, ordemDaEmenta } from "@/lib/dados";
import "../cartaz-motor.css";
import "../cartaz.css";

/* ⚠️ **Capítulos ocultos, e não apagados.** Na reunião com a casa a 12/10/2026
   (#79) ficou decidido que a página acaba nos reels: a ementa, as encomendas e
   o «encomendar» saem da página inicial **por agora**. Os componentes, o CSS e
   os textos ficam todos — é para voltarem.

   Mostrar um outra vez é tirá-lo daqui; esconder também os reels é acrescentar
   `"cap-reels"`. As secções e o fólio saem os dois desta lista, e por isso não
   se desencontram (o fólio mede pelos `id`).

   ⚠️ **Os numerais não são automáticos**: vêm do `messages/*.json` e seguem a
   ordem visível. Os três ocultos guardam VII, VIII e IX, que é o que lhes cabe
   se voltarem os três pela ordem em que estão. Voltar só um deles, ou esconder
   os reels, obriga a renumerar lá. */
const OCULTOS: ReadonlySet<string> = new Set(["cap-provar", "cap-festa", "cap-encomendar"]);
const visivel = (id: string) => !OCULTOS.has(id);

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * # A página inicial: **um cartaz em capítulos**
 *
 * Construída com a skill `scrollcraft`. O plano inteiro está em
 * `scrollcraft/builds/damira-inicio/BRIEF.md`: a entrevista com as oito
 * respostas, a curva de sentir, a partitura e o porquê de sete das oito
 * gramáticas terem perdido. O que segue é o resumo de que se precisa para
 * mexer nisto sem desfazer as decisões.
 *
 * ## A gramática, e o que ela proíbe
 *
 * **Editorial em capítulos.** A unidade é o capítulo, não a secção; os cortes
 * são secos; cada capítulo assenta no seu próprio fundo e fica lá. Escolhida
 * porque a resposta à entrevista foi *cenas distintas* e *editorial
 * tipográfico*, que são literalmente as duas metades desta gramática.
 *
 * Proíbe, e a página cumpre: barra fixa (o cabeçalho destrava-se no
 * `cartaz.css`), fundo a interpolar entre capítulos (não há `data-sc-drift`
 * nenhum aqui), chamada magnética, e texto centrado no primeiro ecrã.
 *
 * ⚠️ **A gramática que quase ganhou foi o cartaz tipográfico**, e perdeu por
 * uma razão só: proíbe fundo fotográfico, e o pico que o cliente escolheu é
 * uma fotografia a encher o ecrã. Uma gramática que proíbe o pico é a
 * gramática errada, por muito que o nome assente.
 *
 * ## ⚠️ O que mudou a 12/10/2026, na reunião com a casa
 *
 * - **A página acaba nos reels.** A ementa, as encomendas e o «encomendar»
 *   estão ocultos (ver `OCULTOS`, acima) — não apagados (#79).
 * - **O raro (vegan) subiu** para logo a seguir ao silêncio, antes do pão, e
 *   passou a capítulo II. O pão é o III (#79).
 * - **A morada (capítulo X, o colofão) saiu de vez**, com o mapa. A morada,
 *   o horário e o telefone vivem no rodapé (#81).
 * - **A vitrine mostra seis fotografias** e um «Ver mais» (#80).
 *
 * Grande parte do que segue descreve a página como foi construída. Onde já
 * não é verdade, diz-se.
 *
 * ## A sequência, e porque é esta
 *
 * *A porta* → *o pão* → *as mãos* → *o raro* → *a festa* → *a morada*. Não é
 * uma ordem que eu tenha proposto: é a que o cliente ditou na entrevista.
 * ⚠️ **Hoje é outra**, e também foi a casa que a ditou: *a porta* → *o raro*
 * → *o pão* → *as mãos* → *a vitrine* → *os reels*.
 *
 * A folha de rosto vem antes de tudo porque a gramática a exige — tipografia
 * no papel, **sem imagem acima da dobra**. É a mudança mais visível em relação
 * à homepage anterior, onde a fachada era o herói com o título por cima. Aqui
 * a fachada é o capítulo I, com legenda, e o primeiro ecrã é a frase da casa
 * sozinha.
 *
 * ## O silêncio é um acto, não um buraco
 *
 * Entre a porta e o pão há meia altura de ecrã quase vazia. Está declarado no
 * `BRIEF.md` para a verificação não o confundir com rolagem morta: o pico
 * precisa de ter de onde chegar, e um ecrã vazio que se quis lê-se como
 * expectativa enquanto um que sobrou lê-se como avaria.
 *
 * ## O ritmo dos fundos
 *
 * papel → papel-fundo → tinta → estampa → papel → papel-fundo → verde →
 * tijolo → tinta.
 *
 * ⚠️ Hoje: tijolo → papel-fundo → tinta → **verde** → papel → estampa →
 * papel-fundo → papel → tinta. Continua sem dois iguais seguidos, e o verde
 * continua a aparecer uma vez só.
 *
 * Seis fundos distintos, todos da paleta medida dos impressos, **sem uma cor
 * nova**. Nunca dois iguais seguidos. O verde aparece uma vez só, no capítulo
 * vegan, que é a regra do `AGENTS.md` cumprida à letra.
 *
 * ## A página faz o trabalho todo, e por isso é longa
 *
 * ⚠️ **Dez capítulos, e passa das catorze alturas de ecrã que a skill fixa como
 * tecto.** É uma saída deliberada da regra, pedida pelo cliente: a página
 * inicial tem de mostrar a ementa, receber encomendas e mostrar fotografia e
 * vídeo, e nenhuma dessas três cabia numa ligação.
 *
 * O tecto existe por uma razão boa — páginas longas diluem o pico — e a defesa
 * é a que o `feel.md` §5 receita: **comprimir as partes administrativas.** Da
 * vitrine em diante tudo são secções normais com escalonamento curto, e não
 * actos presos. Informação lê-se depressa; experiência é que ocupa espaço. Os
 * únicos actos presos da página continuam a ser três: o pão, a carta vegan e o
 * colofão. ⚠️ Desde 12/10/2026 são seis capítulos e não dez, o colofão saiu e
 * o pão já não é preso: os actos presos visíveis são o raro e os reels.
 *
 * ## As quatro secções que respondem a "para que serve o sítio"
 *
 * - **V a vitrine** — catorze fotografias do álbum da própria casa, seis à
 *   vista e as outras atrás de um «Ver mais»;
 * - **VI os reels** — seis lugares para o vídeo do Instagram, hoje vazios e a
 *   dizê-lo;
 * - **VII a ementa** — as quatro cartas e um preço real de cada, para a
 *   pergunta *quanto custa* ter resposta sem sair da página (⚠️ oculta);
 * - **IX encomendar** — as três vias, em blocos grandes, porque o cliente pediu
 *   que isto se usasse tanto aos vinte como aos setenta anos (⚠️ oculta).
 *
 * ## O que já não está aqui
 *
 * As *combinações perfeitas* saíram: a ementa passou a estar representada pela
 * secção VII, que responde à mesma pergunta com preços a sério em vez de pares
 * sugeridos. Continuam a viver no fim do menu impresso e na página da ementa.
 */
export default async function PaginaInicial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "cartaz" });
  const [ementa, encomendas, ordem] = await Promise.all([
    listarProdutos({ origem: "ementa" }),
    listarProdutos({ origem: "encomendas" }),
    ordemDaEmenta(),
  ]);

  /* ⚠️ **A lista é uma função dos capítulos e não uma constante**: os títulos
     são texto traduzido, e uma constante ao lado do componente ficava numa
     língua só. Os `id` têm de bater certo com os das `<section>` — é por eles
     que o fólio mede a posição e salta. */
  const todos: CapituloDoFolio[] = [
    { id: "cap-porta", numeral: t("porta.numeral"), titulo: t("porta.olho") },
    { id: "cap-raro", numeral: t("raro.numeral"), titulo: t("raro.olho") },
    /* Sem marcador: só muda a cor do fio no título do pão, que sem isto
       herdava o papel do vegan e desaparecia em cima do papel. Ver o
       `cartaz.css`. */
    { id: "cap-pao-titulo", numeral: "", titulo: "", marcador: false },
    { id: "cap-pao", numeral: t("pao.numeral"), titulo: t("pao.olho") },
    { id: "cap-maos", numeral: t("maos.numeral"), titulo: t("maos.olho") },
    { id: "cap-vitrine", numeral: t("vitrine.numeral"), titulo: t("vitrine.olho") },
    { id: "cap-reels", numeral: t("reels.numeral"), titulo: t("reels.olho") },
    { id: "cap-provar", numeral: t("provar.numeral"), titulo: t("provar.olho") },
    { id: "cap-festa", numeral: t("festa.numeral"), titulo: t("festa.olho") },
    { id: "cap-encomendar", numeral: t("encomendar.numeral"), titulo: t("encomendar.olho") },
  ];
  const capitulos = todos.filter((c) => visivel(c.id));

  return (
    <div id="cartaz" className="cartaz">
      <Motor />
      <Vapor capitulos={capitulos} rotuloNavegacao={t("folio")} />

      <FolhaDeRosto />
      <Porta />
      <Silencio />
      <Raro ementa={ementa} />
      <Pao />
      <Maos />
      <Vitrine />
      {visivel("cap-reels") && <Reels />}
      {visivel("cap-provar") && (
        <Provar ementa={ementa} ordem={ordem} locale={locale as Locale} />
      )}
      {visivel("cap-festa") && (
        <Festa ementa={ementa} encomendas={encomendas} locale={locale as Locale} />
      )}
      {visivel("cap-encomendar") && <Encomendar />}
    </div>
  );
}
