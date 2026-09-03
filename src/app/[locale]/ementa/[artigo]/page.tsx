import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "@/lib/site";
import { imagensDePartilha } from "@/lib/metadata";
import { ementa, porId, type Artigo } from "@/data/ementa";
import { regraDe } from "@/lib/encomendavel";
import { caminhoDoArtigo } from "@/lib/produtos";
import { formatarPreco } from "@/lib/preco";
import { FotoProduto } from "@/components/encomendas/FotoProduto";
import { ComprarProduto } from "@/components/encomendas/ComprarProduto";
import { BotaoJuntar } from "@/components/encomendas/BotaoJuntar";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    ementa.map((artigo) => ({ locale, artigo: artigo.id })),
  );
}

const nomeDe = (artigo: Artigo, locale: Locale) =>
  locale === "en" ? artigo.nomeEn : artigo.nome;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; artigo: string }>;
}): Promise<Metadata> {
  const { locale, artigo: id } = await params;
  const artigo = porId(id);
  if (!artigo) return {};

  const t = await getTranslations({ locale, namespace: "produto" });
  const marca = await getTranslations({ locale, namespace: "marca" });
  const meta = await getTranslations({ locale, namespace: "metadata" });

  const l = locale as Locale;
  const titulo = nomeDe(artigo, l);
  const descricao =
    artigo.descricao?.[l] ?? t("descricaoGenerica", { nome: titulo });
  const rota = caminhoDoArtigo(artigo.id);
  const imagens = imagensDePartilha(meta("imagemAlt"));

  return {
    metadataBase: new URL(URL_SITE),
    title: titulo,
    description: descricao,
    alternates: {
      canonical: caminhoLocalizado(rota, locale),
      languages: Object.fromEntries(
        routing.locales.map((x) => [x, caminhoLocalizado(rota, x)]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: marca("nome"),
      title: titulo,
      description: descricao,
      url: urlLocalizado(rota, locale),
      locale: locale === "pt" ? "pt_PT" : "en_GB",
      images: imagens,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: imagens },
  };
}

export default async function PaginaArtigo({
  params,
}: {
  params: Promise<{ locale: string; artigo: string }>;
}) {
  const { locale, artigo: id } = await params;
  setRequestLocale(locale);
  const artigo = porId(id);
  if (!artigo) notFound();

  return <Detalhe artigo={artigo} locale={locale as Locale} />;
}

/**
 * # A página de um artigo da carta
 *
 * ## ⚠️ Isto vive em `/ementa` e não em `/encomendas`, e a diferença é a regra
 *
 * O aviso do AGENTS.md continua a valer: **um kit para setenta pessoas ao lado
 * de um croissant** é o que leva alguém a aparecer ao sábado à espera de o levar
 * debaixo do braço. A carta e a encomenda são duas páginas, e estas páginas de
 * artigo ficam do lado da carta.
 *
 * O que as mantém do lado certo é **dizerem o que o artigo é**:
 *
 * - os 70 que a casa faz por encomenda mostram o bloco de juntar ao pedido, com
 *   a **quantidade mínima** ao lado do botão — quem junta pastéis de nata junta
 *   uma dúzia, e isso lê-se antes de carregar;
 * - os outros 25 — as bebidas, os pratos do almoço, a pausa — **não têm botão
 *   nenhum** e dizem-no: pedem-se ao balcão. Um galão não se encomenda para
 *   sexta-feira, e um botão ali era prometer um serviço que a casa não tem.
 *
 * ## O painel continua a existir
 *
 * A `/ementa` abre um painel com o mesmo conteúdo, e faz bem: quem está a
 * percorrer uma carta de noventa e cinco artigos não quer sair da lista a cada
 * curiosidade. A página é para quem quer **o endereço** — partilhar, guardar,
 * ou chegar por uma pesquisa a um artigo concreto.
 */
function Detalhe({ artigo, locale }: { artigo: Artigo; locale: Locale }) {
  const t = useTranslations("produto");
  const te = useTranslations("ementa");

  const nome = nomeDe(artigo, locale);
  const regra = regraDe(artigo);

  return (
    <div className="seccao">
      <div className="envolvente">
        {/* Quem chega aqui de uma pesquisa cai num artigo sem ter passado pela
            carta, e sem isto a única saída é o botão «voltar» do browser. */}
        <Link
          href="/ementa"
          /* ⚠️ `alvo-toque`: 15 px de altura, e é o único caminho de volta para
             quem chegou aqui de uma pesquisa. */
          className="alvo-toque inline-block text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
        >
          {t("voltarEmenta")}
        </Link>

        {/* ⚠️ `min-w-0` nas duas colunas: um filho de grelha recusa-se a encolher
            abaixo do conteúdo, e uma descrição longa sem quebras arrastava a
            página a 320 px. Ver a armadilha 16 do AGENTS.md. */}
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <div className="lg:sticky lg:top-20">
              <FotoProduto foto={artigo.foto} alt={nome} proporcao="3 / 2" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">
              {te(`cartas.${artigo.carta}.curto`)} ·{" "}
              {te(`categorias.${artigo.categoria}`)}
            </p>
            <h1 className="titulo-display titulo-beta mt-3">{nome}</h1>

            {artigo.vegan && (
              <span className="bloco-verde-texto mt-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {t("vegan")}
              </span>
            )}

            {artigo.descricao && (
              <p className="mt-5 text-lg text-tinta-suave">
                {artigo.descricao[locale]}
              </p>
            )}

            {/* O preço em grande, com a unidade colada. Ver `ArtigoEmenta`: o
                `/kg` não é decoração, é metade do preço de um bolo.
                ⚠️ **Só quando não há bloco de encomenda.** Nos setenta artigos
                encomendáveis o preço já aparece ao lado do botão de juntar, que
                é onde ele decide alguma coisa — mostrá-lo nos dois sítios dava
                dois números iguais a trezentos píxeis um do outro, e um número
                repetido lê-se como dois preços diferentes até se comparar. */}
            {artigo.preco !== null && !regra && (
              <p className="titulo-display mt-6 text-4xl tabular-nums text-tijolo">
                {formatarPreco(artigo.preco, locale)}
                {artigo.unidade === "kg" && (
                  <span className="ml-1 text-lg font-normal text-tinta-suave">
                    {te("porQuilo")}
                  </span>
                )}
              </p>
            )}

            {/* ⚠️ **Um artigo com variantes tem um botão por variante, e não um
                `ComprarProduto`.** O chocolate do Dubai tem quatro pesos com
                quatro preços e `artigo.preco` a `null`: passado ao bloco de
                compra, aquele `null` saía escrito como **«sob orçamento»** — num
                produto que tem quatro preços na tabela. É um artigo com preços,
                não um bolo por medida. */}
            {artigo.variantes && (
              <ul className="mt-6 divide-y divide-tinta/12 border-y border-tinta/12">
                {artigo.variantes.map((v) => (
                  <li
                    key={v.chave}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span>{v.chave}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-tijolo">
                        {formatarPreco(v.preco, locale)}
                      </span>
                      {regra && (
                        <BotaoJuntar
                          variante="compacta"
                          locale={locale}
                          item={{
                            id: `ementa:${artigo.id}:${v.chave}`,
                            tipo: "ementa",
                            nome: `${nome} (${v.chave})`,
                            variante: v.chave,
                            preco: v.preco,
                            pessoas: null,
                            notas: null,
                            unidade: artigo.unidade,
                            minimo: regra.minimo,
                            passo: regra.passo,
                          }}
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {artigo.sabores.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                  {te("sabores")}
                </h2>
                <p className="mt-2">{artigo.sabores.join(" · ")}</p>
              </div>
            )}

            {regra && !artigo.variantes ? (
              <>
                <ComprarProduto
                  id={`ementa:${artigo.id}`}
                  tipo="ementa"
                  nome={nome}
                  preco={artigo.preco}
                  escaloes={[]}
                  locale={locale}
                  comMensagem={artigo.categoria === "bolos-inteiros"}
                  regra={{
                    unidade: artigo.unidade,
                    minimo: regra.minimo,
                    passo: regra.passo,
                  }}
                  notaDaRegra={t(
                    artigo.unidade === "kg" ? "minimoKg" : "minimoUn",
                    { minimo: regra.minimo, passo: regra.passo },
                  )}
                />
                <p className="mt-4 text-sm text-tinta-suave">
                  {t("prazoDaCarta")}
                </p>
              </>
            ) : regra ? (
              /* Com variantes: os botões estão na lista de preços acima, e o que
                 falta aqui é o prazo. */
              <p className="mt-8 text-sm text-tinta-suave">{t("prazoDaCarta")}</p>
            ) : (
              /* ⚠️ **Sem botão, e a dizer porquê.** Um galão não se encomenda
                 para sexta-feira: pede-se ao balcão, na hora. Deixar aqui um
                 botão desligado, ou não dizer nada, era pior do que a frase. */
              <p className="mt-10 rounded-xl border border-tinta/15 bg-papel-fundo px-5 py-4 text-sm">
                {t("soAoBalcao")}
              </p>
            )}

            {/* ⚠️ Os alergénios estão vazios nos 95 e ficam assim até a
                pastelaria os preencher. A nota diz onde perguntar em vez de
                deixar a página muda sobre uma coisa com peso clínico. */}
            <p className="mt-6 text-sm text-tinta-suave">
              {te("notas.alergenios")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
