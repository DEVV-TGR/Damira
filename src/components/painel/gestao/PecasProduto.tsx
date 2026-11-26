"use client";

import { useState } from "react";
import type { EntradaProduto, Produto } from "@/lib/dados/tipos";
import { paraCent } from "@/lib/painel";
import { Ajuda, Rotulo } from "../Ajuda";
import { BOTAO_SECUNDARIO } from "../balcao/comum";

/**
 * # As peças da #88, como a gerente as monta (`painel-gerente.md` › Simples e compostos)
 *
 * **O catálogo é dela.** Nada aqui decide que variâncias, opções, extras ou
 * grupos fazem sentido: são peças livres, com nome, preço e ordem. O que se
 * valida é o que não é conteúdo — um preço que não é preço, um máximo de zero —,
 * e isso confirma-o o servidor outra vez (`EsquemaEntradaProduto`).
 *
 * ⚠️ **Ligar e copiar não são a mesma coisa.** Uma variância ou um extra
 * *ligado* é o mesmo em todos os produtos que o têm: mudar o preço aqui muda-o
 * lá, e a ficha diz em quantos está. Copiar é criar outro, independente. As
 * opções são de cada produto, e não se ligam.
 *
 * ⚠️ **Livre é livre para errar**: um extra a 40 € em vez de 0,40 € cobra 40 €.
 * Por isso cada preço se repete por extenso ao lado do campo, e a ficha mostra
 * o que o cliente vê (`ComoOClienteVe`).
 *
 * A ordem muda-se com ↑ e ↓, e é a que o cliente vê. Arrastar ficou de fora: no
 * telemóvel arrasta-se a página em vez do item, e as setas chegam lá com o
 * teclado também.
 */

export const campo =
  "mt-1.5 block w-full min-w-0 rounded-xl border border-tinta/20 bg-papel px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo disabled:opacity-50";
export const bloco = "border-t border-tinta/10 pt-5";

export const emEuros = (cent: number | null) => (cent === null ? "" : (cent / 100).toFixed(2).replace(".", ","));
const porExtenso = (cent: number) => `${emEuros(cent)} €`;

// ——— O rascunho ———

/* Os preços ficam em texto enquanto se escreve («0,4» a meio de «0,40»), e só
   passam a cêntimos ao gravar. O inglês, que esta ficha não edita, viaja junto
   para não se perder. */
export type EscolhaForm = { id?: string; nome: string; en: string | null; acrescimo: string; ativa: boolean };
export type VarianciaForm = { id?: string; nome: string; en: string | null; escolhas: EscolhaForm[] };
export type OpcaoForm = { id?: string; nome: string; en: string | null; ativa: boolean };
export type ExtraForm = { id?: string; nome: string; en: string | null; preco: string; maximo: string; ativo: boolean };
export type LevaForm = { produtoId: string; quantidade: string };
export type PecasForm = { variancias: VarianciaForm[]; opcoes: OpcaoForm[]; extras: ExtraForm[] };

type Pecas = Pick<Produto, "variancias" | "opcoes" | "extras">;

const varianciaParaForm = (v: Produto["variancias"][number], comIds: boolean): VarianciaForm => ({
  ...(comIds ? { id: v.id } : {}),
  nome: v.nome.pt,
  en: v.nome.en,
  escolhas: v.escolhas.map((e) => ({
    ...(comIds ? { id: e.id } : {}),
    nome: e.nome.pt,
    en: e.nome.en,
    acrescimo: emEuros(e.acrescimoCent),
    ativa: e.ativa,
  })),
});

const extraParaForm = (e: Produto["extras"][number], comId: boolean): ExtraForm => ({
  ...(comId ? { id: e.id } : {}),
  nome: e.nome.pt,
  en: e.nome.en,
  preco: emEuros(e.precoCent),
  maximo: String(e.maximo),
  ativo: e.ativo,
});

