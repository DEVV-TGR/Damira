"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Escolhido } from "@/lib/cesto";
import { formatarCent } from "@/lib/preco";
import { emLingua, type DadosPersonalizacao } from "@/lib/vista";
import type { Variancia } from "@/lib/dados/tipos";

/**
 * # Personalizar, do lado do cliente (#88, `pedidos.md` › Personalização)
 *
 * As variâncias pedem uma escolha cada; as opções tiram; os extras põem a mais,
 * até ao máximo da gerente. Num composto, só as variâncias dos simples lá dentro
 * — as opções e os extras deles não: um kit de 40 salgados não pede 40 caixas
 * «sem queijo».
 *
 * ⚠️ **O preço daqui é para mostrar.** O browser manda os ids, e o servidor
 * confere e cobra (`cotarLinhas`): uma escolha inventada é recusada lá, e um
 * preço mudado aqui não muda nada.
 */

type Pergunta = { produtoId: string | null; titulo: string; variancia: Variancia };

export function perguntas(dados: DadosPersonalizacao, varianteId: string, composto: boolean, locale: Locale): Pergunta[] {
  if (!composto) {
    return dados.variancias.map((variancia) => ({ produtoId: null, titulo: emLingua(variancia.nome, locale), variancia }));
  }
  return (dados.dentro[varianteId] ?? []).flatMap((l) =>
    l.variancias.map((variancia) => ({
      produtoId: l.produtoId,
      titulo: `${emLingua(l.nome, locale)} — ${emLingua(variancia.nome, locale)}`,
      variancia,
    })),
  );
}

const resposta = (valor: Escolhido, p: Pergunta) =>
  valor.variancias.find((v) => v.produtoId === p.produtoId && v.varianciaId === p.variancia.id);

/** Respondidas todas as perguntas: é o que deixa juntar. */
export const completo = (dados: DadosPersonalizacao, varianteId: string, composto: boolean, valor: Escolhido, locale: Locale) =>
  perguntas(dados, varianteId, composto, locale).every((p) => resposta(valor, p));

/** Só o que pertence a este grupo: trocar de grupo num kit esquece as respostas do outro. */
export const soDoGrupo = (dados: DadosPersonalizacao, varianteId: string, composto: boolean, valor: Escolhido, locale: Locale): Escolhido => {
  const validas = perguntas(dados, varianteId, composto, locale);
  return {
    variancias: valor.variancias.filter((v) => validas.some((p) => p.produtoId === v.produtoId && p.variancia.id === v.varianciaId)),
    opcoes: composto ? [] : valor.opcoes,
    extras: composto ? [] : valor.extras,
  };
};

/** O que soma ao preço de uma unidade. Num composto, nada: o preço é o do grupo. */
export function acrescimoCent(dados: DadosPersonalizacao, composto: boolean, valor: Escolhido): number {
  if (composto) return 0;
  const das = valor.variancias.reduce((soma, v) => {
    const escolha = dados.variancias.find((x) => x.id === v.varianciaId)?.escolhas.find((e) => e.id === v.escolhaId);
    return soma + (escolha?.acrescimoCent ?? 0);
  }, 0);
  const dosExtras = valor.extras.reduce((soma, x) => soma + (dados.extras.find((e) => e.id === x.id)?.precoCent ?? 0) * x.quantidade, 0);
  return das + dosExtras;
}

/**
 * O que se escolheu, em texto, para o cesto e o resumo: o mesmo desenho do que o
 * servidor escreve no pedido («Salsicha: Americana», «SEM fiambre»).
 */
export function textoDe(dados: DadosPersonalizacao, varianteId: string, composto: boolean, valor: Escolhido, locale: Locale, sem: (n: string) => string): string | null {
  const partes: string[] = [];
  for (const p of perguntas(dados, varianteId, composto, locale)) {
    const r = resposta(valor, p);
    const escolha = r && p.variancia.escolhas.find((e) => e.id === r.escolhaId);
    if (escolha) partes.push(`${p.titulo}: ${emLingua(escolha.nome, locale)}`);
  }
  for (const id of valor.opcoes) {
    const o = dados.opcoes.find((x) => x.id === id);
    if (o) partes.push(sem(emLingua(o.nome, locale)));
  }
  for (const x of valor.extras) {
    const e = dados.extras.find((y) => y.id === x.id);
    if (e) partes.push(`+ ${x.quantidade} × ${emLingua(e.nome, locale)}`);
  }
  return partes.join(" · ") || null;
}

const pilula = (ativa: boolean) =>
  `premivel alvo-toque flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tijolo ${
    ativa ? "border-tijolo bg-tijolo text-papel" : "border-tinta/25 hover:bg-tinta hover:text-papel"
  }`;
const legenda = "text-xs font-semibold uppercase tracking-widest text-tinta-suave";

