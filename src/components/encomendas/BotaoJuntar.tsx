"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCesto } from "./CestoProvider";
import { idComEscolha, quantidadeEmTexto, type ItemCesto } from "@/lib/cesto";
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
 * ## Com sabores, pergunta primeiro
 *
 * ⚠️ Num produto com escolhas (os folhados vegan: alheira, legumes…), o botão
 * **abre «Qual sabor?» antes de juntar**, e o sabor entra na linha — nunca nas
 * observações. Cada sabor é uma linha à parte, com a sua dúzia (decidido a
 * 05/10). O servidor recusa a linha sem sabor (`escolha-invalida`), por isso
 * isto não é cosmética: sem a pergunta, o cesto não se enviava.
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
  escolhas = [],
}: {
  item: Omit<ItemCesto, "quantidade">;
  variante?: "principal" | "discreta" | "compacta";
  locale?: Locale;
  /** Os sabores do produto. Com algum, o botão pergunta qual antes de juntar. */
  escolhas?: readonly string[];
}) {
  const t = useTranslations("encomendas.cesto");
  const contexto = useCesto();
  const [aEscolher, setAEscolher] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  /* Um `<dialog>` com `showModal()`: o Esc, o foco e o fundo inerte vêm do browser. */
  useEffect(() => {
    if (aEscolher) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [aEscolher]);

  if (!contexto) return null;

  /* Com sabores, o que conta é o total das linhas deste artigo, de todos os sabores. */
  const linhas = contexto.cesto.filter((i) =>
    escolhas.length > 0 ? i.id === item.id || i.id.startsWith(`${item.id}~`) : i.id === item.id,
  );
  const noCesto = linhas.length > 0 ? { ...linhas[0], quantidade: linhas.reduce((s, i) => s + i.quantidade, 0) } : null;
  const rotuloQuantidade = noCesto ? quantidadeEmTexto(noCesto, locale) : null;

  const juntarCom = (escolha: string | null) => {
    contexto.juntar({ ...item, id: idComEscolha(item.id, escolha), escolha });
    setAEscolher(false);
  };
  const aoCarregar = () => (escolhas.length > 0 ? setAEscolher(true) : juntarCom(null));

  const janela = escolhas.length > 0 && (
    <dialog
      ref={dialogo}
      onClose={() => setAEscolher(false)}
      onClick={(e) => e.target === e.currentTarget && setAEscolher(false)}
      aria-labelledby={`escolha-${item.id}`}
      className="m-auto w-[min(92vw,26rem)] rounded-3xl bg-papel p-6 text-tinta shadow-2xl backdrop:bg-tinta/50"
    >
      <p id={`escolha-${item.id}`} className="titulo-display text-2xl">
        {t("escolha.titulo")}
      </p>
      <p className="mt-1 font-semibold">{item.nome}</p>
      <p className="mt-1 text-sm text-tinta-suave">{t("escolha.ajuda")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {escolhas.map((escolha) => (
          <button
            key={escolha}
            type="button"
            onClick={() => juntarCom(escolha)}
            className="premivel min-h-11 rounded-full border border-tinta/25 px-4 text-sm font-semibold hover:bg-tinta hover:text-papel"
          >
            {escolha}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setAEscolher(false)} className="mt-5 min-h-11 text-sm underline underline-offset-4">
        {t("escolha.cancelar")}
      </button>
    </dialog>
  );

  if (variante === "compacta") {
    return (
      <>
        <button
          type="button"
          onClick={aoCarregar}
          aria-label={t("juntarArtigo", { nome: item.nome })}
          aria-haspopup={escolhas.length > 0 ? "dialog" : undefined}
          className={`premivel flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums ${
            noCesto
              ? "bg-tijolo text-papel"
              : "border border-tinta/25 hover:bg-tinta hover:text-papel"
          }`}
        >
          {rotuloQuantidade ?? <span aria-hidden>+</span>}
        </button>
        {janela}
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
        aria-haspopup={escolhas.length > 0 ? "dialog" : undefined}
        className={`${base} ${cor}`}
      >
        {noCesto ? t("juntado") : t("juntar")}
        {rotuloQuantidade && (
          <span className="rounded-full bg-papel/25 px-2 py-0.5 tabular-nums">
            {rotuloQuantidade}
          </span>
        )}
      </button>
      {janela}
    </>
  );
}
