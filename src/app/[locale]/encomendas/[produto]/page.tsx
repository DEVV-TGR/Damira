import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "@/lib/site";
import { imagensDePartilha } from "@/lib/metadata";
import { listarProdutos, opcoesDoBolo, produtoPorId } from "@/lib/dados";
import type { GrupoComposicao, OpcoesBolo, Produto } from "@/lib/dados/tipos";
import { formatarCent } from "@/lib/preco";
import {
  caminhoDoProduto,
  descricaoDe,
  emLingua,
  nomeDe,
  paraPersonalizar,
  temPagina,
  precoUnicoCent,
  tipoDoPedido,
  type DadosPersonalizacao,
} from "@/lib/vista";
import { ComprarProduto } from "@/components/encomendas/ComprarProduto";
import { ConfiguradorBolo } from "@/components/encomendas/ConfiguradorBolo";
import { ComFotoEscolhida, GaleriaProduto } from "@/components/encomendas/GaleriaProduto";
import { VoltarAtras } from "@/components/VoltarAtras";

/** Uma página por produto e por língua, todas geradas no `build`. */
export async function generateStaticParams() {
  const produtos = (await listarProdutos()).filter(temPagina);
  return routing.locales.flatMap((locale) =>
    produtos.map((produto) => ({ locale, produto: produto.id })),
  );
}

/* Desde 26/11 os artigos da carta que se encomendam também têm página
   (`temPagina`): é onde se personalizam e onde estão as fotografias todas. */
const produtoDeEncomenda = async (id: string): Promise<Produto | null> => {
  const produto = await produtoPorId(id);
  return produto && temPagina(produto) ? produto : null;
};

type Linha = GrupoComposicao["linhas"][number];

/** Um escalão de um kit de festa, como a tabela o desenha. */
type Escalao = { pessoas: number; precoCent: number | null; salgados: Linha[]; doces: Linha[] };

const grupoDe = (composicao: GrupoComposicao[], grupo: GrupoComposicao["grupo"]): Linha[] =>
  composicao.find((g) => g.grupo === grupo)?.linhas ?? [];

/* Num kit de festa cada variante é um escalão: o número de pessoas, o preço e
   o que leva. */
