"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { estimativa, quantidadeEmTexto, totalArtigos, totalDaLinha } from "@/lib/cesto";
import { formatarCent } from "@/lib/preco";
import { useCesto } from "./CestoProvider";

/**
 * # O cesto: um botão no canto e um cartão no centro
 *
 * ## ⚠️ Era uma barra no fundo do ecrã, e deixou de ser
 *
 * Até outubro de 2026 o cesto era uma barra a toda a largura, colada ao fundo.
 * Tinha duas razões — o polegar chega ao fundo e não ao canto de cima, e uma
 * página longa precisava de um sinal de que se tinha juntado alguma coisa — e
 * as duas continuam a valer: o botão está em baixo, à mão do polegar, e aparece
 * logo que há alguma coisa no cesto.
 *
 * Saiu por um defeito que só se via com as duas peças juntas: o botão flutuante
 * «Encomendas» e a barra viviam os dois no fundo, e na ementa, com o cesto
 * cheio, o botão ficava por baixo da barra. Agora **os dois ocupam o mesmo sítio
 * e trocam-se**: com o cesto vazio, «Encomendas» (ver `BotaoEncomendar`); com
 * alguma coisa dentro, o carrinho — em todas as páginas. Nunca os dois.
 *
 * ## O cartão
 *
 * Abre centrado, por cima de tudo, com o que se escolheu: quantidades, tirar,
 * esvaziar e a estimativa. É um `<dialog>` com `showModal()`: o `Esc`, o foco
 * preso lá dentro e o fundo inerte vêm do browser, e não de código nosso.
 * «Continuar» leva ao pedido.
 *
 * ## A estimativa nunca se chama total
 *
 * Ver `cesto.ts`. Com artigos sem preço de tabela, o número passa a **a partir
 * de** — somar zero a um bolo por medida era anunciar que ele é grátis.
 */
