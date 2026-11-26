"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { formatarCent } from "@/lib/preco";
import { NADA_ESCOLHIDO, REGRA_SIMPLES, idComNotas, idComPersonalizacao, quantidadeEmTexto, type Escolhido } from "@/lib/cesto";
import type { DadosPersonalizacao } from "@/lib/vista";
import type { TipoPedido } from "@/lib/pedidos";
import type { Locale } from "@/i18n/routing";
import { useCesto } from "./CestoProvider";
import { acrescimoCent, completo, LevaDoGrupo, Personalizar, soDoGrupo, textoDe } from "./Personalizar";

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
/**
 * Um tamanho de um simples ou um grupo de um composto (#88): os dois são a
 * `variante`. O `rotulo` já vem nesta língua; num kit de festa sem rótulo,
 * escreve-se pelo número de pessoas.
 */
export type OpcaoVariante = { id: string; rotulo: string | null; pessoas: number | null; precoCent: number | null };

export function ComprarProduto({
  id,
  produtoId,
  tipo,
  nome,
  precoCent,
  variantes,
  locale,
  comMensagem,
  regra = REGRA_SIMPLES,
  notaDaRegra,
  personalizavel,
  composto,
}: {
  /** A base do `id` da linha do cesto: `festa-premium`, `ementa:nata`. */
  id: string;
  /** O produto no catálogo de `@/lib/dados`. É o que o servidor vai cotar. */
  produtoId: string;
  tipo: TipoPedido;
  nome: string;
  /** Em cêntimos. `null` é **sob orçamento** e não zero. Ver `cesto.ts`. */
  precoCent: number | null;
  /** Os tamanhos ou os grupos disponíveis. Com um só, não se pergunta. */
  variantes: OpcaoVariante[];
  locale: Locale;
  /**
   * Se faz sentido escrever uma mensagem por cima. Num bolo faz; numa box de
   * pequeno-almoço não, e um campo a mais é gente que hesita sem razão.
   */
  comMensagem: boolean;
  /**
   * A unidade, o mínimo e o passo. Por defeito, «uma unidade de cada vez» — que
   * é o que um kit ou uma box são.
   *
   * ⚠️ **Os artigos da carta trazem regra própria**: uma dúzia de natas de 6 em
   * 6, um bolo ao quilo de meio em meio. Ver `encomendavel.ts`.
   */
  regra?: { unidade: "un" | "kg"; minimo: number; passo: number };
  /** A frase do mínimo, quando há um que não seja «uma unidade». */
  notaDaRegra?: string;
  /**
   * As variâncias, opções e extras (#88). Com variâncias, **escolher é
   * obrigatório** antes de juntar, e vai na linha — nunca nas observações.
   */
  personalizavel: DadosPersonalizacao;
  composto: boolean;
}) {
  const t = useTranslations("produto");
  const contexto = useCesto();
  const campo = useId();

  const [indice, setIndice] = useState(0);
  const [escolhido, setEscolhido_] = useState<Escolhido>(NADA_ESCOLHIDO);
  const [falta, setFalta] = useState(false);
  const tp = useTranslations("personalizar");
  const [mensagem, setMensagem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  /* O que se mostra depois de juntar. ⚠️ Um botão que não muda deixa a pessoa
     sem saber se acertou, e a reacção a isso é carregar outra vez — o que num
     pedido quer dizer dois bolos. */
  const [juntado, setJuntado] = useState(false);

  if (!contexto) return null;

  const variante = variantes[indice] ?? null;
  const varianteId = variante?.id ?? "unica";
  const rotuloDe = (v: OpcaoVariante) => v.rotulo ?? (v.pessoas !== null ? t("paraPessoas", { n: v.pessoas }) : v.id);
  const base = variante ? variante.precoCent : precoCent;
  /* Só para mostrar: quem cobra é o servidor (`cotarLinhas`). */
  const precoFinal = base === null ? null : base + acrescimoCent(personalizavel, composto, escolhido);
  const mudarEscolhido = (valor: Escolhido) => {
    setEscolhido_(valor);
    setFalta(false);
    setJuntado(false);
  };

  const notas =
    [
      mensagem.trim() ? `${t("mensagem")}: ${mensagem.trim()}` : "",
      observacoes.trim() ? `${t("observacoes")}: ${observacoes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n") || null;

  const juntar = () => {
    const doGrupo = soDoGrupo(personalizavel, varianteId, composto, escolhido, locale);
    if (!completo(personalizavel, varianteId, composto, doGrupo, locale)) {
      setFalta(true);
      return;
    }
    contexto.juntar({
      ...regra,
      /* ⚠️ As notas e a personalização entram no `id`: dois bolos com mensagens
         diferentes, ou 6 com fiambre e 6 sem, são duas linhas do pedido, e não
         uma com quantidade dois. Ver `idComNotas`. */
      /* Com um tamanho só, o id de sempre (`box-x`): um cesto de antes continua a
         somar na mesma linha. */
      id: idComNotas(idComPersonalizacao(variantes.length > 1 && variante ? `${id}:${variante.id}` : id, doGrupo), notas),
      produtoId,
      varianteId,
      tipo,
      nome,
      variante: variante ? rotuloDe(variante) : null,
      precoCent: precoFinal,
      pessoas: variante?.pessoas ?? null,
      notas,
      escolha: textoDe(personalizavel, varianteId, composto, doGrupo, locale, (n) => tp("sem", { nome: n })),
      personalizacao: doGrupo,
    });
    setJuntado(true);
  };

  return (
    <div className="mt-10 rounded-2xl border border-tinta/15 bg-papel-fundo p-6">
      {variantes.length > 1 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {variantes.every((v) => v.pessoas !== null) ? t("paraQuantas") : t("escolher")}
          </legend>
          {/* ⚠️ **Os tamanhos à vista e não num menu.** O que a pessoa está a
              comparar é justamente o preço de cada um; escondê-los atrás de um
              seletor obriga a abrir três vezes para ver o que cabe numa linha. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {variantes.map((v, n) => (
              <label
                key={v.id}
                className={`premivel alvo-toque flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tijolo ${
                  n === indice
                    ? "border-tijolo bg-tijolo text-papel"
                    : "border-tinta/25 hover:bg-tinta hover:text-papel"
                }`}
              >
                <input
                  type="radio"
                  name={`${campo}-variante`}
                  checked={n === indice}
                  onChange={() => {
                    setIndice(n);
                    setFalta(false);
                    setJuntado(false);
                  }}
                  className="sr-only"
                />
                <span className="tabular-nums">{rotuloDe(v)}</span>
                {v.precoCent !== null && <span className="tabular-nums opacity-80">{formatarCent(v.precoCent, locale)}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {composto && <LevaDoGrupo dados={personalizavel} varianteId={varianteId} locale={locale} />}

      <div className={variantes.length > 1 || composto ? "mt-6" : ""}>
        <Personalizar
          dados={personalizavel}
          varianteId={varianteId}
          composto={composto}
          valor={escolhido}
          onMudar={mudarEscolhido}
          locale={locale}
          falta={falta}
        />
      </div>

      <div className="mt-6 grid gap-4">
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

      {/* ⚠️ **O mínimo aparece ao lado do botão e não em letra pequena no topo.**
          É aqui que a pessoa decide juntar, e é aqui que precisa de saber que o
          que vai juntar é uma dúzia e não um pastel. */}
      {notaDaRegra && (
        <p className="mt-5 text-sm font-semibold">{notaDaRegra}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="titulo-display text-3xl tabular-nums text-tijolo">
          {precoFinal === null ? (
            <span className="text-base normal-case">{t("sobOrcamento")}</span>
          ) : (
            <>
              {formatarCent(precoFinal, locale)}
              {regra.unidade === "kg" && (
                <span className="ml-1 text-base font-normal text-tinta-suave">
                  {t("porQuilo")}
                </span>
              )}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={juntar}
          className="premivel alvo-toque inline-flex min-h-12 items-center gap-2 rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {juntado ? t("juntado") : t("juntar")}
          {/* Depois de juntar, quanto é que ficou lá: «12×», «1 kg». Um botão
              que só muda de texto não diz se a quantidade é a que se esperava. */}
          {juntado && (
            <span className="rounded-full bg-papel/25 px-2 py-0.5 tabular-nums">
              {quantidadeEmTexto(
                { quantidade: regra.minimo, unidade: regra.unidade } as never,
                locale,
              )}
            </span>
          )}
        </button>
      </div>

      {/* ⚠️ **A estimativa continua a não ser uma conta a pagar.** É o mesmo
          aviso do cesto, repetido onde alguém vê um preço grande ao lado de um
          botão — que é onde ele mais se parece com um checkout. */}
      <p className="mt-4 text-sm text-tinta-suave">{t("avisoPreco")}</p>
    </div>
  );
}
