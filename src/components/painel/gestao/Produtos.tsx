"use client";

import { useState } from "react";
import type { OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { contarPorPreencher, filtrarProdutos, porPreencher, type VistaProdutos } from "@/lib/painel";
import { formatarCent } from "@/lib/preco";
import { BOTAO_PRINCIPAL } from "../balcao/comum";
import { EditorProduto } from "./EditorProduto";

/**
 * # Produtos (`painel-gerente.md` › Produtos, #40)
 *
 * ⚠️ É o critério da Etapa 1: **«a casa pode começar a preencher produtos»**.
 * A lista abre no que falta preencher — fotos, alergénios, tempos —, que é a
 * lista de tarefas da casa antes do lançamento. Tudo funciona no telemóvel.
 */

const VISTAS: { id: VistaProdutos; rotulo: string }[] = [
  { id: "por-preencher", rotulo: "Por preencher" },
  { id: "todos", rotulo: "Todos" },
  { id: "a-venda", rotulo: "À venda online" },
  { id: "fora", rotulo: "Fora de venda" },
  { id: "arquivados", rotulo: "Arquivados" },
];

const FAMILIAS: { id: Produto["familia"] | "todas"; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas as famílias" },
  { id: "ementa", rotulo: "Carta" },
  { id: "festa", rotulo: "Kits de festa" },
  { id: "bolo", rotulo: "Kits de bolo" },
  { id: "box", rotulo: "Boxes" },
  { id: "medida", rotulo: "Bolo por medida" },
];

const precoDe = (p: Produto) => {
  const precos = p.variantes.map((v) => v.precoCent).filter((c): c is number => c !== null);
  if (precos.length === 0) return "sob orçamento";
  const minimo = Math.min(...precos);
  return `${precos.length > 1 ? "desde " : ""}${formatarCent(minimo, "pt")}${p.unidade === "kg" ? "/kg" : ""}`;
};

export function Produtos({ produtos: doServidor, ordem }: { produtos: Produto[]; ordem: OrdemEmenta }) {
  /* O que a gerente acabou de gravar entra já, com o que o servidor devolveu: a
     lista nova (`router.refresh`) chega um instante depois, e até lá um produto
     arquivado continuava na lista como se nada fosse. Quando ela chega, manda. */
  const [locais, setLocais] = useState<{ base: Produto[]; porId: Record<string, Produto> }>({ base: doServidor, porId: {} });
  if (locais.base !== doServidor) setLocais({ base: doServidor, porId: {} });
  const produtos = [
    ...doServidor.map((p) => locais.porId[p.id] ?? p),
    ...Object.values(locais.porId).filter((p) => !doServidor.some((q) => q.id === p.id)),
  ];
  const contas = contarPorPreencher(produtos);
  const [vista, setVista] = useState<VistaProdutos>(contas.produtos.length > 0 ? "por-preencher" : "todos");
  const [familia, setFamilia] = useState<Produto["familia"] | "todas">("todas");
  const [procura, setProcura] = useState("");
  const [aEditar, setAEditar] = useState<Produto | "novo" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (aEditar !== null) {
    return (
      <EditorProduto
        produto={aEditar === "novo" ? null : aEditar}
        ordem={ordem}
        onFechar={(mensagem, gravado) => {
          setAEditar(null);
          setAviso(mensagem ?? null);
          if (gravado) setLocais((atual) => ({ ...atual, porId: { ...atual.porId, [gravado.id]: gravado } }));
        }}
      />
    );
  }

  const lista = filtrarProdutos(produtos, { procura, vista, familia });

  return (
    <section aria-label="Produtos">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto">
          <strong>{contas.semFoto}</strong> sem foto · <strong>{contas.semAlergenios}</strong> sem alergénios ·{" "}
          <strong>{contas.semTempo}</strong> sem tempo de produção
        </p>
        <button type="button" onClick={() => setAEditar("novo")} className={BOTAO_PRINCIPAL}>
          Novo produto
        </button>
      </div>
      {aviso && (
        <p role="status" className="mt-3 rounded-xl bg-tinta/5 px-4 py-3 font-semibold">
          {aviso}
        </p>
      )}

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={vista === v.id}
            onClick={() => setVista(v.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
              vista === v.id ? "bg-tinta text-papel" : "border border-tinta/15 bg-papel"
            }`}
          >
            {v.rotulo}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          placeholder="Procurar produto"
          aria-label="Procurar produto"
          className="min-w-0 rounded-xl border border-tinta/20 bg-papel px-4 py-3"
        />
        <select
          value={familia}
          onChange={(e) => setFamilia(e.target.value as typeof familia)}
          aria-label="Família"
          className="rounded-xl border border-tinta/20 bg-papel px-3 py-3"
        >
          {FAMILIAS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-tinta-suave">{lista.length} produtos</p>
      <ul className="mt-2 divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
        {lista.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setAEditar(p)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left">
              <span className="mr-auto min-w-0">
                <strong>{p.nome.pt}</strong>
                <span className="block text-sm text-tinta-suave">
                  {p.familia === "ementa" ? `${p.carta} · ${p.categoria}` : FAMILIAS.find((f) => f.id === p.familia)?.rotulo} · {precoDe(p)}
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {p.alergenios === null && <Etiqueta>sem alergénios</Etiqueta>}
                {p.fotos.length === 0 && <Etiqueta>sem foto</Etiqueta>}
                {p.tempoProducao === null && <Etiqueta>sem tempo</Etiqueta>}
                {(!p.aVendaOnline || p.foraDeVenda) && !p.arquivado && <Etiqueta escura>fora de venda</Etiqueta>}
                {!porPreencher(p) && p.aVendaOnline && !p.foraDeVenda && <Etiqueta escura>à venda</Etiqueta>}
              </span>
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="px-4 py-6 text-tinta-suave">Nenhum produto nesta vista.</li>}
      </ul>
    </section>
  );
}

function Etiqueta({ children, escura = false }: { children: React.ReactNode; escura?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${escura ? "bg-tinta/10" : "border border-tijolo text-tijolo"}`}
    >
      {children}
    </span>
  );
}