export function Cesto({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.cesto");
  const contexto = useCesto();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDialogElement>(null);

  const vazio = !contexto?.pronto || contexto.cesto.length === 0;
  /* Esvaziar o cesto com o cartão aberto fecha-o: um cartão vazio no centro do
     ecrã é um beco, e o botão que o abriu já desapareceu. */
  const mostrar = aberto && !vazio;

  useEffect(() => {
    const dialogo = caixa.current;
    if (!dialogo) return;
    if (mostrar && !dialogo.open) dialogo.showModal();
    if (!mostrar && dialogo.open) dialogo.close();
  }, [mostrar]);

  /* ⚠️ **A página de trás não rola enquanto o cartão está aberto.** O fundo do
     `<dialog>` é inerte para cliques, mas não para o dedo: no telemóvel, quem
     arrastava o cartão rolava a ementa por baixo dele. */
  useEffect(() => {
    if (!mostrar) return;
    const raiz = document.documentElement;
    const antes = raiz.style.overflow;
    raiz.style.overflow = "hidden";
    return () => {
      raiz.style.overflow = antes;
    };
  }, [mostrar]);

  if (!contexto || vazio) return null;

  const { cesto, mudarQuantidade, remover, esvaziar } = contexto;
  const { somaCent, semPreco } = estimativa(cesto);
  const artigos = totalArtigos(cesto);
  const valor = formatarCent(somaCent, locale);

  return (
    <>
      {/* ⚠️ **O calço não é enfeite**, e vem da barra que isto substituiu. O
          botão é `fixed`: no fim da página fica por cima do que lá estiver, e a
          barra chegou a tapar a caixa do consentimento, sem a qual o pedido não
          segue. Este `<div>` está no fluxo e devolve à página a altura que o
          botão lhe tira. */}
      <div aria-hidden className="h-20" />

      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-label={`${t("verPedido")} · ${t("unidades", { n: artigos })} · ${
          semPreco > 0 ? t("aPartirDe") : t("estimativa")
        } ${valor}`}
        /* O mesmo sítio, a mesma altura (48 px) e a mesma cor do «Encomendas»:
           é o mesmo botão a mudar de função, e um círculo maior do que ele
           lia-se como outra coisa. Só o ícone: o valor esteve aqui ao lado e
           competia com o carrinho — a estimativa está no cartão, e no nome do
           botão para quem usa leitor de ecrã. */
        data-flutuante="cesto"
        className="premivel fixed bottom-5 right-5 z-50 grid size-12 place-items-center rounded-full bg-tijolo text-papel shadow-lg shadow-tinta/25 print:hidden"
      >
        <IconeCesto />
        {/* A contagem fica no canto, **fora** do desenho do cesto: pequena, para
            não lhe tapar a forma, e a sair da borda do botão, que é onde o olho
            procura um número destes. */}
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid min-w-[1.375rem] place-items-center rounded-full border-2 border-tijolo bg-papel px-1 text-[0.68rem] font-bold leading-[1.125rem] tabular-nums text-tijolo"
        >
          {artigos}
        </span>
      </button>

      <dialog
        ref={caixa}
        onClose={() => setAberto(false)}
        /* Um toque fora fecha: o `::backdrop` não recebe eventos, mas um clique
           nele tem como alvo o próprio `<dialog>`, e o conteúdo vive num filho. */
        onClick={(evento) => {
          if (evento.target === caixa.current) setAberto(false);
        }}
        aria-labelledby="titulo-cesto"
        className="cartao-cesto bg-papel text-tinta"
      >
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-tinta/15 p-5 pb-4">
            <div>
              <h2 id="titulo-cesto" className="titulo-display titulo-gama">
                {t("titulo")}
              </h2>
              <p className="mt-1 text-sm text-tinta-suave">{t("unidades", { n: artigos })}</p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label={t("fechar")}
              className="premivel grid size-11 shrink-0 place-items-center rounded-full border border-tinta/20 hover:bg-tinta hover:text-papel"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <ul className="flex-1 divide-y divide-tinta/12 overflow-y-auto px-5">
            {cesto.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.nome}</p>
                  {item.variante && <p className="text-sm text-tinta-suave">{item.variante}</p>}
                  <p className="mt-1 text-sm tabular-nums text-tijolo">
                    {item.precoCent === null
                      ? t("semPreco")
                      : formatarCent(totalDaLinha(item.precoCent, item.quantidade), locale)}
                  </p>
                </div>

                {/* Três alvos de 44 px em vez de um campo numérico: mexer numa
                    quantidade com o polegar é carregar em «mais» e «menos», e
                    não abrir o teclado numérico para escrever «2». */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("menos")}
                    onClick={() => mudarQuantidade(item.id, -1)}
                    className="premivel size-11 rounded-full border border-tinta/25 text-lg leading-none"
                  >
                    −
                  </button>
                  {/* ⚠️ **A largura é mínima e não fixa.** Com `w-6` cabia «2»
                      mas não «1,5 kg», e o texto saltava para cima do botão do
                      «mais» — só nos bolos, que são justamente os artigos onde o
                      número é o que interessa. */}
                  <span className="min-w-8 whitespace-nowrap px-1 text-center text-sm tabular-nums">
                    {quantidadeEmTexto(item, locale)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("mais")}
                    onClick={() => mudarQuantidade(item.id, 1)}
                    className="premivel size-11 rounded-full border border-tinta/25 text-lg leading-none"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={t("remover", { nome: item.nome })}
                    onClick={() => remover(item.id)}
                    className="premivel size-11 rounded-full text-tinta-suave hover:text-tijolo"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-tinta/15 p-5 pt-4">
            <p className="flex items-baseline justify-between gap-4 font-semibold">
              <span>{semPreco > 0 ? t("aPartirDe") : t("estimativa")}</span>
              <span className="titulo-display text-2xl tabular-nums text-tijolo">{valor}</span>
            </p>
            <p className="mt-2 text-sm text-tinta-suave">
              {semPreco > 0 ? t("avisoOrcamento") : t("avisoEstimativa")}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={esvaziar}
                className="alvo-toque text-xs font-semibold uppercase tracking-widest text-tinta-suave underline underline-offset-4"
              >
                {t("esvaziar")}
              </button>
              {/* Por agora leva ao formulário das encomendas; com a página de
                  compra (#37) passa a levar a ela. */}
              <Link
                href="/encomendas#pedido"
                onClick={() => setAberto(false)}
                className="premivel flex min-h-12 flex-1 items-center justify-center rounded-full bg-tijolo px-6 text-sm font-semibold uppercase tracking-widest text-papel sm:flex-none"
              >
                {t("irParaPedido")}
              </Link>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

/* Um cesto de compras, desenhado a traço para viver ao lado do texto do botão
   sem pesar mais do que ele. */
function IconeCesto() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 9h14l-1.4 9.1a2 2 0 0 1-2 1.7H8.4a2 2 0 0 1-2-1.7L5 9Z" strokeLinejoin="round" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}
