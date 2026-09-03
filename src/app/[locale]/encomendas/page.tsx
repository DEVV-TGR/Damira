import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { casa, telefoneMarcavel } from "@/data/casa";
import { daFamilia, type Produto } from "@/lib/produtos";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { FormularioPedido } from "@/components/encomendas/FormularioPedido";
import { CartaoProduto } from "@/components/encomendas/CartaoProduto";
import { EmentaEncomendavel } from "@/components/encomendas/EmentaEncomendavel";
import { ListaHistorico } from "@/components/encomendas/ListaHistorico";

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

  return <Encomendas locale={locale as Locale} />;
}

/**
 * # A página das encomendas
 *
 * ## O que esta página é, e o que não é
 *
 * **Não é uma loja.** Não há carrinho com pagamento, não há reserva e não há
 * calendário de disponibilidade — e nenhuma dessas coisas se pode fingir: um
 * botão «juntar ao pedido» que acaba num email é honesto; um que parece um
 * checkout e acaba num email não é.
 *
 * É um **catálogo que termina num pedido**.
 *
 * ## ⚠️ Isto era uma página só com tudo dentro, e passou a ser um índice
 *
 * Até setembro de 2026 esta página trazia os onze produtos **com o conteúdo todo
 * aberto**: as listas de miudezas de cada kit, as noventa e nove opções do bolo
 * por medida, e o formulário. Cinco ecrãs de rolagem em que a única coisa que
 * distinguia dois kits era um preço a meio de vinte linhas — e **sem sítio
 * nenhum para uma fotografia** sem empurrar o resto para fora do ecrã.
 *
 * Agora cada produto tem página própria (`/encomendas/<id>`) e aqui ficam
 * cartões: nome, uma frase, preço, e o caminho para lá. As três consequências
 * que interessam:
 *
 * 1. **há espaço para fotografia** — na página do produto, que é onde ela conta;
 * 2. **o escalão e a mensagem do bolo escolhem-se antes de juntar**, em vez de
 *    se juntar às cegas e corrigir numa caixa de texto no fim;
 * 3. **o catálogo do bolo saiu daqui.** Ocupava meia página entre as boxes e o
 *    formulário, a separar duas coisas que se compram.
 *
 * A sequência do que fica é a da conversa que já acontece ao telefone: *quantas
 * pessoas?*, *e o bolo?*, *e para dois?*, *e o resto da carta?*, *como é que
 * peço?*
 *
 * ⚠️ **O formulário é o fim da página e não o princípio.** Um pedido de orçamento
 * no topo é uma pergunta feita a quem ainda não sabe o que quer pedir; no fim, é
 * a pergunta que a página inteira preparou.
 */
function Encomendas({ locale }: { locale: Locale }) {
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
          <h1
            className="titulo-display titulo-capa mt-4 uppercase"
            style={{ fontVariationSettings: '"wdth" 68, "opsz" 48' }}
          >
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
              {SECCOES.map((seccao) => (
                <li key={seccao}>
                  <a
                    href={`#${seccao}`}
                    className="premivel alvo-toque inline-flex min-h-11 items-center rounded-full border border-papel/40 px-5 text-sm font-semibold transition-colors hover:bg-papel hover:text-tijolo"
                  >
                    {t(`indice.${seccao}`)}
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
      <section className="seccao bg-papel-fundo">
        <div className="envolvente">
          <ListaHistorico locale={locale} />
        </div>
      </section>

      <Familia
        id="festas"
        titulo={t("festas.titulo")}
        texto={t("festas.texto")}
        produtos={daFamilia("festa")}
        locale={locale}
      />

      <Familia
        id="kits-bolo"
        titulo={t("kitsBolo.titulo")}
        texto={t("kitsBolo.texto")}
        /* ⚠️ **O bolo por medida entra na mesma grelha dos kits de bolo.**
           É a mesma pergunta — *e o bolo?* — e tinha uma secção própria só
           porque o seu catálogo era enorme. Agora que o catálogo vive na página
           dele, a secção separada era um degrau a mais entre duas coisas que se
           comparam uma à outra. */
        produtos={[...daFamilia("bolo"), ...daFamilia("medida")]}
        locale={locale}
        fundo="claro"
      />

      <Familia
        id="boxes"
        titulo={t("boxes.titulo")}
        texto={t("boxes.texto")}
        produtos={daFamilia("box")}
        locale={locale}
      />

      {/* ── A carta, por encomenda ────────────────────────────────────── */}
      <EmentaEncomendavel locale={locale} />

      {/* ── Como encomendar ──────────────────────────────────────────── */}
      <section id="pedido" aria-labelledby="como" className="scroll-mt-24 seccao bg-tinta text-papel">
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

          <FormularioPedido locale={locale} />
        </div>
      </section>

    </>
  );
}

/** As secções por que o índice do herói navega, pela ordem da página. */
const SECCOES = ["festas", "kits-bolo", "boxes", "da-ementa", "pedido"] as const;

/**
 * Uma família de produtos: título, uma frase, e a grelha de cartões.
 *
 * Existe para as três famílias saírem iguais. Escritas à mão, a primeira
 * diferença de espaçamento entre elas entrava sem ninguém dar por isso — e são
 * três blocos que se leem em sequência, onde uma diferença se nota logo.
 */
function Familia({
  id,
  titulo,
  texto,
  produtos,
  locale,
  fundo = "papel",
}: {
  id: string;
  titulo: string;
  texto: string;
  produtos: Produto[];
  locale: Locale;
  fundo?: "papel" | "claro";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`scroll-mt-20 seccao ${fundo === "claro" ? "bg-papel-fundo" : ""}`}
    >
      <div className="envolvente">
        <h2 id={`${id}-titulo`} className="titulo-display titulo-beta max-w-[16ch]">
          {titulo}
        </h2>
        <p className="mt-4 max-w-[52ch] text-tinta-suave">{texto}</p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => (
            <CartaoProduto key={produto.id} produto={produto} locale={locale} />
          ))}
        </ul>
      </div>
    </section>
  );
}
