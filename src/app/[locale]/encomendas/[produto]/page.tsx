import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "@/lib/site";
import { imagensDePartilha } from "@/lib/metadata";
import { PRODUTOS, caminhoDoProduto, produtoPorId, type Produto } from "@/lib/produtos";
import { GRUPOS, opcoesDe, quantasOpcoes } from "@/data/bolos";
import type { Box, Escalao, Kit, KitBolo } from "@/data/encomendas";
import { formatarPreco } from "@/lib/preco";
import { FotoProduto } from "@/components/encomendas/FotoProduto";
import { ComprarProduto } from "@/components/encomendas/ComprarProduto";

/** Uma página por produto e por língua, todas geradas no `build`. */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PRODUTOS.map((produto) => ({ locale, produto: produto.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; produto: string }>;
}): Promise<Metadata> {
  const { locale, produto: id } = await params;
  const produto = produtoPorId(id);
  if (!produto) return {};

  const t = await getTranslations({ locale, namespace: "produto" });
  const marca = await getTranslations({ locale, namespace: "marca" });
  const meta = await getTranslations({ locale, namespace: "metadata" });

  const l = locale as Locale;
  const titulo = produto.familia === "medida" ? t("medida.nome") : produto.nome(l);
  const descricao =
    produto.familia === "medida"
      ? t("medida.resumo")
      : (produto.resumo?.(l) ?? t("descricaoGenerica", { nome: titulo }));
  const rota = caminhoDoProduto(produto.id);
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

export default async function PaginaProduto({
  params,
}: {
  params: Promise<{ locale: string; produto: string }>;
}) {
  const { locale, produto: id } = await params;
  setRequestLocale(locale);
  const produto = produtoPorId(id);
  if (!produto) notFound();

  return <Detalhe produto={produto} locale={locale as Locale} />;
}

/**
 * # A página de um produto
 *
 * ## Porque é que isto passou a existir
 *
 * Porque a `/encomendas` era **uma página só com tudo dentro** — onze produtos,
 * as suas listas de conteúdo, o configurador do bolo com noventa e nove opções e
 * o formulário. Cinco ecrãs de rolagem em que a única coisa que distinguia dois
 * kits era um preço a meio de vinte linhas de miudezas, e onde **não havia sítio
 * nenhum para uma fotografia** sem empurrar o resto para fora do ecrã.
 *
 * Uma página por produto dá o que faltava: espaço para a fotografia, espaço para
 * dizer o que aquilo é, e o sítio certo para escolher o escalão e escrever a
 * mensagem do bolo antes de juntar ao pedido — em vez de juntar às cegas e
 * corrigir numa caixa de texto no fim.
 *
 * ## ⚠️ E continua a não ser uma loja
 *
 * Não há pagamento, não há reserva e não há disponibilidade. O botão diz *juntar
 * ao pedido*, o preço é uma estimativa e o aviso está ao lado dele. Ver
 * `cesto.ts`.
 */
function Detalhe({ produto, locale }: { produto: Produto; locale: Locale }) {
  const t = useTranslations("produto");
  const te = useTranslations("encomendas");

  const nome = produto.familia === "medida" ? t("medida.nome") : produto.nome(locale);
  const resumo =
    produto.familia === "medida" ? t("medida.resumo") : produto.resumo?.(locale);

  const escaloes =
    produto.familia === "festa"
      ? (produto.fonte as Kit).escaloes.map((e) => ({
          pessoas: e.pessoas,
          preco: e.preco,
        }))
      : [];

  return (
    <>
      <div className="seccao">
        <div className="envolvente">
          {/* ⚠️ **O caminho de volta é a primeira coisa da página.** Quem chega
              aqui de uma pesquisa cai num produto sem ter passado pelas
              encomendas, e sem isto a única saída é o botão «voltar» do
              browser — que quem vem de fora não tem. */}
          <Link
            href="/encomendas"
            /* ⚠️ `alvo-toque`: 15 px de altura, e é o único caminho de volta para
             quem chegou aqui de uma pesquisa. */
          className="alvo-toque inline-block text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
          >
            {t("voltar")}
          </Link>

          {/* ⚠️ **`min-w-0` nas duas colunas, e não é decoração.** Um filho de
              grelha tem `min-width: auto`, ou seja **recusa-se a encolher abaixo
              do conteúdo** — e a tabela de escalões tem largura mínima para as
              três colunas caberem. Sem isto, a coluna esticava-se aos 352 px da
              tabela e a **página inteira** ganhava rolagem horizontal a 320 px,
              apesar de a tabela já viver dentro de um `overflow-x-auto` que era
              suposto tratar disso. Só na página dos kits de festa; as outras não
              têm tabela e davam verde. */}
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              {/* ⚠️ **Colada ao topo enquanto se rola.** A tabela de um kit de
                  festa tem vinte e tal linhas; sem isto, a coluna da esquerda
                  ficava com a fotografia em cima e dois ecrãs de branco por
                  baixo, e quem chegasse ao preço já não via o produto. Só a
                  partir do `lg`, que é onde há duas colunas. */}
              <div className="lg:sticky lg:top-20">
                <FotoProduto foto={produto.foto} alt={nome} proporcao="3 / 2" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">
                {t(`familias.${produto.familia}`)}
              </p>
              <h1 className="titulo-display titulo-beta mt-3">{nome}</h1>
              {produto.vegan && (
                <span className="bloco-verde-texto mt-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {t("vegan")}
                </span>
              )}
              {resumo && <p className="mt-5 text-lg text-tinta-suave">{resumo}</p>}

              <Conteudo produto={produto} locale={locale} />

              <ComprarProduto
                id={produto.id}
                tipo={produto.tipo}
                nome={nome}
                preco={produto.preco}
                escaloes={escaloes}
                locale={locale}
                /* Mensagem por cima só faz sentido onde há bolo. Numa box de
                   pequeno-almoço é um campo a mais, e cada campo a mais é gente
                   que hesita sem razão. */
                comMensagem={produto.familia === "bolo" || produto.familia === "medida"}
              />

              {/* O prazo é a informação mais importante desta página, e continua
                  por confirmar pela casa. Ver a #3. */}
              <p className="mt-6 text-sm text-tinta-suave">{te("como.prazo")}</p>
            </div>
          </div>
        </div>
      </div>

      {produto.familia === "medida" && <CatalogoDoBolo locale={locale} />}
    </>
  );
}

/** O que o produto leva — e cada família diz isso à sua maneira. */
function Conteudo({ produto, locale }: { produto: Produto; locale: Locale }) {
  const t = useTranslations("produto");
  const te = useTranslations("encomendas");

  if (produto.familia === "festa") {
    const kit = produto.fonte as Kit;
    return (
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("oQueLeva")}
        </h2>
        {/* ⚠️ **Uma tabela e não três listas.** O que a pessoa está a decidir é
            entre vinte, quarenta e setenta pessoas, e essa comparação faz-se a
            correr uma linha com o olho — três listas em coluna obrigam a saltar
            de um lado para o outro a contar tarteletes. */}
        <div className="mt-3 overflow-x-auto">
          <TabelaEscaloes escaloes={kit.escaloes} locale={locale} />
        </div>
      </div>
    );
  }

  if (produto.familia === "bolo") {
    const kit = produto.fonte as KitBolo;
    return (
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("oQueLeva")}
        </h2>
        <ul className="mt-3 divide-y divide-tinta/12 border-y border-tinta/12">
          {kit.itens.map((item) => (
            <li key={item.nome.pt} className="flex justify-between gap-4 py-2.5">
              <span>{item.nome[locale]}</span>
              <span className="shrink-0 tabular-nums text-tinta-suave">
                {item.quantidade[locale]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-tinta-suave">{te("kitsBolo.nota")}</p>
      </div>
    );
  }

  if (produto.familia === "box") {
    const box = produto.fonte as Box;
    return (
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("oQueLeva")}
        </h2>
        <ul className="mt-3 space-y-1.5 divide-y divide-tinta/12 border-y border-tinta/12 text-tinta-suave">
          {box.itens.map((item) => (
            <li key={item.pt} className="py-2.5">
              {item[locale]}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

function TabelaEscaloes({
  escaloes,
  locale,
}: {
  escaloes: Escalao[];
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const te = useTranslations("encomendas.festas");

  /* As linhas saem do primeiro escalão e vão buscar aos outros pelo nome. ⚠️ Um
     artigo que só exista num escalão aparece na mesma, com um traço nos outros —
     esconder linhas por não estarem em todos era apagar do site aquilo que
     distingue os escalões. */
  const linhas = (grupo: "salgados" | "doces") => {
    const nomes: string[] = [];
    for (const escalao of escaloes) {
      for (const linha of escalao[grupo]) {
        if (!nomes.includes(linha.nome.pt)) nomes.push(linha.nome.pt);
      }
    }
    return nomes;
  };

  return (
    <table className="w-full min-w-[22rem] border-collapse text-sm">
      <thead>
        <tr className="border-b border-tinta/20">
          {/* ⚠️ Vazio, e não «o que leva» outra vez: o título da secção está
              três linhas acima e dizia exactamente o mesmo. Um cabeçalho
              repetido a dois centímetros do original lê-se como um erro. */}
          <th className="py-2 text-left font-semibold">
            <span className="sr-only">{t("oQueLeva")}</span>
          </th>
          {escaloes.map((e) => (
            <th key={e.pessoas} className="py-2 text-right tabular-nums">
              {t("paraPessoas", { n: e.pessoas })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(["salgados", "doces"] as const).map((grupo) => (
          <Grupo
            key={grupo}
            titulo={te(grupo)}
            nomes={linhas(grupo)}
            grupo={grupo}
            escaloes={escaloes}
            locale={locale}
          />
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-tinta">
          <th className="py-3 text-left">{t("preco")}</th>
          {escaloes.map((e) => (
            <td
              key={e.pessoas}
              className="titulo-display py-3 text-right text-lg tabular-nums text-tijolo"
            >
              {formatarPreco(e.preco, locale)}
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}

function Grupo({
  titulo,
  nomes,
  grupo,
  escaloes,
  locale,
}: {
  titulo: string;
  nomes: string[];
  grupo: "salgados" | "doces";
  escaloes: Escalao[];
  locale: Locale;
}) {
  if (nomes.length === 0) return null;
  return (
    <>
      <tr>
        <th
          colSpan={escaloes.length + 1}
          className="pb-1 pt-5 text-left text-xs font-semibold uppercase tracking-widest text-tijolo"
        >
          {titulo}
        </th>
      </tr>
      {nomes.map((nome) => (
        <tr key={nome} className="border-b border-tinta/10">
          <td className="py-2">
            {escaloes
              .flatMap((e) => e[grupo])
              .find((l) => l.nome.pt === nome)?.nome[locale] ?? nome}
          </td>
          {escaloes.map((e) => (
            <td key={e.pessoas} className="py-2 text-right tabular-nums text-tinta-suave">
              {e[grupo].find((l) => l.nome.pt === nome)?.quantidade[locale] ?? "—"}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * O catálogo do bolo por medida.
 *
 * ⚠️ **Estava no meio da `/encomendas` e ocupava meia página.** Noventa e nove
 * opções entre a linha clássica e a vegan, entre as boxes e o formulário, a
 * separar duas coisas que se compram e que passavam a estar a cinco ecrãs uma da
 * outra. Aqui é o conteúdo principal da página de quem veio ver o bolo — e não
 * aparece a quem veio ver uma box.
 */
function CatalogoDoBolo({ locale }: { locale: Locale }) {
  const bolos = useTranslations("bolos");

  return (
    <section aria-labelledby="catalogo" className="seccao bg-papel-fundo">
      <div className="envolvente">
        <h2 id="catalogo" className="titulo-display titulo-gama">
          {bolos("titulo")}
        </h2>
        <p className="mt-3 max-w-[52ch] text-tinta-suave">
          {bolos("texto", {
            classica: quantasOpcoes("classica"),
            vegan: quantasOpcoes("vegan"),
          })}
        </p>

        <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {GRUPOS.map((grupo) => {
            const classicas = opcoesDe(grupo, "classica");
            const veganas = opcoesDe(grupo, "vegan");
            const soVeganas = veganas.filter(
              (v) => !classicas.some((c) => c.nome.pt === v.nome.pt),
            );

            return (
              <div key={grupo}>
                <h3 className="titulo-display text-sm uppercase tracking-[0.2em] text-tijolo">
                  {bolos(`grupos.${grupo}`)}
                </h3>
                <ul className="mt-3 space-y-1 text-sm">
                  {classicas.map((opcao) => (
                    <li key={opcao.nome.pt}>
                      {opcao.nome[locale]}
                      {opcao.nota && (
                        <span className="text-tinta-suave"> {opcao.nota[locale]}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* As opções vegan que a linha clássica não tem. Repetir as que
                    são iguais nas duas listas dava uma coluna que ninguém lê e
                    uma correção que só entra numa delas. */}
                {soVeganas.length > 0 && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-verde-forte">
                      {bolos("soVegan")}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {soVeganas.map((opcao) => (
                        <li key={opcao.nome.pt}>
                          {opcao.nome[locale]}
                          {opcao.nota && (
                            <span className="text-tinta-suave"> {opcao.nota[locale]}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ⚠️ Nenhuma destas escolhas tem preço no impresso, e não se inventa um.
            Ver o cabeçalho de `bolos.ts`. */}
        <p className="mt-10 max-w-[60ch] text-sm text-tinta-suave">
          {bolos("semPrecos")}
        </p>
      </div>
    </section>
  );
}