export const pecasParaForm = (e: Pick<EntradaProduto, "variancias" | "opcoes" | "extras">): PecasForm => ({
  variancias: (e.variancias ?? []).map((v) => varianciaParaForm(v as Produto["variancias"][number], true)),
  opcoes: (e.opcoes ?? []).map((o) => ({ id: o.id, nome: o.nome.pt, en: o.nome.en, ativa: o.ativa })),
  extras: (e.extras ?? []).map((x) => extraParaForm(x as Produto["extras"][number], true)),
});

const nome = (pt: string, en: string | null) => ({ pt: pt.trim(), en: en?.trim() || null });
const semId = <T extends { id?: string }>({ id, ...resto }: T) => (id ? { id, ...resto } : resto);

/**
 * O rascunho como o servidor o grava, ou o que corrigir. Uma peça sem nome
 * conta como esquecida a meio, e não sai em silêncio: diz-se qual é.
 */
export function pecasDoForm(
  form: PecasForm,
): { ok: true; pecas: Pick<EntradaProduto, "variancias" | "opcoes" | "extras"> } | { ok: false; texto: string; em: "variancias" | "opcoes" | "extras" } {
  for (const v of form.variancias) {
    if (!v.nome.trim()) return { ok: false, texto: "Há uma variância sem nome.", em: "variancias" };
    if (v.escolhas.length === 0) return { ok: false, texto: `«${v.nome}» não tem escolhas.`, em: "variancias" };
    for (const e of v.escolhas) {
      if (!e.nome.trim()) return { ok: false, texto: `Há uma escolha sem nome em «${v.nome}».`, em: "variancias" };
      if (paraCent(e.acrescimo || "0") === null) {
        return { ok: false, texto: `Confira o preço de «${e.nome}»: em euros, como 0 ou 0,50.`, em: "variancias" };
      }
    }
  }
  for (const o of form.opcoes) {
    if (!o.nome.trim()) return { ok: false, texto: "Há uma opção sem nome.", em: "opcoes" };
  }
  for (const x of form.extras) {
    if (!x.nome.trim()) return { ok: false, texto: "Há um extra sem nome.", em: "extras" };
    if (paraCent(x.preco || "0") === null) {
      return { ok: false, texto: `Confira o preço de «${x.nome}»: em euros, como 0 ou 0,40.`, em: "extras" };
    }
    const maximo = Number(x.maximo);
    if (!Number.isInteger(maximo) || maximo < 1 || maximo > 99) {
      return { ok: false, texto: `O máximo de «${x.nome}» tem de ser um número de 1 a 99.`, em: "extras" };
    }
  }
  return {
    ok: true,
    pecas: {
      variancias: form.variancias.map((v) =>
        semId({
          id: v.id,
          nome: nome(v.nome, v.en),
          escolhas: v.escolhas.map((e) =>
            semId({ id: e.id, nome: nome(e.nome, e.en), acrescimoCent: paraCent(e.acrescimo || "0")!, ativa: e.ativa }),
          ),
        }),
      ),
      opcoes: form.opcoes.map((o) => semId({ id: o.id, nome: nome(o.nome, o.en), ativa: o.ativa })),
      extras: form.extras.map((x) =>
        semId({
          id: x.id,
          nome: nome(x.nome, x.en),
          precoCent: paraCent(x.preco || "0")!,
          maximo: Number(x.maximo),
          ativo: x.ativo,
        }),
      ),
    },
  };
}

// ——— Peças partilhadas ———

/** Os outros produtos que têm esta variância ou este extra ligado. */
export function ligadoEm(catalogo: readonly Produto[], produtoId: string | null, tipo: "variancias" | "extras", id: string | undefined) {
  if (!id) return [];
  return catalogo.filter((p) => p.id !== produtoId && !p.arquivado && p[tipo].some((x) => x.id === id));
}

/**
 * Os compostos que levam este simples. Arquivar não o tira de lá — um kit não
 * muda sozinho —, por isso a ficha avisa antes (`painel-gerente.md`). A mesma
 * conta do `compostosQueLevam` da fronteira, que o browser não importa.
 */
