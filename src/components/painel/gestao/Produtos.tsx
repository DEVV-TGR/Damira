"use client";

import { useState } from "react";
import type { Familia, OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { contarPorPreencher, filtrarProdutos, type VistaProdutos } from "@/lib/painel";
import { formatarCent } from "@/lib/preco";
import { porOrdemAlfabetica } from "@/lib/vista";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "../balcao/comum";
import { EditorProduto } from "./EditorProduto";

/**
 * # Produtos (`painel-gerente.md` › Produtos, #40)
 *
 * ⚠️ É o critério da Etapa 1: **«a casa pode começar a preencher produtos»**.
 * A lista abre no que falta preencher — fotos, alergénios, tempos —, que é a
 * lista de tarefas da casa antes do lançamento. Tudo funciona no telemóvel.
 *
 * As etiquetas a tijolo dizem **o que falta** («foto», «alergénios», «tempo»);
 * a escura diz que não se vende online.
 */

const VISTAS: { id: VistaProdutos; rotulo: string }[] = [
  { id: "por-preencher", rotulo: "Por preencher" },
  { id: "todos", rotulo: "Todos" },
  { id: "a-venda", rotulo: "À venda online" },
  { id: "fora", rotulo: "Fora de venda" },
  { id: "arquivados", rotulo: "Arquivados" },
];

const FAMILIAS: { id: Produto["familia"] | "todas"; rotulo: string }[] = [
  /* É o tipo de cartão (a `familia` do produto), e não as famílias da loja
     (26/11): chamava-se «Todas as famílias», e com as famílias da gerente ao
     lado era o mesmo nome para duas coisas. */
  { id: "todas", rotulo: "Todos os tipos" },
  { id: "ementa", rotulo: "Carta" },
  { id: "festa", rotulo: "Kits de festa" },
  { id: "bolo", rotulo: "Kits de bolo" },
  { id: "box", rotulo: "Boxes" },
  { id: "medida", rotulo: "Os nossos Bolos" },
];

const precoDe = (p: Produto) => {
  const precos = p.variantes.map((v) => v.precoCent).filter((c): c is number => c !== null);
  if (precos.length === 0) return "sob orçamento";
  const minimo = Math.min(...precos);
  return `${precos.length > 1 ? "desde " : ""}${formatarCent(minimo, "pt")}${p.unidade === "kg" ? "/kg" : ""}`;
};

export function Produtos({
  produtos: doServidor,
  ordem,
  familias,
  vistaInicial,
  procura,
  onRascunho,
}: {
  produtos: Produto[];
  ordem: OrdemEmenta;
  familias: Familia[];
  vistaInicial: VistaProdutos;
  /** A pesquisa de cima do painel. */
  procura: string;
  onRascunho: (nome: string | null) => void;
}) {
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
  const [vista, setVista] = useState<VistaProdutos>(vistaInicial);
  const [familia, setFamilia] = useState<Produto["familia"] | "todas">("todas");
  const [aEditar, setAEditar] = useState<string | "novo" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /* O rascunho da ficha aberta: com alterações, trocar de produto pergunta
     primeiro, e o painel de cima também sabe (para não mudar de menu às cegas). */
  const [sujo, setSujo] = useState(false);
  const [troca, setTroca] = useState<string | "novo" | null>(null);
  /* Depois de guardar, a ficha fica aberta mas recomeça do que o servidor
     devolveu: sem isto, comparava com o que se abriu e ficava «por guardar». */
  const [versao, setVersao] = useState(0);

  const produtoAberto = aEditar && aEditar !== "novo" ? (produtos.find((p) => p.id === aEditar) ?? null) : null;
  const nomeAberto = aEditar === "novo" ? "Novo produto" : (produtoAberto?.nome.pt ?? "");

  const marcarSujo = (agora: boolean) => {
    setSujo(agora);
    onRascunho(agora ? nomeAberto : null);
  };
  const abrir = (id: string | "novo" | null) => {
    if (id === aEditar) return;
    if (sujo) return setTroca(id ?? "fechar");
    setAEditar(id);
    setAviso(null);
  };

  /* Por ordem alfabética, como nas encomendas (decidido a 25/11): um produto
     novo aparece logo no sítio dele, aqui e no site. */
  const lista = porOrdemAlfabetica(filtrarProdutos(produtos, { procura, vista, familia }), "pt");
  /* «Da carta · Doces · Vegan»: onde a gerente o arrumou (famílias, categorias e secções). */
  const ondeAparece = new Map(
    familias.flatMap((f) => f.categorias.map((c) => [c.id, { rotulo: `${f.nome.pt} · ${c.nome.pt}`, seccoes: c.seccoes }] as const)),
  );
  const ondeEsta = (p: Produto) => {
    const sitio = ondeAparece.get(p.categoriaId ?? "");
    if (!sitio) return undefined;
    const seccao = sitio.seccoes.find((x) => x.id === p.seccaoId);
    return seccao ? `${sitio.rotulo} · ${seccao.nome.pt}` : sitio.rotulo;
  };

  const ficha =
    aEditar !== null ? (
      <EditorProduto
        key={`${aEditar}-${versao}`}
        produto={produtoAberto}
        ordem={ordem}
        familias={familias}
        catalogo={produtos}
        onSujo={marcarSujo}
        onFechar={(mensagem, gravado) => {
          marcarSujo(false);
          setAEditar(gravado && !gravado.arquivado ? gravado.id : null);
          setVersao((v) => v + 1);
          setAviso(mensagem ?? null);
          if (gravado) setLocais((atual) => ({ ...atual, porId: { ...atual.porId, [gravado.id]: gravado } }));
        }}
      />
    ) : null;

  return (
    <section aria-label="Produtos" className="rounded-2xl border border-tinta/15 bg-papel">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="mr-auto">
          <h2 className="titulo-display text-2xl">Produtos</h2>
          <p className="text-sm text-tinta-suave">
            {contas.semFoto} sem foto · {contas.semAlergenios} sem alergénios · {contas.semTempo} sem tempo de produção
          </p>
        </div>
        <button type="button" onClick={() => abrir("novo")} className={BOTAO_PRINCIPAL}>
          + Novo
        </button>
      </div>
      {aviso && (
        <p role="status" className="mx-4 mt-3 rounded-xl bg-tinta/5 px-4 py-3 font-semibold sm:mx-6">
          {aviso}
        </p>
      )}
      {troca !== null && (
        /* Preso ao topo: quem tocou noutro produto está a olhar para a lista, a
           meio da página, e um aviso lá em cima passava despercebido. */
        <div
          role="alert"
          className="sticky top-2 z-20 mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-tijolo bg-papel px-4 py-3 shadow-lg sm:mx-6"
        >
          <p className="mr-auto font-semibold">«{nomeAberto}» tem alterações por guardar.</p>
          <button type="button" onClick={() => setTroca(null)} className={BOTAO_SECUNDARIO}>
            Continuar a editar
          </button>
          <button
            type="button"
            onClick={() => {
              marcarSujo(false);
              setAEditar(troca === "fechar" ? null : troca);
              setTroca(null);
            }}
            className={`${BOTAO_SECUNDARIO} border-tijolo text-tijolo`}
          >
            Descartar
          </button>
        </div>
      )}

      {/* Lista à esquerda e ficha à direita a partir do ecrã largo; no telemóvel,
          a ficha toma o lugar da lista e o «← Produtos» devolve-a. */}
      <div className="mt-4 border-t border-tinta/10 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className={`min-w-0 p-4 sm:px-6 lg:border-r lg:border-tinta/10 lg:px-4 ${ficha ? "hidden lg:block" : ""}`}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <select
              value={vista}
              onChange={(e) => setVista(e.target.value as VistaProdutos)}
              aria-label="Mostrar"
              className="min-h-12 min-w-0 rounded-xl border border-tinta/20 bg-papel px-3"
            >
              {VISTAS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.rotulo}
                </option>
              ))}
            </select>
            <select
              value={familia}
              onChange={(e) => setFamilia(e.target.value as typeof familia)}
              aria-label="Tipo"
              className="min-h-12 min-w-0 rounded-xl border border-tinta/20 bg-papel px-3"
            >
              {FAMILIAS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-sm text-tinta-suave" aria-live="polite">
            {lista.length} {lista.length === 1 ? "produto" : "produtos"}
            {procura.trim() && ` com «${procura.trim()}»`} · por ordem alfabética
          </p>
          <ul className="mt-2 space-y-1 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={aEditar === p.id ? "true" : undefined}
                  onClick={() => abrir(p.id)}
                  className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-tijolo ${
                    aEditar === p.id ? "border-tijolo bg-tijolo/5" : "border-transparent hover:bg-tinta/5"
                  }`}
                >
                  <span className="mr-auto min-w-0">
                    <strong className="block">{p.nome.pt}</strong>
                    <span className="block text-sm text-tinta-suave">
                      {/* Onde aparece na loja (26/11): é o que a gerente arruma. */}
                      {ondeEsta(p) ??
                        (p.familia === "ementa" ? `${p.carta} · ${p.categoria}` : FAMILIAS.find((f) => f.id === p.familia)?.rotulo)}{" "}
                      ·{" "}
                      {precoDe(p)}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {p.alergenios === null && <Etiqueta>alergénios</Etiqueta>}
                    {p.fotos.length === 0 && <Etiqueta>foto</Etiqueta>}
                    {p.tempoProducao === null && <Etiqueta>tempo</Etiqueta>}
                    {(!p.aVendaOnline || p.foraDeVenda) && !p.arquivado && <Etiqueta escura>fora de venda</Etiqueta>}
                  </span>
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="px-3 py-6 text-tinta-suave">Nenhum produto nesta vista.</li>}
          </ul>
        </div>
        <div className={`min-w-0 ${ficha ? "" : "hidden lg:block"}`}>
          {ficha ?? (
            <p className="p-8 text-tinta-suave">Escolha um produto da lista, ou crie um novo.</p>
          )}
        </div>
      </div>
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
