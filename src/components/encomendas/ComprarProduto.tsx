"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { formatarPreco } from "@/lib/preco";
import { REGRA_SIMPLES, idComNotas } from "@/lib/cesto";
import type { TipoPedido } from "@/lib/pedidos";
import type { Locale } from "@/i18n/routing";
import { useCesto } from "./CestoProvider";

/**
 * Escolher, personalizar e juntar ao pedido — o fim de uma página de produto.
 *
 * ## ⚠️ Recebe dados simples e não o `Produto`
 *
 * O `Produto` tem funções lá dentro (`nome(locale)`), e funções não atravessam a
 * fronteira entre o servidor e o cliente. Passa-se o que já está resolvido: o
 * nome nesta língua, o preço, os escalões. Passar o objecto inteiro rebentava no
 * `build` com um erro sobre serialização que não diz onde está o problema.
 */
export type EscalaoSimples = { pessoas: number; preco: number };

export function ComprarProduto({
  id,
  tipo,
  nome,
  preco,
  escaloes,
  locale,
  comMensagem,
}: {
  id: string;
  tipo: TipoPedido;
  nome: string;
  /** `null` é **sob orçamento** e não zero. Ver `cesto.ts`. */
  preco: number | null;
  /** Só os kits de festa os têm. Vazio nos outros. */
  escaloes: EscalaoSimples[];
  locale: Locale;
  /**
   * Se faz sentido escrever uma mensagem por cima. Num bolo faz; numa box de
   * pequeno-almoço não, e um campo a mais é gente que hesita sem razão.
   */
  comMensagem: boolean;
}) {
  const t = useTranslations("produto");
  const contexto = useCesto();
  const campo = useId();

  const [escolhido, setEscolhido] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  /* O que se mostra depois de juntar. ⚠️ Um botão que não muda deixa a pessoa
     sem saber se acertou, e a reacção a isso é carregar outra vez — o que num
     pedido quer dizer dois bolos. */
  const [juntado, setJuntado] = useState(false);

  if (!contexto) return null;

  const escalao = escaloes[escolhido] ?? null;
  const precoFinal = escalao ? escalao.preco : preco;

  const notas =
    [
      mensagem.trim() ? `${t("mensagem")}: ${mensagem.trim()}` : "",
      observacoes.trim() ? `${t("observacoes")}: ${observacoes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n") || null;

  const juntar = () => {
    contexto.juntar({
      ...REGRA_SIMPLES,
      /* ⚠️ As notas entram no `id`: dois bolos com mensagens diferentes são duas
         linhas do pedido, e não um com quantidade dois. Ver `idComNotas`. */
      id: idComNotas(escalao ? `${id}:${escalao.pessoas}` : id, notas),
      tipo,
      nome,
      variante: escalao ? t("paraPessoas", { n: escalao.pessoas }) : null,
      preco: precoFinal,
      pessoas: escalao?.pessoas ?? null,
      notas,
    });
    setJuntado(true);
  };

  return (
    <div className="mt-10 rounded-2xl border border-tinta/15 bg-papel-fundo p-6">
      {escaloes.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("paraQuantas")}
          </legend>
          {/* ⚠️ **Os três escalões à vista e não num menu.** O que a pessoa está
              a comparar é justamente o preço dos três; escondê-los atrás de um
              seletor obriga a abrir três vezes para ver o que cabe numa linha. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {escaloes.map((e, n) => (
              <label
                key={e.pessoas}
                className={`premivel alvo-toque flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm ${
                  n === escolhido
                    ? "border-tijolo bg-tijolo text-papel"
                    : "border-tinta/25 hover:bg-tinta hover:text-papel"
                }`}
              >
                <input
                  type="radio"
                  name={`${campo}-escalao`}
                  checked={n === escolhido}
                  onChange={() => {
                    setEscolhido(n);
                    setJuntado(false);
                  }}
                  className="sr-only"
                />
                <span className="tabular-nums">
                  {t("paraPessoas", { n: e.pessoas })}
                </span>
                <span className="tabular-nums opacity-80">
                  {formatarPreco(e.preco, locale)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={escaloes.length > 0 ? "mt-6 grid gap-4" : "grid gap-4"}>
        {comMensagem && (
          <div>
            <label
              htmlFor={`${campo}-mensagem`}
              className="text-xs font-semibold uppercase tracking-widest text-tinta-suave"
            >
              {t("mensagem")}
            </label>
            <input
              id={`${campo}-mensagem`}
              value={mensagem}
              maxLength={80}
              onChange={(e) => {
                setMensagem(e.target.value);
                setJuntado(false);
              }}
              placeholder={t("mensagemDica")}
              className="mt-2 w-full rounded-xl border border-tinta/25 bg-papel px-4 py-3 placeholder:text-tinta-suave/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
            />
          </div>
        )}

        <div>
          <label
            htmlFor={`${campo}-observacoes`}
            className="text-xs font-semibold uppercase tracking-widest text-tinta-suave"
          >
            {t("observacoes")}
          </label>
          <textarea
            id={`${campo}-observacoes`}
            value={observacoes}
            rows={3}
            maxLength={250}
            onChange={(e) => {
              setObservacoes(e.target.value);
              setJuntado(false);
            }}
            placeholder={t("observacoesDica")}
            className="mt-2 w-full rounded-xl border border-tinta/25 bg-papel px-4 py-3 placeholder:text-tinta-suave/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="titulo-display text-3xl tabular-nums text-tijolo">
          {precoFinal === null ? (
            <span className="text-base normal-case">{t("sobOrcamento")}</span>
          ) : (
            formatarPreco(precoFinal, locale)
          )}
        </p>
        <button
          type="button"
          onClick={juntar}
          className="premivel alvo-toque inline-flex min-h-12 items-center rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {juntado ? t("juntado") : t("juntar")}
        </button>
      </div>

      {/* ⚠️ **A estimativa continua a não ser uma conta a pagar.** É o mesmo
          aviso do cesto, repetido onde alguém vê um preço grande ao lado de um
          botão — que é onde ele mais se parece com um checkout. */}
      <p className="mt-4 text-sm text-tinta-suave">{t("avisoPreco")}</p>
    </div>
  );
}
