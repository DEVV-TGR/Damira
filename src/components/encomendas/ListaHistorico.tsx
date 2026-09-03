"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatarPreco } from "@/lib/preco";
import { quantidadeEmTexto, type ItemCesto } from "@/lib/cesto";
import { paraOCesto, type PedidoGuardado } from "@/lib/historico";
import type { Locale } from "@/i18n/routing";
import { useHistorico } from "./ProvedorHistorico";
import { useCesto } from "./CestoProvider";

/**
 * # Os pedidos que já fez
 *
 * ## ⚠️ A ressalva não é letra pequena, é a primeira coisa que se lê
 *
 * Isto são **os pedidos feitos neste browser** e não o histórico da casa. Quem
 * pediu ao telefone, ou noutro dispositivo, não encontra nada aqui — e quem não
 * encontra o seu pedido num sítio chamado «as suas encomendas» conclui que ele
 * se perdeu. Por isso o aviso fica **por cima da lista**: depois dela chega
 * tarde, quando a pessoa já procurou e já se assustou.
 *
 * ## Porque aparece nas duas páginas
 *
 * Na conta, porque é onde se espera. E em `/encomendas`, porque é onde a pessoa
 * está quando lhe dá jeito: numa pastelaria, a pergunta mais frequente é *o
 * mesmo da outra vez*, e essa faz-se a caminho de encomendar e não a caminho de
 * consultar um perfil. ⚠️ E porque **sem chaves de autenticação não há página de
 * conta nenhuma** — se isto só vivesse lá, a funcionalidade não existia na
 * instalação que está no ar.
 */
