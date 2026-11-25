"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/dados/tipos";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { PedidoCartao } from "../balcao/PedidoCartao";
import { ROTULO_ESTADO } from "./PedidosGestao";

/**
 * # Os pedidos do dia em lista compacta — a vista da gerente (proposta de 25/11)
 *
 * O balcão vê cartões grandes porque despacha; a gerente vê uma linha por
 * pedido porque **procura**: a hora, a referência, o cliente, o estado e o
 * total, e vinte pedidos cabem num ecrã.
 *
 * ⚠️ **«Ver pedido» abre o cartão do balcão, e não uma janela só de leitura.**
 * A gerente também entrega pedidos numa hora de ponta: o «Entregue», a pergunta
 * do dinheiro em falta e o desfazer são os mesmos, e vivem no `PedidoCartao`.
 */
export function ListaCompacta({
  pedidos,
  onEntregue,
  rotuloDia,
}: {
  pedidos: Pedido[];
  onEntregue: (p: Pedido) => void;
  /** «Hoje», ou o dia por extenso nos próximos. */
  rotuloDia: (p: Pedido) => string;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
      {pedidos.map((p) => {
        const cancelado = p.estado === "cancelado";
        const estaAberto = aberto === p.id;
        return (
          <li key={p.id} className="px-4 py-3 sm:px-5">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[4rem_1fr_auto_auto_auto]">
              <span className={`titulo-display text-xl tabular-nums ${cancelado ? "line-through" : ""}`}>
                {horaDeLisboa(p.levantamentoEm)}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm tracking-wider">{p.referencia}</strong>
                <span className="block truncate text-sm text-tinta-suave">
                  {p.cliente.nome} · {rotuloDia(p)}
                </span>
              </span>
              <span className="text-right font-semibold tabular-nums sm:order-4">{formatarCent(p.totalCent, "pt")}</span>
              <span
                className={`col-start-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold sm:order-3 sm:col-start-auto ${
                  cancelado ? "bg-tijolo text-papel" : "bg-tinta/10"
                }`}
              >
                {ROTULO_ESTADO[p.estado]}
              </span>
              <button
                type="button"
                aria-expanded={estaAberto}
                aria-controls={`compacto-${p.id}`}
                onClick={() => setAberto(estaAberto ? null : p.id)}
                className="premivel col-start-3 inline-flex min-h-11 items-center justify-center rounded-full border border-tinta/20 px-4 text-sm font-semibold sm:order-5 sm:col-start-auto"
              >
                {estaAberto ? "Fechar" : "Ver pedido"}
              </button>
            </div>
            {estaAberto && (
              <div id={`compacto-${p.id}`} className="mt-3">
                <PedidoCartao pedido={p} destaque onEntregue={onEntregue} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
