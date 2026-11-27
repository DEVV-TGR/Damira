import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { casa, telefoneMarcavel } from "@/data/casa";
import { familiasDaLoja } from "@/lib/dados";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { emLingua, type FamiliaComProdutos } from "@/lib/vista";
import { IrParaCompra } from "@/components/encomendas/IrParaCompra";
import { ListaHistorico } from "@/components/encomendas/ListaHistorico";
import { PesquisaProdutos } from "@/components/encomendas/PesquisaProdutos";
import { SeccaoFamilia } from "@/components/encomendas/SeccaoFamilia";
import { SeccoesMinimizaveis } from "@/components/encomendas/SeccoesMinimizaveis";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale as Locale, "encomendas", "/encomendas");
}

export default async function PaginaEncomendas({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations({ locale, namespace: "encomendas" });
  return (
    <Encomendas
      seccoes={await familiasDaLoja()}
      locale={locale as Locale}
    />
  );
}

function Encomendas({ seccoes, locale }: { seccoes: FamiliaComProdutos[]; locale: Locale }) {
  const t = useTranslations("encomendas");
  const telefone = telefoneMarcavel();

  return (
    <>
      <div className="bloco-tijolo relative overflow-hidden">
        <span
          aria-hidden
          className="traco pointer-events-none absolute -right-[6%] top-1/2 hidden h-[150%] w-[38%] -translate-y-1/2 opacity-[0.13] lg:block"
          style={{
            maskImage: "url(/marca/simbolo.svg)",
            WebkitMaskImage: "url(/marca/simbolo.svg)",
          }}
        />
        <div className="envolvente relative py-[clamp(3.5rem,8vw,6rem)]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em]">
            {t("olho")}
          </p>
          <h1 className="titulo-display titulo-capa mt-4 uppercase">
            {t("titulo")}
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg">{t("intro")}</p>

          {/* ⚠️ **O índice está dentro do herói e não numa barra colada.**
              A página tem cinco secções e mede vários ecrãs; sem isto, quem vem
              buscar uma box tem de percorrer os kits de festa todos. Uma barra
              fixa era mais uma coisa a tapar conteúdo no telemóvel — aqui vê-se
              uma vez, no princípio, que é quando se decide para onde ir. */}
          <nav aria-label={t("indice.titulo")} className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {/* As famílias com produtos, pela ordem da gerente, e o fim da
                  página. Com o nome que ela lhes deu: um rótulo curto escrito
                  aqui ficava a dizer «Festas» depois de ela a renomear. */}
              {[
                ...seccoes.map(({ familia }) => ({ id: familia.id, nome: emLingua(familia.nome, locale) })),
                { id: "pedido", nome: t("indice.pedido") },
              ].map((seccao) => (
                <li key={seccao.id}>
                  <a
                    href={`#${seccao.id}`}
                    className="premivel alvo-toque inline-flex min-h-11 items-center rounded-full border border-papel/40 px-5 text-sm font-semibold transition-colors hover:bg-papel hover:text-tijolo"
                  >
                    {seccao.nome}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* ── Os pedidos que já fez ─────────────────────────────────────── */}
      {/* ⚠️ Antes dos produtos e não no fim: quem já encomendou aqui vem
          repetir, e obrigá-lo a percorrer o catálogo para chegar ao que já sabe
          que quer é fazê-lo trabalhar por nada. Não renderiza nada para quem
          chega pela primeira vez. */}
      <ListaHistorico locale={locale} comoSeccao />

      {/* A pesquisa fica logo antes dos produtos e não no herói: o que ela
          encontra aparece por baixo dela, e não três ecrãs abaixo. */}
      <PesquisaProdutos />

      {/* ── As famílias da gerente, pela ordem dela (26/11) ─────────── */}
      {/* Os fundos alternam como antes (papel, claro, papel…), contados pela
          posição e não pela família: com uma família nova no meio, duas
          seguidas da mesma cor deixavam de se separar. */}
      {seccoes.map((dados, i) => (
        <SeccaoFamilia key={dados.familia.id} dados={dados} locale={locale} fundo={i % 2 === 1 ? "claro" : "papel"} />
      ))}

      {/* ── Como encomendar ──────────────────────────────────────────── */}
      <section id="pedido" aria-labelledby="como" className="ancora-rente seccao bg-tinta text-papel">
        <div className="envolvente grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 id="como" className="titulo-display titulo-beta max-w-[12ch]">
              {t("formulario.titulo")}
            </h2>
            <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-papel/85">
              {t("formulario.texto")}
            </p>

            {/* ⚠️ O prazo de antecedência ainda não veio da casa. Enquanto não
                vier, esta linha diz que está por confirmar em vez de inventar um
                número — alguém a pedir setenta doses para amanhã é o erro que
                uma página de encomendas não pode cometer. */}
            <p className="mt-4 max-w-[40ch] text-sm text-papel/65">
              {t("como.prazo")}
            </p>

            {/* O telefone fica ao lado do formulário e não escondido depois
                dele: para metade das encomendas — e para todas as urgentes — é
                a via boa, e um formulário que finge ser a única forma de falar
                com uma pastelaria de bairro está a inventar uma empresa que não
                existe. */}
            <div className="mt-8 border-t border-papel/20 pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-papel/60">
                {t("como.titulo")}
              </p>
              {telefone && (
                <a
                  href={telefone}
                  className="premivel titulo-display mt-2 block text-2xl"
                >
                  {casa.telefone}
                </a>
              )}
              <p className="mt-2 text-sm text-papel/65">{t("como.texto")}</p>
            </div>
          </div>

          {/* O formulário que vivia aqui passou a página própria
              (`/encomendas/pedido`, #37): aqui fica o caminho para lá, quando
              há o que encomendar, e o telefone ao lado, para quem prefere. */}
          <IrParaCompra />
        </div>
      </section>

      {/* Abrir a secção a que se salta, e não perder o sítio ao fechar uma a
          meio. Não desenha nada. */}
      <SeccoesMinimizaveis />
    </>
  );
}
