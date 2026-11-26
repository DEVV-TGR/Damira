"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCesto } from "./CestoProvider";
import { NADA_ESCOLHIDO, idComPersonalizacao, quantidadeEmTexto, type Escolhido, type ItemCesto } from "@/lib/cesto";
import type { Locale } from "@/i18n/routing";
import { temPersonalizacao, type DadosPersonalizacao } from "@/lib/vista";
import { acrescimoCent, completo, Personalizar, textoDe } from "./Personalizar";
import { formatarCent } from "@/lib/preco";

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
 * ## Com personalização, pergunta primeiro
 *
 * ⚠️ Num produto com variâncias, opções ou extras (#88 — os folhados vegan e o
 * sabor, um cachorro sem fiambre), o botão **abre a personalização antes de
 * juntar**, e o que se escolheu entra na linha — nunca nas observações. Cada
 * combinação é uma linha à parte, com o seu mínimo (decidido a 05/10). O
 * servidor recusa a linha sem as variâncias respondidas (`escolha-invalida`),
 * por isso isto não é cosmética: sem a pergunta, o cesto não se enviava.
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
  personalizavel,
}: {
  item: Omit<ItemCesto, "quantidade">;
  variante?: "principal" | "discreta" | "compacta";
  locale?: Locale;
  /** As peças de um simples (#88). Com alguma, o botão pergunta antes de juntar. */
  personalizavel?: DadosPersonalizacao;
}) {
  const t = useTranslations("encomendas.cesto");
  const tp = useTranslations("personalizar");
  const contexto = useCesto();
  const [aEscolher, setAEscolher] = useState(false);
  const [escolhido, setEscolhido] = useState<Escolhido>(NADA_ESCOLHIDO);
  const [falta, setFalta] = useState(false);
  const pergunta = personalizavel !== undefined && temPersonalizacao(personalizavel);
  const dialogo = useRef<HTMLDialogElement>(null);

  /* Um `<dialog>` com `showModal()`: o Esc, o foco e o fundo inerte vêm do browser. */
  useEffect(() => {
    if (aEscolher) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [aEscolher]);

  if (!contexto) return null;

  /* Com personalização, o que conta é o total das linhas deste artigo, de todas as combinações. */
  const linhas = contexto.cesto.filter((i) =>
    pergunta ? i.id === item.id || i.id.startsWith(`${item.id}~`) : i.id === item.id,
  );
  const noCesto = linhas.length > 0 ? { ...linhas[0], quantidade: linhas.reduce((s, i) => s + i.quantidade, 0) } : null;
  const rotuloQuantidade = noCesto ? quantidadeEmTexto(noCesto, locale) : null;

  const juntarPersonalizado = () => {
    if (!personalizavel) return;
    if (!completo(personalizavel, item.varianteId, false, escolhido, locale)) return setFalta(true);
    contexto.juntar({
      ...item,
      id: idComPersonalizacao(item.id, escolhido),
      /* Só para mostrar: quem cobra é o servidor. */
      precoCent: item.precoCent === null ? null : item.precoCent + acrescimoCent(personalizavel, false, escolhido),
      escolha: textoDe(personalizavel, item.varianteId, false, escolhido, locale, (n) => tp("sem", { nome: n })),
      personalizacao: escolhido,
    });
    setAEscolher(false);
    setEscolhido(NADA_ESCOLHIDO);
    setFalta(false);
  };
  const aoCarregar = () => (pergunta ? setAEscolher(true) : contexto.juntar({ ...item }));
  const precoDaJanela =
    personalizavel && item.precoCent !== null ? item.precoCent + acrescimoCent(personalizavel, false, escolhido) : null;

  const janela = pergunta && personalizavel && (
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
      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        <Personalizar
          dados={personalizavel}
          varianteId={item.varianteId}
          composto={false}
          valor={escolhido}
          onMudar={(v) => {
            setEscolhido(v);
            setFalta(false);
          }}
          locale={locale}
          falta={falta}
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={juntarPersonalizado}
          className="premivel alvo-toque inline-flex min-h-11 items-center gap-2 rounded-full bg-tijolo px-5 text-sm font-semibold text-papel"
        >
          {t("juntar")}
          {precoDaJanela !== null && <span className="tabular-nums opacity-90">{formatarCent(precoDaJanela, locale)}</span>}
        </button>
        <button type="button" onClick={() => setAEscolher(false)} className="min-h-11 text-sm underline underline-offset-4">
          {t("escolha.cancelar")}
        </button>
      </div>
    </dialog>
  );

  if (variante === "compacta") {
    return (
      <>
        <button
          type="button"
          onClick={aoCarregar}
          aria-label={t("juntarArtigo", { nome: item.nome })}
          aria-haspopup={pergunta ? "dialog" : undefined}
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
        aria-haspopup={pergunta ? "dialog" : undefined}
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