const escaloesDe = (produto: Produto): Escalao[] =>
  produto.familia === "festa"
    ? produto.variantes.filter((v) => v.ativa && v.pessoas !== null).map((variante) => ({
        pessoas: variante.pessoas!,
        precoCent: variante.precoCent,
        salgados: grupoDe(variante.composicao, "salgados"),
        doces: grupoDe(variante.composicao, "doces"),
      }))
    : [];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; produto: string }>;
}): Promise<Metadata> {
  const { locale, produto: id } = await params;
  const produto = await produtoDeEncomenda(id);
  if (!produto) return {};

  const t = await getTranslations({ locale, namespace: "produto" });
  const marca = await getTranslations({ locale, namespace: "marca" });
  const meta = await getTranslations({ locale, namespace: "metadata" });

  const l = locale as Locale;
  const titulo = nomeDe(produto, l);
  const descricao = descricaoDe(produto, l) ?? t("descricaoGenerica", { nome: titulo });
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
  const produto = await produtoDeEncomenda(id);
  if (!produto) notFound();

  /* Os simples que um composto leva, para as variâncias deles (#88). Com os
     arquivados: arquivar um simples não o tira de um kit, e o servidor pede as
     variâncias dele na mesma (`cotarLinhas`). Uma leitura só, e só num composto. */
  const levados = new Set(produto.variantes.flatMap((v) => v.leva.map((l) => l.produtoId)));
  const simples = levados.size > 0 ? (await listarProdutos({ incluirArquivados: true })).filter((p) => levados.has(p.id)) : [];

  /* Só o bolo personalizado precisa delas, e só ele as lê. */
  const opcoes = produto.familia === "medida" ? await opcoesDoBolo() : null;

  return (
    <Detalhe produto={produto} personalizavel={paraPersonalizar(produto, simples)} opcoes={opcoes} locale={locale as Locale} />
  );
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
function Detalhe({
  produto,
  personalizavel,
  opcoes,
  locale,
}: {
  produto: Produto;
  personalizavel: DadosPersonalizacao;
  /** As opções do bolo personalizado; `null` nos outros produtos. */
  opcoes: OpcoesBolo | null;
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const te = useTranslations("encomendas");

  const nome = nomeDe(produto, locale);
  const resumo = descricaoDe(produto, locale);

  /* Os tamanhos ou os grupos que se escolhem: os disponíveis. */
  const variantes = produto.variantes
    .filter((v) => v.ativa)
    .map((v) => ({ id: v.id, rotulo: v.rotulo ? emLingua(v.rotulo, locale) : null, pessoas: v.pessoas, precoCent: v.precoCent }));

  return (
    <>
      <div className="seccao ficha-produto">
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
              do conteúdo** — e a tabela de escalões tem o mínimo das quatro
              colunas. Sem isto, a coluna esticava-se até à tabela (eram 352 px,
              quando ela tinha `min-w`) e a **página inteira** ganhava rolagem
              horizontal a 320 px, apesar de a tabela já viver dentro de um
              `overflow-x-auto` que era suposto tratar disso. Só na página dos
              kits de festa; as outras não têm tabela e davam verde. */}
          <ComFotoEscolhida>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              {/* ⚠️ **Colada ao topo enquanto se rola.** A tabela de um kit de
                  festa tem vinte e tal linhas; sem isto, a coluna da esquerda
                  ficava com a fotografia em cima e dois ecrãs de branco por
                  baixo, e quem chegasse ao preço já não via o produto. Só a
                  partir do `lg`, que é onde há duas colunas. */}
              <div className="lg:sticky lg:top-20">
                <GaleriaProduto fotos={produto.fotos} alt={nome} />
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

              {/* O que leva em texto, dos kits de antes da #88. Um grupo que já
                  passou a produtos mostra-os ao escolher (`LevaDoGrupo`). */}
              {produto.variantes.every((v) => v.leva.length === 0) && <Conteudo produto={produto} locale={locale} />}

              {/* O bolo personalizado monta-se no configurador (#51), sem as peças da
                  #88; o resto escolhe-se e junta-se. */}
              {opcoes ? (
                <ConfiguradorBolo opcoes={opcoes} produtoId={produto.id} nome={nome} locale={locale} />
              ) : (
                <ComprarProduto
                  personalizavel={personalizavel}
                  composto={produto.tipo === "composto"}
                  /* O mesmo id que o cartão da carta dá (`ementa:<id>`): juntar
                     aqui e lá soma na mesma linha. */
                  id={produto.origem === "ementa" ? `ementa:${produto.id}` : produto.id}
                  produtoId={produto.id}
                  tipo={tipoDoPedido(produto)}
                  nome={nome}
                  precoCent={precoUnicoCent(produto)}
                  variantes={variantes}
                  locale={locale}
                  /* Mensagem por cima só faz sentido onde há bolo. Numa box de
                     pequeno-almoço é um campo a mais, e cada campo a mais é gente
                     que hesita sem razão. */
                  comMensagem={produto.familia === "bolo" || produto.familia === "medida"}
                  /* O mínimo e o passo são do produto (#40): uma dúzia de natas de
                     6 em 6, um bolo ao quilo. Nos kits é «um de cada vez». */
                  regra={{ unidade: produto.unidade, minimo: produto.quantidadeMinima, passo: produto.multiplo }}
                  notaDaRegra={
                    produto.unidade === "kg"
                      ? te("daEmenta.regraKg", { minimo: produto.quantidadeMinima })
                      : produto.quantidadeMinima > 1
                        ? te("daEmenta.regraUn", { minimo: produto.quantidadeMinima, passo: produto.multiplo })
                        : undefined
                  }
                />
              )}

              {/* O prazo é a informação mais importante desta página, e continua
                  por confirmar pela casa. Ver a #3. */}
              <p className="mt-6 text-sm text-tinta-suave">{te("como.prazo")}</p>
            </div>
          </div>
          </ComFotoEscolhida>
        </div>
      </div>

      {/* O «voltar» fixo (#86), no fim do documento de propósito: no teclado o
          link do topo já é o primeiro, e este fica para quem chegou ao fim. */}
      <VoltarAtras para="/encomendas" />
    </>
  );
}

/** O que o produto leva — e cada família diz isso à sua maneira. */
function Conteudo({ produto, locale }: { produto: Produto; locale: Locale }) {
  const t = useTranslations("produto");
  const te = useTranslations("encomendas");

  if (produto.familia === "festa") {
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
          <TabelaEscaloes escaloes={escaloesDe(produto)} locale={locale} />
        </div>
      </div>
    );
  }

  if (produto.familia === "bolo") {
    const itens = grupoDe(produto.variantes[0].composicao, "itens");
    return (
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("oQueLeva")}
        </h2>
        <ul className="mt-3 divide-y divide-tinta/12 border-y border-tinta/12">
          {itens.map((item) => (
            <li key={item.nome.pt} className="flex justify-between gap-4 py-2.5">
              <span>{emLingua(item.nome, locale)}</span>
              <span className="shrink-0 tabular-nums text-tinta-suave">
                {item.quantidade && emLingua(item.quantidade, locale)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-tinta-suave">{te("kitsBolo.nota")}</p>
      </div>
    );
  }

  if (produto.familia === "box") {
    const itens = grupoDe(produto.variantes[0].composicao, "itens");
    return (
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("oQueLeva")}
        </h2>
        <ul className="mt-3 space-y-1.5 divide-y divide-tinta/12 border-y border-tinta/12 text-tinta-suave">
          {itens.map((item) => (
            <li key={item.nome.pt} className="py-2.5">
              {emLingua(item.nome, locale)}
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

  /* ⚠️ **Sem largura mínima, e com um intervalo à esquerda de cada coluna de
     números.** A tabela tinha `min-w-[22rem]` (352 px), mais do que cabe em
     qualquer telemóvel abaixo dos 414 px: rolava de lado entre 2 e 72 px, sem
     nada que o dissesse, e a coluna dos setenta ficava cortada a meio da
     palavra — a 320 px nem se via. E sem o intervalo as colunas encostavam-se:
     «1 unidade2 unidades». Abaixo do `sm`, letra, preços e intervalo encolhem
     para as quatro colunas caberem nos 280 px de um ecrã de 320: o mínimo vem
     de «Hambúrgueres», de «unidades» e dos preços, que não partem. Medido a
     320, 340, 360, 375, 390 e 414, nos três kits e nas duas línguas. */
  return (
    <table className="w-full border-collapse text-[0.8125rem] sm:text-sm">
      <thead>
        <tr className="border-b border-tinta/20">
          {/* ⚠️ Vazio, e não «o que leva» outra vez: o título da secção está
              três linhas acima e dizia exactamente o mesmo. Um cabeçalho
              repetido a dois centímetros do original lê-se como um erro. */}
          <th className="py-2 text-left font-semibold">
            <span className="sr-only">{t("oQueLeva")}</span>
          </th>
          {escaloes.map((e) => (
            <th key={e.pessoas} className="py-2 pl-1.5 text-right tabular-nums sm:pl-3">
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
              className="titulo-display py-3 pl-1.5 text-right text-[0.9375rem] tabular-nums text-tijolo sm:pl-3 sm:text-lg"
            >
              {e.precoCent !== null && formatarCent(e.precoCent, locale)}
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
              .map((l) => (l.nome.pt === nome ? emLingua(l.nome, locale) : null))
              .find((texto) => texto !== null) ?? nome}
          </td>
          {escaloes.map((e) => (
            <td key={e.pessoas} className="py-2 pl-1.5 text-right tabular-nums text-tinta-suave sm:pl-3">
              {(() => {
                const quantidade = e[grupo].find((l) => l.nome.pt === nome)?.quantidade;
                return quantidade ? emLingua(quantidade, locale) : "—";
              })()}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