export const kitsQueLevam = (id: string, catalogo: readonly Produto[]) =>
  catalogo.filter((p) => !p.arquivado && p.variantes.some((v) => v.leva.some((l) => l.produtoId === id)));

/* As peças de todo o catálogo, uma vez cada, com o primeiro produto que a tem
   para a gerente se lembrar de onde é. */
function pecasDoCatalogo<T extends { id: string }>(catalogo: readonly Produto[], tipo: "variancias" | "extras", excluir: readonly (string | undefined)[]) {
  const vistas = new Map<string, { peca: T; produto: string }>();
  for (const p of catalogo) {
    if (p.arquivado) continue;
    for (const peca of p[tipo] as unknown as T[]) {
      if (!vistas.has(peca.id) && !excluir.includes(peca.id)) vistas.set(peca.id, { peca, produto: p.nome.pt });
    }
  }
  return [...vistas.values()];
}

// ——— Peças de interface ———

function mover<T>(lista: readonly T[], i: number, passo: -1 | 1): T[] {
  const j = i + passo;
  if (j < 0 || j >= lista.length) return [...lista];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** ↑ ↓ e remover, com o nome da peça no rótulo para o leitor de ecrã. */
function Controlos({
  nome,
  i,
  total,
  onMover,
  onRemover,
  remover = "Remover",
}: {
  nome: string;
  i: number;
  total: number;
  onMover: (passo: -1 | 1) => void;
  onRemover: () => void;
  remover?: string;
}) {
  const seta = "min-h-11 min-w-11 rounded-lg border border-tinta/15 text-sm disabled:opacity-30";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Subir ${nome}`} disabled={i === 0} onClick={() => onMover(-1)} className={seta}>
        ↑
      </button>
      <button type="button" aria-label={`Descer ${nome}`} disabled={i === total - 1} onClick={() => onMover(1)} className={seta}>
        ↓
      </button>
      <button type="button" onClick={onRemover} className="ml-1 min-h-11 px-2 text-sm text-tijolo underline underline-offset-4">
        {remover}
        <span className="sr-only"> {nome}</span>
      </button>
    </div>
  );
}

function Ligado({ ligados, peca }: { ligados: readonly Produto[]; peca: string }) {
  if (ligados.length === 0) return null;
  return (
    <p className="mt-2 rounded-lg bg-tinta/5 px-3 py-2 text-sm">
      <strong>Ligado</strong> a {ligados.length === 1 ? "mais 1 produto" : `mais ${ligados.length} produtos`} (
      {ligados
        .slice(0, 3)
        .map((p) => p.nome.pt)
        .join(", ")}
      {ligados.length > 3 ? "…" : ""}). Mudar {peca} aqui muda-o em todos.
    </p>
  );
}

function Ativa({ ligada, onMudar, rotulo }: { ligada: boolean; onMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={ligada} onChange={(ev) => onMudar(ev.target.checked)} className="size-5 accent-tijolo" />
      {rotulo}
    </label>
  );
}

/** Escolher uma peça de outro produto, e ligá-la ou copiá-la. */
function UsarDeOutro({
  ids,
  opcoes,
  onLigar,
  onCopiar,
  rotulo,
}: {
  ids: string;
  opcoes: { id: string; texto: string }[];
  onLigar: (id: string) => void;
  onCopiar: (id: string) => void;
  rotulo: string;
}) {
  const [escolhida, setEscolhida] = useState("");
  if (opcoes.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl border border-dashed border-tinta/20 p-3">
      <Rotulo
        htmlFor={`${ids}-usar`}
        ajuda={
          <>
            <strong>Ligar:</strong> fica a mesma peça nos dois produtos — mudar o preço num muda no outro. <strong>Copiar:</strong> fica uma
            cópia, independente.
          </>
        }
      >
        {rotulo}
      </Rotulo>
      <div className="flex flex-wrap gap-2">
        <select id={`${ids}-usar`} value={escolhida} onChange={(ev) => setEscolhida(ev.target.value)} className={`${campo} sm:max-w-sm`}>
          <option value="">—</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.texto}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!escolhida}
          onClick={() => {
            onLigar(escolhida);
            setEscolhida("");
          }}
          className={`${BOTAO_SECUNDARIO} mt-1.5`}
        >
          Ligar
        </button>
        <button
          type="button"
          disabled={!escolhida}
          onClick={() => {
            onCopiar(escolhida);
            setEscolhida("");
          }}
          className={`${BOTAO_SECUNDARIO} mt-1.5`}
        >
          Copiar
        </button>
      </div>
    </div>
  );
}

const precoAoLado = (texto: string, prefixo = "+") => {
  const cent = paraCent(texto || "0");
  if (cent === null) return "preço inválido";
  return cent === 0 ? "sem custo" : `${prefixo}${porExtenso(cent)}`;
};

// ——— Variâncias ———

export function ListaVariancias({
  ids,
  valor,
  onMudar,
  catalogo,
  produtoId,
}: {
  ids: string;
  valor: VarianciaForm[];
  onMudar: (v: VarianciaForm[]) => void;
  catalogo: readonly Produto[];
  produtoId: string | null;
}) {
  const mudarUma = (i: number, parcial: Partial<VarianciaForm>) => onMudar(valor.map((v, j) => (j === i ? { ...v, ...parcial } : v)));
  const disponiveis = pecasDoCatalogo<Produto["variancias"][number]>(catalogo, "variancias", valor.map((v) => v.id));
  const daLista = (id: string) => disponiveis.find((d) => d.peca.id === id)!.peca;

  return (
    <div>
      <h4 className="flex items-center gap-1.5 font-semibold">
        Variâncias · {valor.length}
        <Ajuda titulo="Variâncias">
          Trocar uma coisa por outra, sem tirar nem pôr: «Salsicha — alemã / americana», «Sabor», «Cor». O cliente escolhe uma de cada.
          Cada escolha soma 0 € ou mais ao preço.
        </Ajuda>
      </h4>
      <p className="mt-1 text-sm text-tinta-suave">O cliente escolhe uma de cada.</p>
      <ul className="mt-3 space-y-3">
        {valor.map((v, i) => {
          const ligados = ligadoEm(catalogo, produtoId, "variancias", v.id);
          return (
            <li key={v.id ?? `nova-${i}`} className="rounded-xl border border-tinta/10 p-3 sm:p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1 basis-56">
                  <Rotulo htmlFor={`${ids}-va${i}`}>Nome da variância</Rotulo>
                  <input
                    id={`${ids}-va${i}`}
                    value={v.nome}
                    placeholder="ex.: Salsicha"
                    onChange={(ev) => mudarUma(i, { nome: ev.target.value })}
                    className={campo}
                  />
                </div>
                <Controlos
                  nome={v.nome || "variância"}
                  i={i}
                  total={valor.length}
                  onMover={(passo) => onMudar(mover(valor, i, passo))}
                  onRemover={() => onMudar(valor.filter((_, j) => j !== i))}
                  remover={ligados.length > 0 ? "Tirar deste produto" : "Remover"}
                />
              </div>
              <Ligado ligados={ligados} peca="uma escolha" />
              <ul className="mt-3 space-y-2">
                {v.escolhas.map((e, k) => {
                  const mudarEscolha = (parcial: Partial<EscolhaForm>) =>
                    mudarUma(i, { escolhas: v.escolhas.map((x, m) => (m === k ? { ...x, ...parcial } : x)) });
                  return (
                    <li key={e.id ?? `nova-${k}`} className="rounded-lg bg-tinta/[0.03] p-2 sm:p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-end">
                        <div>
                          <Rotulo htmlFor={`${ids}-va${i}-e${k}`}>Escolha</Rotulo>
                          <input
                            id={`${ids}-va${i}-e${k}`}
                            value={e.nome}
                            placeholder="ex.: alemã"
                            onChange={(ev) => mudarEscolha({ nome: ev.target.value })}
                            className={campo}
                          />
                        </div>
                        <div>
                          <Rotulo htmlFor={`${ids}-va${i}-e${k}-preco`}>A mais (€)</Rotulo>
                          <input
                            id={`${ids}-va${i}-e${k}-preco`}
                            inputMode="decimal"
                            value={e.acrescimo}
                            placeholder="0,00"
                            onChange={(ev) => mudarEscolha({ acrescimo: ev.target.value })}
                            className={`${campo} text-right tabular-nums`}
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4">
                        <span className="text-sm tabular-nums text-tinta-suave">{precoAoLado(e.acrescimo)}</span>
                        <Ativa ligada={e.ativa} onMudar={(ativa) => mudarEscolha({ ativa })} rotulo="Disponível" />
                        <div className="ml-auto">
                          <Controlos
                            nome={e.nome || "escolha"}
                            i={k}
                            total={v.escolhas.length}
                            onMover={(passo) => mudarUma(i, { escolhas: mover(v.escolhas, k, passo) })}
                            onRemover={() => mudarUma(i, { escolhas: v.escolhas.filter((_, m) => m !== k) })}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => mudarUma(i, { escolhas: [...v.escolhas, { nome: "", en: null, acrescimo: "", ativa: true }] })}
                className={`${BOTAO_SECUNDARIO} mt-2`}
              >
                + Escolha
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onMudar([...valor, { nome: "", en: null, escolhas: [{ nome: "", en: null, acrescimo: "", ativa: true }] }])}
        className={`${BOTAO_SECUNDARIO} mt-3`}
      >
        + Criar variância
      </button>
      <UsarDeOutro
        ids={`${ids}-va`}
        rotulo="Usar uma variância de outro produto"
        opcoes={disponiveis.map((d) => ({ id: d.peca.id, texto: `${d.peca.nome.pt} — de ${d.produto}` }))}
        onLigar={(id) => onMudar([...valor, varianciaParaForm(daLista(id), true)])}
        onCopiar={(id) => onMudar([...valor, varianciaParaForm(daLista(id), false)])}
      />
    </div>
  );
}

// ——— Opções ———

export function ListaOpcoes({ ids, valor, onMudar }: { ids: string; valor: OpcaoForm[]; onMudar: (v: OpcaoForm[]) => void }) {
  const mudarUma = (i: number, parcial: Partial<OpcaoForm>) => onMudar(valor.map((o, j) => (j === i ? { ...o, ...parcial } : o)));
  return (
    <div>
      <h4 className="flex items-center gap-1.5 font-semibold">
        Opções · {valor.length}
        <Ajuda titulo="Opções">
          O que o cliente pode <strong>tirar</strong>: fiambre, cebola. Escreva só o que se tira — o site e o talão escrevem «SEM» à frente.
          Tirar não desconta no preço.
        </Ajuda>
      </h4>
      <p className="mt-1 text-sm text-tinta-suave">O que se pode tirar. Não muda o preço.</p>
      <ul className="mt-3 space-y-2">
        {valor.map((o, i) => (
          <li key={o.id ?? `nova-${i}`} className="rounded-xl border border-tinta/10 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <Rotulo htmlFor={`${ids}-op${i}`}>Sem…</Rotulo>
                <input
                  id={`${ids}-op${i}`}
                  value={o.nome}
                  placeholder="ex.: fiambre"
                  onChange={(ev) => mudarUma(i, { nome: ev.target.value })}
                  className={campo}
                />
              </div>
              <Ativa ligada={o.ativa} onMudar={(ativa) => mudarUma(i, { ativa })} rotulo="Disponível" />
              <Controlos
                nome={o.nome || "opção"}
                i={i}
                total={valor.length}
                onMover={(passo) => onMudar(mover(valor, i, passo))}
                onRemover={() => onMudar(valor.filter((_, j) => j !== i))}
              />
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onMudar([...valor, { nome: "", en: null, ativa: true }])} className={`${BOTAO_SECUNDARIO} mt-3`}>
        + Opção
      </button>
    </div>
  );
}

// ——— Extras ———

export function ListaExtras({
  ids,
  valor,
  onMudar,
  catalogo,
  produtoId,
}: {
  ids: string;
  valor: ExtraForm[];
  onMudar: (v: ExtraForm[]) => void;
  catalogo: readonly Produto[];
  produtoId: string | null;
}) {
  const mudarUm = (i: number, parcial: Partial<ExtraForm>) => onMudar(valor.map((x, j) => (j === i ? { ...x, ...parcial } : x)));
  const disponiveis = pecasDoCatalogo<Produto["extras"][number]>(catalogo, "extras", valor.map((x) => x.id));
  const daLista = (id: string) => disponiveis.find((d) => d.peca.id === id)!.peca;
  return (
    <div>
      <h4 className="flex items-center gap-1.5 font-semibold">
        Extras · {valor.length}
        <Ajuda titulo="Extras">
          O que se pode <strong>pôr a mais</strong>: uma fatia de queijo, um ovo, um topper. Cada um tem um preço por unidade (pode ser 0 €) e
          um máximo por unidade do produto.
        </Ajuda>
      </h4>
      <p className="mt-1 text-sm text-tinta-suave">O que se pode pôr a mais.</p>
      <ul className="mt-3 space-y-3">
        {valor.map((x, i) => {
          const ligados = ligadoEm(catalogo, produtoId, "extras", x.id);
          return (
            <li key={x.id ?? `novo-${i}`} className="rounded-xl border border-tinta/10 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_6rem] sm:items-end">
                <div>
                  <Rotulo htmlFor={`${ids}-ex${i}`}>Extra</Rotulo>
                  <input
                    id={`${ids}-ex${i}`}
                    value={x.nome}
                    placeholder="ex.: fatia de queijo"
                    onChange={(ev) => mudarUm(i, { nome: ev.target.value })}
                    className={campo}
                  />
                </div>
                <div>
                  <Rotulo htmlFor={`${ids}-ex${i}-preco`}>Preço (€)</Rotulo>
                  <input
                    id={`${ids}-ex${i}-preco`}
                    inputMode="decimal"
                    value={x.preco}
                    placeholder="0,00"
                    onChange={(ev) => mudarUm(i, { preco: ev.target.value })}
                    className={`${campo} text-right tabular-nums`}
                  />
                </div>
                <div>
                  <Rotulo htmlFor={`${ids}-ex${i}-max`} ajuda="Quantos se podem pôr numa unidade do produto.">
                    Máximo
                  </Rotulo>
                  <input
                    id={`${ids}-ex${i}-max`}
                    inputMode="numeric"
                    value={x.maximo}
                    onChange={(ev) => mudarUm(i, { maximo: ev.target.value.replace(/\D/g, "") })}
                    className={`${campo} text-right tabular-nums`}
                  />
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4">
                <span className="text-sm tabular-nums text-tinta-suave">{precoAoLado(x.preco)} cada</span>
                <Ativa ligada={x.ativo} onMudar={(ativo) => mudarUm(i, { ativo })} rotulo="Disponível" />
                <div className="ml-auto">
                  <Controlos
                    nome={x.nome || "extra"}
                    i={i}
                    total={valor.length}
                    onMover={(passo) => onMudar(mover(valor, i, passo))}
                    onRemover={() => onMudar(valor.filter((_, j) => j !== i))}
                    remover={ligados.length > 0 ? "Tirar deste produto" : "Remover"}
                  />
                </div>
              </div>
              <Ligado ligados={ligados} peca="o preço ou o máximo" />
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onMudar([...valor, { nome: "", en: null, preco: "", maximo: "1", ativo: true }])}
        className={`${BOTAO_SECUNDARIO} mt-3`}
      >
        + Criar extra
      </button>
      <UsarDeOutro
        ids={`${ids}-ex`}
        rotulo="Usar um extra de outro produto"
        opcoes={disponiveis.map((d) => ({ id: d.peca.id, texto: `${d.peca.nome.pt} (${porExtenso(d.peca.precoCent)}) — de ${d.produto}` }))}
        onLigar={(id) => onMudar([...valor, extraParaForm(daLista(id), true)])}
        onCopiar={(id) => onMudar([...valor, extraParaForm(daLista(id), false)])}
      />
    </div>
  );
}

// ——— O que um grupo leva ———

/**
 * Os produtos simples de um grupo, cada um com a quantidade que ela quiser, ou
 * sem quantidade. Só simples, e uma vez cada (`variantes_leva_unico`); fora de
 * venda também, que é para isso que se criam («Salgados variados»).
 */
export function LevaDoGrupo({
  ids,
  valor,
  onMudar,
  catalogo,
  produtoId,
}: {
  ids: string;
  valor: LevaForm[];
  onMudar: (v: LevaForm[]) => void;
  catalogo: readonly Produto[];
  produtoId: string | null;
}) {
  const simples = catalogo.filter((p) => p.tipo === "simples" && p.id !== produtoId && !p.arquivado);
  const [aJuntar, setAJuntar] = useState("");
  const porJuntar = simples.filter((p) => !valor.some((l) => l.produtoId === p.id));
  const nomeDe = (id: string) => catalogo.find((p) => p.id === id)?.nome.pt ?? id;
  const mudarUm = (i: number, parcial: Partial<LevaForm>) => onMudar(valor.map((l, j) => (j === i ? { ...l, ...parcial } : l)));
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">Leva · {valor.length}</p>
      {valor.length > 0 && (
        <ul className="mt-2 space-y-2">
          {valor.map((l, i) => {
            const p = catalogo.find((q) => q.id === l.produtoId);
            return (
              <li key={l.produtoId} className="rounded-lg bg-tinta/[0.03] p-2 sm:p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-24">
                    <Rotulo htmlFor={`${ids}-q${i}`} opcional>
                      Quantos
                    </Rotulo>
                    <input
                      id={`${ids}-q${i}`}
                      inputMode="decimal"
                      value={l.quantidade}
                      placeholder="—"
                      onChange={(ev) => mudarUm(i, { quantidade: ev.target.value.replace(/[^\d,.]/g, "") })}
                      className={`${campo} text-right tabular-nums`}
                    />
                  </div>
                  <p className="min-w-0 flex-1 basis-40 pb-3 font-semibold">
                    {nomeDe(l.produtoId)}
                    {p && p.variancias.length > 0 && (
                      <span className="block text-xs font-normal text-tinta-suave">
                        O cliente escolhe: {p.variancias.map((v) => v.nome.pt).join(", ")}
                      </span>
                    )}
                    {p && !p.aVendaOnline && <span className="block text-xs font-normal text-tinta-suave">Só em kits (fora de venda)</span>}
                  </p>
                  <Controlos
                    nome={nomeDe(l.produtoId)}
                    i={i}
                    total={valor.length}
                    onMover={(passo) => onMudar(mover(valor, i, passo))}
                    onRemover={() => onMudar(valor.filter((_, j) => j !== i))}
                    remover="Tirar"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <label htmlFor={`${ids}-juntar`} className="sr-only">
          Produto a juntar ao grupo
        </label>
        <select id={`${ids}-juntar`} value={aJuntar} onChange={(ev) => setAJuntar(ev.target.value)} className={`${campo} mt-0 sm:max-w-sm`}>
          <option value="">Escolher um produto simples…</option>
          {porJuntar.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome.pt}
              {p.aVendaOnline ? "" : " (só em kits)"}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!aJuntar}
          onClick={() => {
            onMudar([...valor, { produtoId: aJuntar, quantidade: "" }]);
            setAJuntar("");
          }}
          className={BOTAO_SECUNDARIO}
        >
          + Juntar produto
        </button>
      </div>
      {simples.length === 0 && (
        <p className="mt-2 text-sm text-tinta-suave">Ainda não há produtos simples. Crie-os primeiro — podem ficar fora de venda, só para kits.</p>
      )}
    </div>
  );
}

/** A quantidade do formulário: vazia é «sem quantidade»; senão, um número positivo. */
export const quantidadeDoForm = (texto: string): number | null | "invalida" => {
  if (!texto.trim()) return null;
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : "invalida";
};

// ——— O que o cliente vê ———

/**
 * O resumo do que o cliente vai ver e pagar por uma unidade: o preço mais
 * baixo e o mais alto que as peças dão. É aqui que um 40 € escrito por 0,40 €
 * salta à vista antes de chegar a um cliente.
 */
export function ComoOClienteVe({
  tamanhos,
  pecas,
  unidade,
}: {
  tamanhos: { nome: string; cent: number | null }[];
  pecas: PecasForm;
  unidade: "un" | "kg";
}) {
  const comPreco = tamanhos.filter((t) => t.cent !== null) as { nome: string; cent: number }[];
  const cent = (texto: string) => paraCent(texto || "0") ?? 0;
  const variancias = pecas.variancias.map((v) => {
    const ativas = v.escolhas.filter((e) => e.ativa).map((e) => cent(e.acrescimo));
    return { min: ativas.length ? Math.min(...ativas) : 0, max: ativas.length ? Math.max(...ativas) : 0 };
  });
  const extrasMax = pecas.extras.filter((x) => x.ativo).reduce((s, x) => s + cent(x.preco) * (Number(x.maximo) || 0), 0);
  const base = comPreco.length ? Math.min(...comPreco.map((t) => t.cent)) : null;
  const topo = comPreco.length ? Math.max(...comPreco.map((t) => t.cent)) : null;
  const minimo = base === null ? null : base + variancias.reduce((s, v) => s + v.min, 0);
  const maximo = topo === null ? null : topo + variancias.reduce((s, v) => s + v.max, 0) + extrasMax;
  const por = unidade === "kg" ? " por kg" : "";
  return (
    <aside className="rounded-xl border border-tinta/15 bg-tinta/[0.03] p-4 text-sm" aria-label="Como o cliente vê">
      <p className="font-semibold">Como o cliente vê</p>
      {minimo === null ? (
        <p className="mt-1 text-tinta-suave">Sob orçamento: o preço vem depois do pedido.</p>
      ) : (
        <p className="mt-1">
          Uma unidade custa{" "}
          <strong className="tabular-nums">
            {minimo === maximo ? porExtenso(minimo) : `de ${porExtenso(minimo)} a ${porExtenso(maximo!)}`}
          </strong>
          {por}
          {maximo !== minimo && <span className="text-tinta-suave"> (com tudo o que é a mais)</span>}.
        </p>
      )}
      {(pecas.variancias.length > 0 || pecas.opcoes.length > 0 || pecas.extras.length > 0) && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-tinta-suave">
          {pecas.variancias.map((v, i) => (
            <li key={`v${i}`}>
              Escolhe {v.nome || "…"}: {v.escolhas.filter((e) => e.ativa).map((e) => e.nome || "…").join(" / ")}
            </li>
          ))}
          {pecas.opcoes.filter((o) => o.ativa).length > 0 && (
            <li>
              Pode tirar:{" "}
              {pecas.opcoes
                .filter((o) => o.ativa)
                .map((o) => o.nome || "…")
                .join(", ")}
            </li>
          )}
          {pecas.extras
            .filter((x) => x.ativo)
            .map((x, i) => (
              <li key={`x${i}`}>
                Pode pôr {x.nome || "…"} ({precoAoLado(x.preco)} cada, até {x.maximo || "?"})
              </li>
            ))}
        </ul>
      )}
    </aside>
  );
}

export type { Pecas };