export function Personalizar({
  dados,
  varianteId,
  composto,
  valor,
  onMudar,
  locale,
  falta,
}: {
  dados: DadosPersonalizacao;
  varianteId: string;
  composto: boolean;
  valor: Escolhido;
  onMudar: (valor: Escolhido) => void;
  locale: Locale;
  /** Tentou juntar sem responder a tudo: as perguntas por responder dizem-no. */
  falta: boolean;
}) {
  const t = useTranslations("personalizar");
  const id = useId();
  const lista = perguntas(dados, varianteId, composto, locale);
  const mais = (cent: number) => (cent === 0 ? null : `+${formatarCent(cent, locale)}`);

  return (
    <div className="grid gap-6">
      {lista.map((p, n) => {
        const r = resposta(valor, p);
        return (
          <fieldset key={`${p.produtoId ?? ""}-${p.variancia.id}`}>
            <legend className={legenda}>{p.titulo}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.variancia.escolhas.map((e) => (
                <label key={e.id} className={pilula(r?.escolhaId === e.id)}>
                  <input
                    type="radio"
                    name={`${id}-v${n}`}
                    checked={r?.escolhaId === e.id}
                    onChange={() =>
                      onMudar({
                        ...valor,
                        variancias: [
                          ...valor.variancias.filter((v) => !(v.produtoId === p.produtoId && v.varianciaId === p.variancia.id)),
                          { produtoId: p.produtoId, varianciaId: p.variancia.id, escolhaId: e.id },
                        ],
                      })
                    }
                    className="sr-only"
                  />
                  {emLingua(e.nome, locale)}
                  {!composto && mais(e.acrescimoCent) && <span className="tabular-nums opacity-80">{mais(e.acrescimoCent)}</span>}
                </label>
              ))}
            </div>
            {falta && !r && (
              <p role="alert" className="mt-2 text-sm font-semibold text-tijolo">
                {t("falta")}
              </p>
            )}
          </fieldset>
        );
      })}

      {!composto && dados.opcoes.length > 0 && (
        <fieldset>
          <legend className={legenda}>{t("tirar")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {dados.opcoes.map((o) => {
              const marcada = valor.opcoes.includes(o.id);
              return (
                <label key={o.id} className={pilula(marcada)}>
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      onMudar({ ...valor, opcoes: marcada ? valor.opcoes.filter((x) => x !== o.id) : [...valor.opcoes, o.id] })
                    }
                    className="sr-only"
                  />
                  {t("sem", { nome: emLingua(o.nome, locale) })}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {!composto && dados.extras.length > 0 && (
        <fieldset>
          <legend className={legenda}>{t("extras")}</legend>
          <p className="mt-1 text-sm text-tinta-suave">{t("porUnidade")}</p>
          <ul className="mt-3 grid gap-2">
            {dados.extras.map((e) => {
              const quantos = valor.extras.find((x) => x.id === e.id)?.quantidade ?? 0;
              const por = (n: number) =>
                onMudar({
                  ...valor,
                  extras: [...valor.extras.filter((x) => x.id !== e.id), ...(n > 0 ? [{ id: e.id, quantidade: n }] : [])],
                });
              const nome = emLingua(e.nome, locale);
              const botao =
                "premivel alvo-toque grid size-11 place-items-center rounded-full border border-tinta/25 text-lg disabled:opacity-30";
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    {nome}
                    <span className="block text-sm tabular-nums text-tinta-suave">
                      {e.precoCent === 0 ? t("semCusto") : t("cada", { preco: formatarCent(e.precoCent, locale) })} · {t("ate", { n: e.maximo })}
                    </span>
                  </span>
                  <button type="button" aria-label={t("menos", { nome })} disabled={quantos === 0} onClick={() => por(quantos - 1)} className={botao}>
                    −
                  </button>
                  <span aria-live="polite" className="w-6 text-center tabular-nums">
                    {quantos}
                  </span>
                  <button
                    type="button"
                    aria-label={t("mais", { nome })}
                    disabled={quantos >= e.maximo}
                    onClick={() => por(quantos + 1)}
                    className={botao}
                  >
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </div>
  );
}

/** O que o grupo leva, por baixo da escolha do grupo. */
export function LevaDoGrupo({ dados, varianteId, locale }: { dados: DadosPersonalizacao; varianteId: string; locale: Locale }) {
  const t = useTranslations("personalizar");
  const leva = dados.dentro[varianteId] ?? [];
  if (leva.length === 0) return null;
  const numero = new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", { maximumFractionDigits: 2 });
  return (
    <div className="mt-4">
      <p className={legenda}>{t("leva")}</p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {leva.map((l) => (
          <li key={l.produtoId}>
            {l.quantidade === null ? "" : `${numero.format(l.quantidade)} × `}
            {emLingua(l.nome, locale)}
          </li>
        ))}
      </ul>
    </div>
  );
}
