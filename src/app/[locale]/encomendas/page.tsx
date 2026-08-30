import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { encomendas } from "@/data/encomendas";
import { GRUPOS, opcoesDe, quantasOpcoes } from "@/data/bolos";
import { casa, telefoneMarcavel } from "@/data/casa";
import { formatarPreco } from "@/lib/preco";
import { routing, type Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { TabelaKits } from "@/components/encomendas/TabelaKits";

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
 * **Não é uma loja.** Não há carrinho, não há pagamento e não há calendário de
 * disponibilidade — e nenhuma dessas coisas se pode fingir: um botão "Encomendar"
 * que abre o cliente de correio é honesto; um que parece um checkout e acaba num
 * email não é.
 *
 * É um **catálogo que termina num pedido**. A sequência é a da conversa que já
 * acontece ao telefone:
 *
 * 1. *quantas pessoas?* — os kits de festa, com a tabela a comparar as três
 *    gamas lado a lado no mesmo escalão;
 * 2. *e o bolo?* — os três kits de bolo decorado, que são preço fechado;
 * 3. *quero um bolo à minha maneira* — o configurador, que **não tem preços** e
 *    por isso acaba num pedido de orçamento e não num total;
 * 4. *e para dois?* — as boxes, que é a encomenda pequena;
 * 5. *como é que peço?* — o bloco de contacto, com o prazo à frente.
 *
 * ## O prazo é a informação mais importante desta página
 *
 * ⚠️ E **ainda não a temos.** Uma página de encomendas sem prazo de antecedência
 * põe alguém a pedir um kit de setenta pessoas para amanhã. Enquanto a casa não
 * disser quantos dias precisa, o bloco de contacto diz "por confirmar" com todas
 * as letras em vez de adivinhar um número — ver `messages/pt.json` e a lista
 * *Antes de publicar* do README.
 */
function Encomendas({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas");
  const bolos = useTranslations("bolos");
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
            className="titulo-display titulo-capa mt-4 text-[clamp(3rem,11vw,8rem)] uppercase"
            style={{ fontVariationSettings: '"wdth" 68, "opsz" 48' }}
          >
            {t("titulo")}
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg">{t("intro")}</p>
        </div>
      </div>

      {/* ── Kits de festa ─────────────────────────────────────────────── */}
      <section aria-labelledby="festas" className="seccao">
        <div className="envolvente">
          <h2 id="festas" className="titulo-display titulo-beta max-w-[16ch]">
            {t("festas.titulo")}
          </h2>
          <p className="mt-4 max-w-[52ch] text-tinta-suave">{t("festas.texto")}</p>
        </div>

        {/* Cliente, porque escolher o número de pessoas troca a tabela toda sem
            recarregar a página. Ver o componente. */}
        <TabelaKits locale={locale} />
      </section>

      {/* ── Kits de bolo ──────────────────────────────────────────────── */}
      <section aria-labelledby="kits-bolo" className="seccao bg-papel-fundo">
        <div className="envolvente">
          <h2 id="kits-bolo" className="titulo-display titulo-beta max-w-[16ch]">
            {t("kitsBolo.titulo")}
          </h2>
          <p className="mt-4 max-w-[52ch] text-tinta-suave">
            {t("kitsBolo.texto")}
          </p>

          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {encomendas.kitsBolo.map((kit) => (
              <li
                key={kit.id}
                className="flex flex-col rounded-2xl border border-tinta/15 bg-papel p-7"
              >
                <h3 className="titulo-display titulo-gama">{kit.nome[locale]}</h3>
                <p className="mt-2 text-sm text-tinta-suave">
                  {kit.resumo[locale]}
                </p>
                <p className="titulo-display mt-5 text-4xl tabular-nums text-tijolo">
                  {formatarPreco(kit.preco, locale)}
                </p>
                <ul className="mt-6 space-y-1.5 text-sm">
                  {kit.itens.map((item) => (
                    <li key={item.nome.pt} className="flex justify-between gap-4">
                      <span>{item.nome[locale]}</span>
                      <span className="shrink-0 tabular-nums text-tinta-suave">
                        {item.quantidade[locale]}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {/* Está em letra pequena no impresso e é um compromisso com quem paga:
              o preço do kit não inclui levar aquilo a lado nenhum. */}
          <p className="mt-8 max-w-[60ch] text-sm text-tinta-suave">
            {t("kitsBolo.nota")}
          </p>
        </div>
      </section>

      {/* ── Bolo por medida ───────────────────────────────────────────── */}
      <section aria-labelledby="bolo-medida" className="seccao">
        <div className="envolvente">
          <h2 id="bolo-medida" className="titulo-display titulo-beta max-w-[18ch]">
            {bolos("titulo")}
          </h2>
          <p className="mt-4 max-w-[52ch] text-tinta-suave">
            {bolos("texto", {
              classica: quantasOpcoes("classica"),
              vegan: quantasOpcoes("vegan"),
            })}
          </p>

          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {GRUPOS.map((grupo) => {
              const classicas = opcoesDe(grupo, "classica");
              const veganas = opcoesDe(grupo, "vegan");

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
                          <span className="text-tinta-suave">
                            {" "}
                            {opcao.nota[locale]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* As opções vegan que a linha clássica não tem. Repetir as
                      vinte que são iguais nas duas listas dava uma coluna que
                      ninguém lê e uma correção que só entra numa delas. */}
                  {veganas.some(
                    (v) => !classicas.some((c) => c.nome.pt === v.nome.pt),
                  ) && (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-verde-forte">
                        {bolos("soVegan")}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {veganas
                          .filter(
                            (v) => !classicas.some((c) => c.nome.pt === v.nome.pt),
                          )
                          .map((opcao) => (
                            <li key={opcao.nome.pt}>
                              {opcao.nome[locale]}
                              {opcao.nota && (
                                <span className="text-tinta-suave">
                                  {" "}
                                  {opcao.nota[locale]}
                                </span>
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

          {/* ⚠️ Nenhuma destas escolhas tem preço no impresso, e não se inventa
              um. Ver o cabeçalho de `bolos.ts`. */}
          <p className="mt-10 max-w-[60ch] text-sm text-tinta-suave">
            {bolos("semPrecos")}
          </p>
        </div>
      </section>

      {/* ── Boxes ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="boxes" className="seccao bg-papel-fundo">
        <div className="envolvente">
          <h2 id="boxes" className="titulo-display titulo-beta max-w-[16ch]">
            {t("boxes.titulo")}
          </h2>
          <p className="mt-4 max-w-[52ch] text-tinta-suave">{t("boxes.texto")}</p>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {encomendas.boxes.map((box) => (
              <li
                key={box.id}
                className="flex flex-col rounded-2xl border border-tinta/15 bg-papel p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="titulo-display titulo-gama">
                    {box.nome[locale]}
                  </h3>
                  {box.vegan && (
                    <span className="bloco-verde-texto shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider">
                      {t("boxes.vegan")}
                    </span>
                  )}
                </div>
                <p className="titulo-display mt-4 text-4xl tabular-nums text-tijolo">
                  {formatarPreco(box.preco, locale)}
                </p>
                <ul className="mt-6 space-y-1.5 text-sm text-tinta-suave">
                  {box.itens.map((item) => (
                    <li key={item.pt}>{item[locale]}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Como encomendar ───────────────────────────────────────────── */}
      <section aria-labelledby="como" className="seccao bg-tinta text-papel">
        <div className="envolvente">
          <h2 id="como" className="titulo-display titulo-beta max-w-[14ch]">
            {t("como.titulo")}
          </h2>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-papel/85">
            {t("como.texto")}
          </p>

          {/* ⚠️ O prazo de antecedência ainda não veio da casa. Enquanto não
              vier, esta linha diz que está por confirmar em vez de inventar um
              número — alguém a pedir setenta doses para amanhã é o erro que uma
              página de encomendas não pode cometer. */}
          <p className="mt-4 max-w-[48ch] text-sm text-papel/70">
            {t("como.prazo")}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            {telefone && (
              <a
                href={telefone}
                className="premivel rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
              >
                {t("como.telefonar", { numero: casa.telefone ?? "" })}
              </a>
            )}
            {casa.email && (
              <a
                href={`mailto:${casa.email}?subject=${encodeURIComponent(
                  t("como.assunto"),
                )}`}
                className="premivel rounded-full border border-papel/40 px-7 py-4 text-sm font-semibold uppercase tracking-widest hover:bg-papel hover:text-tinta"
              >
                {t("como.email")}
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