export function ListaHistorico({
  locale,
  variante = "clara",
  mostrarVazio = false,
  comoSeccao = false,
}: {
  locale: Locale;
  /** `escura` para o bloco a tinta da página da conta não ficar ilegível. */
  variante?: "clara" | "escura";
  /**
   * ⚠️ **Só a página da conta mostra o vazio.**
   *
   * Lá é preciso: quem entrou na conta à procura das suas encomendas e não vê
   * nada nem uma frase conclui que o site está avariado. Em `/encomendas` seria
   * o contrário — uma caixa a dizer «ainda não pediu nada» entre o herói e os
   * kits, para toda a gente que chega pela primeira vez.
   */
  mostrarVazio?: boolean;
  /**
   * Envolve-se na sua própria `<section>`.
   *
   * ⚠️ **Existe porque uma secção vazia continua a ocupar o ecrã.** Na
   * `/encomendas` a secção era escrita fora deste componente, no servidor: com o
   * histórico vazio — que é o caso de toda a gente que chega pela primeira vez —
   * a lista devolvia `null` mas ficava lá a secção, com o seu fundo e o seu
   * `padding`. No telemóvel eram **duzentos e cinquenta píxeis de nada** entre o
   * herói e o primeiro produto. Com a secção aqui dentro, não havendo lista não
   * há secção nenhuma.
   */
  comoSeccao?: boolean;
}) {
  const t = useTranslations("historico");
  const tf = useTranslations("encomendas.formulario");
  const historico = useHistorico();
  const cesto = useCesto();
  /* A referência do pedido cuja repetição está à espera de confirmação. */
  const [aConfirmar, setAConfirmar] = useState<string | null>(null);

  if (!historico || !historico.pronto) return null;

  /** A secção à volta, quando quem chama a pediu. */
  const envolver = (conteudo: React.ReactNode) =>
    comoSeccao ? (
      <section className="seccao bg-papel-fundo">
        <div className="envolvente">{conteudo}</div>
      </section>
    ) : (
      conteudo
    );

  if (historico.pedidos.length === 0) {
    if (!mostrarVazio) return null;
    return envolver(
      <div className="rounded-xl border border-dashed border-tinta/25 p-5">
        <p className="font-semibold">{t("vazio")}</p>
        <p className="mt-2 max-w-[60ch] text-sm text-tinta-suave">
          {t("apenasNesteBrowser")}
        </p>
      </div>,
    );
  }

  const repetir = (pedido: PedidoGuardado) => {
    const itens: ItemCesto[] = pedido.itens.map(paraOCesto);
    /* ⚠️ **Repor substitui o cesto.** Se já lá estiver alguma coisa, pergunta-se
       primeiro: um pedido que é metade do antigo e metade do novo não é o que
       ninguém quis, e o erro só se descobre no email que a casa recebe. */
    if ((cesto?.cesto.length ?? 0) > 0 && aConfirmar !== pedido.referencia) {
      setAConfirmar(pedido.referencia);
      return;
    }
    cesto?.repor(itens);
    setAConfirmar(null);
  };

  const suave = variante === "escura" ? "text-papel/70" : "text-tinta-suave";
  const risca = variante === "escura" ? "divide-papel/20" : "divide-tinta/12";
  const contorno = variante === "escura" ? "border-papel/25" : "border-tinta/15";

  return envolver(
    <div>
      <h2 className="titulo-display titulo-gama">{t("titulo")}</h2>
      <p className={`mt-2 max-w-[60ch] text-sm ${suave}`}>{t("apenasNesteBrowser")}</p>

      <ul className={`mt-6 divide-y ${risca} border-y ${contorno}`}>
        {historico.pedidos.map((pedido) => (
          <li key={pedido.referencia} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="titulo-display text-lg tracking-[0.08em]">
                {pedido.referencia}
              </p>
              <p className={`text-sm ${suave}`}>
                {t("feitoEm", { quando: dataCurta(pedido.quando, locale) })}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${
                  pedido.estado === "enviado"
                    ? "bloco-verde-texto"
                    : "bg-tijolo text-papel"
                }`}
              >
                {t(`estados.${pedido.estado}`)}
              </span>
              <span className={suave}>{tf(`tipos.${pedido.tipo}`)}</span>
              {pedido.data && (
                <span className={suave}>
                  · {t("para", { quando: dataCurta(pedido.data, locale) })}
                </span>
              )}
            </div>

            {pedido.itens.length > 0 && (
              <ul className={`mt-3 space-y-1 text-sm ${suave}`}>
                {pedido.itens.map((item) => (
                  <li key={item.id}>
                    {quantidadeEmTexto(
                      { ...item, id: item.id, pessoas: null } as ItemCesto,
                      locale,
                    )}{" "}
                    {item.nome}
                    {item.variante && ` (${item.variante})`}
                  </li>
                ))}
                <li className="pt-1 font-semibold">
                  {pedido.semPreco > 0 ? t("aPartirDe") : t("estimado")}{" "}
                  {formatarPreco(pedido.estimativa, locale)}
                </li>
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {pedido.itens.length > 0 && (
                <button
                  type="button"
                  onClick={() => repetir(pedido)}
                  className={`premivel alvo-toque inline-flex min-h-11 items-center rounded-full border-2 px-5 text-sm font-semibold ${
                    aConfirmar === pedido.referencia
                      ? "border-tijolo bg-tijolo text-papel"
                      : "border-current"
                  }`}
                >
                  {aConfirmar === pedido.referencia
                    ? t("repetirConfirmar")
                    : t("repetir")}
                </button>
              )}
              <button
                type="button"
                onClick={() => historico.apagar(pedido.referencia)}
                className={`alvo-toque text-sm underline underline-offset-4 ${suave}`}
              >
                {t("apagar")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={historico.limpar}
        className={`alvo-toque mt-4 text-xs font-semibold uppercase tracking-widest underline underline-offset-4 ${suave}`}
      >
        {t("limparTudo")}
      </button>
    </div>,
  );
}

/**
 * ⚠️ **`2026-09-20` não se dá ao `new Date()` sozinho.**
 *
 * Uma data sem hora é interpretada como UTC à meia-noite, e em Portugal no
 * verão isso é 20 de setembro à 01:00 — mas a oeste de Greenwich seria dia 19.
 * O `T12:00:00` põe o instante ao meio-dia local, onde nenhum fuso o empurra
 * para o dia errado. É a mesma correcção que o `dataFutura` do `pedidos.ts` faz.
 */
function dataCurta(valor: string, locale: Locale): string {
  const quando = valor.includes("T") ? new Date(valor) : new Date(`${valor}T12:00:00`);
  if (Number.isNaN(quando.getTime())) return valor;
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "long",
  }).format(quando);
}
