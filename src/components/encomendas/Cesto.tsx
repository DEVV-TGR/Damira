"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { estimativa, totalUnidades } from "@/lib/cesto";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";
import { useCesto } from "./CestoProvider";

/**
 * A barra do cesto: **o que já escolheu, sempre à vista**.
 *
 * ## Porque é uma barra em baixo e não um ícone no cabeçalho
 *
 * Porque a maior parte das visitas é de telemóvel, e no telemóvel o canto
 * superior direito é o sítio mais longe do polegar que há no ecrã. Um carrinho
 * que se toca com o dedo sem mudar a pega vale mais do que um que segue a
 * convenção das lojas grandes.
 *
 * E porque esta página é longa: os kits, os bolos, o configurador e as boxes são
 * cinco ecrãs de rolagem. Sem a barra, quem juntou um kit no primeiro ecrã não
 * tem sinal nenhum de que o fez até chegar ao fim.
 *
 * ## ⚠️ Só aparece com alguma coisa dentro
 *
 * Uma barra permanentemente a dizer «0 artigos, 0,00 €» ocupa o fundo do ecrã
 * de toda a gente para não informar ninguém. Aparece quando há o que mostrar, e
 * some quando se esvazia.
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

  if (!contexto || !contexto.pronto || contexto.cesto.length === 0) return null;

  const { cesto, mudarQuantidade, remover, esvaziar } = contexto;
  const { soma, semPreco } = estimativa(cesto);
  const unidades = totalUnidades(cesto);

  return (
    <>
      {/* ⚠️ **O calço não é enfeite.** A barra é `fixed`, portanto sai do fluxo
          e fica por cima do que estiver no fundo da página — na verificação
          tapava a caixa do consentimento, que é o campo sem o qual o pedido não
          segue. Este `<div>` está no fluxo, no fim da página, e devolve à
          página a altura que a barra lhe tirou. */}
      <div aria-hidden className="h-16" />

      <div className="fixed inset-x-0 bottom-0 z-50 print:hidden">
      {aberto && (
        <div className="mx-auto max-w-[42rem] px-3">
          <div className="max-h-[60svh] overflow-y-auto rounded-t-2xl border-2 border-b-0 border-tinta bg-papel p-4 shadow-lg shadow-tinta/25">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="titulo-display titulo-gama">{t("titulo")}</h2>
              <button
                type="button"
                onClick={esvaziar}
                className="alvo-toque text-xs font-semibold uppercase tracking-widest text-tinta-suave underline underline-offset-4"
              >
                {t("esvaziar")}
              </button>
            </div>

            <ul className="mt-4 divide-y divide-tinta/12">
              {cesto.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.nome}</p>
                    {item.variante && (
                      <p className="text-sm text-tinta-suave">{item.variante}</p>
                    )}
                    <p className="mt-1 text-sm tabular-nums text-tijolo">
                      {item.preco === null
                        ? t("semPreco")
                        : formatarPreco(item.preco * item.quantidade, locale)}
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
                    <span className="w-6 text-center tabular-nums">
                      {item.quantidade}
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

            <p className="mt-4 text-sm text-tinta-suave">
              {semPreco > 0 ? t("avisoOrcamento") : t("avisoEstimativa")}
            </p>

            <a
              href="#pedido"
              onClick={() => setAberto(false)}
              className="premivel mt-4 flex min-h-12 items-center justify-center rounded-full bg-tijolo px-6 text-sm font-semibold uppercase tracking-widest text-papel"
            >
              {t("irParaPedido")}
            </a>
          </div>
        </div>
      )}

      <div className="border-t-2 border-tinta bg-tinta text-papel">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="envolvente flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left"
        >
          <span className="flex min-w-0 items-baseline gap-3">
            <span className="shrink-0 rounded-full bg-tijolo px-2.5 py-0.5 text-sm font-bold tabular-nums">
              {unidades}
            </span>
            <span className="truncate text-sm">
              {semPreco > 0 ? t("aPartirDe") : t("estimativa")}{" "}
              <strong className="tabular-nums">
                {formatarPreco(soma, locale)}
              </strong>
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-widest">
            {aberto ? t("fechar") : t("verPedido")}
          </span>
        </button>
      </div>
      </div>
    </>
  );
}
