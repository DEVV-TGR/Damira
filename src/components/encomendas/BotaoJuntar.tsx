"use client";


import { useTranslations } from "next-intl";
import { useCesto } from "./CestoProvider";
import { quantidadeEmTexto, type ItemCesto } from "@/lib/cesto";
import type { Locale } from "@/i18n/routing";

/**
 * O botão que junta um artigo ao pedido.
 *
 * ## O estado depois de carregar não é decoração
 *
 * ⚠️ Quando o artigo já está no cesto, o botão **mostra quanto** e continua a
 * funcionar para juntar mais. Um botão que fica igual depois de carregado deixa
 * a pessoa sem saber se acertou, e a reacção normal a isso é carregar outra vez
 * — o que num carrinho quer dizer pedir dois bolos por engano.
 *
 * ⚠️ **E mostra a quantidade com a unidade**, não um número solto: «1,5 kg» e
 * não «1,5». Num bolo vendido ao quilo, o número sozinho lê-se como número de
 * bolos, que é o erro mais caro que esta página pode cometer.
 *
 * ## Três feitios para três sítios
 *
 * - `principal` — o botão cheio dos cartões dos kits e das boxes;
 * - `discreta` — contornado, para o bolo por medida, que não é um produto de
 *   prateleira e não devia competir com os que têm preço;
 * - `compacta` — só o sinal e a quantidade, para as **setenta linhas** da carta
 *   por encomenda. Ali, «Juntar ao pedido» escrito setenta vezes é uma coluna de
 *   ruído que empurra o nome do artigo para fora do ecrã no telemóvel.
 *
 * ⚠️ Na compacta o nome do artigo vai no `aria-label`, porque quem ouve a página
 * só ouviria «mais, mais, mais» setenta vezes seguidas.
 *
 * ## Só para o que não pede escolha
 *
 * ⚠️ Um produto com variâncias, opções ou extras (#88) **não usa este botão**:
 * personaliza-se na página dele, onde estão as fotografias (decidido a 26/11 —
 * antes abria uma janela por cima do cartão). O cartão leva lá
 * (`CartaoArtigo`). O servidor recusa a linha sem as variâncias respondidas
 * (`escolha-invalida`), por isso juntar daqui um produto que as tem não
 * chegava a lado nenhum.
 *
 * ## Sem cesto, sem botão
 *
 * Fora do `CestoProvider` isto não renderiza nada. É a razão de o `useCesto`
 * devolver `null` em vez de atirar: um cartão reutilizado noutra página perde o
 * botão em vez de partir a página.
 */
export function BotaoJuntar({
  item,
  variante = "principal",
  locale = "pt",
}: {
  item: Omit<ItemCesto, "quantidade">;
  variante?: "principal" | "discreta" | "compacta";
  locale?: Locale;
}) {
  const t = useTranslations("encomendas.cesto");
  const contexto = useCesto();

  if (!contexto) return null;

  const linhas = contexto.cesto.filter((i) => i.id === item.id);
  const noCesto = linhas.length > 0 ? { ...linhas[0], quantidade: linhas.reduce((s, i) => s + i.quantidade, 0) } : null;
  const rotuloQuantidade = noCesto ? quantidadeEmTexto(noCesto, locale) : null;

  const aoCarregar = () => contexto.juntar({ ...item });

  if (variante === "compacta") {
    return (
      <>
        <button
          type="button"
          onClick={aoCarregar}
          aria-label={t("juntarArtigo", { nome: item.nome })}
          className={`premivel flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums ${
            noCesto
              ? "bg-tijolo text-papel"
              : "border border-tinta/25 hover:bg-tinta hover:text-papel"
          }`}
        >
          {rotuloQuantidade ?? <span aria-hidden>+</span>}
        </button>
      </>
    );
  }

  const base =
    "premivel alvo-toque inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold";
  const cor =
    variante === "principal"
      ? "bg-tijolo text-papel hover:bg-tinta"
      : "border-2 border-current hover:bg-tinta hover:text-papel";

  return (
    <>
      <button
        type="button"
        onClick={aoCarregar}
        className={`${base} ${cor}`}
      >
        {noCesto ? t("juntado") : t("juntar")}
        {rotuloQuantidade && (
          <span className="rounded-full bg-papel/25 px-2 py-0.5 tabular-nums">
            {rotuloQuantidade}
          </span>
        )}
      </button>
    </>
  );
}
