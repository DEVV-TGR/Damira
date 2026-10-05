"use client";

import { useEffect, useState, useTransition } from "react";
import { pedidosDaGestao, type FiltroGestao } from "@/app/painel/acoes-gestao";
import { ESTADOS_PEDIDO, type Pedido } from "@/lib/dados/tipos";
import { diaPorExtenso, rotuloPagamento } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

const ROTULO_ESTADO: Record<Pedido["estado"], string> = {
  pendente: "Pendente",
  pago: "Pago",
  entregue: "Entregue",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const campo =
  "mt-1 w-full rounded-xl border border-tinta/20 bg-papel px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";

/**
 * A lista de pedidos da gerente, com filtros e paginada (`painel-gerente.md`,
 * `robustez.md`): por estado, por dias de levantamento, por nome ou referência.
 * Os mais recentes primeiro.
 */
export function PedidosGestao({ onAbrir }: { onAbrir: (id: string) => void }) {
  const [filtro, setFiltro] = useState<Omit<FiltroGestao, "cursor">>({ estado: "todos", desde: "", ate: "", texto: "" });
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [seguinte, setSeguinte] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, iniciar] = useTransition();

  /* A página seguinte, junta às que já estão. */
  const maisUma = (cursor: string) =>
    iniciar(async () => {
      const resultado = await pedidosDaGestao({ ...filtro, cursor });
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      setPedidos((atuais) => [...(atuais ?? []), ...resultado.valor.pedidos]);
      setSeguinte(resultado.valor.seguinte);
    });

  /* Ao mudar um filtro, recomeça da primeira página — um pouco depois de se
     parar de escrever, para não perguntar a cada letra. */
  useEffect(() => {
    let vivo = true;
    const espera = window.setTimeout(async () => {
      const resultado = await pedidosDaGestao({ ...filtro, cursor: null });
      if (!vivo) return;
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      setErro(null);
      setPedidos(resultado.valor.pedidos);
      setSeguinte(resultado.valor.seguinte);
    }, 300);
    return () => {
      vivo = false;
      window.clearTimeout(espera);
    };
  }, [filtro]);

  return (
    <section aria-label="Pedidos">
      <div className="grid gap-3 rounded-2xl border border-tinta/15 bg-papel p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">
          Estado
          <select value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value as FiltroGestao["estado"] })} className={campo}>
            <option value="todos">Todos</option>
            {ESTADOS_PEDIDO.map((estado) => (
              <option key={estado} value={estado}>
                {ROTULO_ESTADO[estado]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Levantamento de
          <input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} className={campo} />
        </label>
        <label className="text-sm font-semibold">
          até
          <input type="date" value={filtro.ate} onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })} className={campo} />
        </label>
        <label className="text-sm font-semibold">
          Nome ou referência
          <input type="search" value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} className={campo} />
        </label>
      </div>

      {erro && <p className="mt-4 font-semibold text-tijolo">{erro}</p>}
      {pedidos === null ? (
        <p className="mt-4 text-tinta-suave">A carregar…</p>
      ) : pedidos.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Nenhum pedido com estes filtros.</p>
      ) : (
        <ul className="mt-4 divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
          {pedidos.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onAbrir(p.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left">
                <span className="mr-auto min-w-0">
                  <strong className="tracking-wider">{p.referencia}</strong> · {p.cliente.nome}
                  <span className="block text-sm text-tinta-suave">
                    {diaPorExtenso(p.levantamentoEm)}, {horaDeLisboa(p.levantamentoEm)} · {rotuloPagamento(p)}
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                    p.estado === "cancelado" ? "bg-tijolo text-papel" : p.estado === "pago" ? "bg-tinta text-papel" : "bg-tinta/10"
                  }`}
                >
                  {ROTULO_ESTADO[p.estado]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {seguinte && (
        <button type="button" onClick={() => maisUma(seguinte)} disabled={aCarregar} className={`${BOTAO_SECUNDARIO} mt-4`}>
          {aCarregar ? "A carregar…" : "Mostrar mais"}
        </button>
      )}
    </section>
  );
}
