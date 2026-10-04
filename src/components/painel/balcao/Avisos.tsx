"use client";

import type { Pedido } from "@/lib/dados/tipos";
import { diaPorExtenso } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { BOTAO } from "./comum";

/**
 * Os avisos no canto (`painel-balcao.md`):
 *
 * - **novo**: «Novo pedido DAM-… · 14:30 · talão impresso ✓». O som toca uma vez;
 *   o aviso **fica até alguém lhe tocar** — é o que resta para quem estava de costas.
 * - **talão**: o talão não saiu. Vermelho, e o alarme repete-se até «Já tratei».
 * - **cancelado**: vermelho, até alguém lhe tocar. O talão já está na cozinha.
 * - **entregue**: «Desfazer» durante 5 minutos.
 */
export type Aviso =
  | { id: string; tipo: "novo" | "talao" | "cancelado"; pedido: Pedido }
  | { id: string; tipo: "entregue"; pedido: Pedido; ate: number };

export function Avisos({
  avisos,
  onFechar,
  onDesfazer,
}: {
  avisos: Aviso[];
  onFechar: (id: string) => void;
  onDesfazer: (aviso: Aviso) => void;
}) {
  if (avisos.length === 0) return null;
  return (
    <div
      aria-live="assertive"
      className="fixed inset-x-3 bottom-3 z-30 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]"
    >
      {avisos.map((aviso) => {
        const { pedido } = aviso;
        const hora = horaDeLisboa(pedido.levantamentoEm);
        if (aviso.tipo === "entregue") {
          return (
            <div key={aviso.id} className="flex items-center gap-3 rounded-2xl border border-tinta/15 bg-papel p-3 shadow-lg">
              <p className="mr-auto text-sm">
                <strong>Entregue</strong> · {pedido.referencia}
              </p>
              <button type="button" onClick={() => onDesfazer(aviso)} className={`${BOTAO} bg-tinta text-papel`}>
                Desfazer
              </button>
            </div>
          );
        }
        if (aviso.tipo === "talao") {
          return (
            <div key={aviso.id} role="alert" className="rounded-2xl bg-tijolo p-4 text-papel shadow-lg">
              <p className="font-semibold">⚠ O talão do {pedido.referencia} NÃO saiu</p>
              <p className="mt-1 text-sm">
                {pedido.cliente.nome} · levanta às {hora}. Escreva-o à mão, ou reimprima.
              </p>
              <button
                type="button"
                onClick={() => onFechar(aviso.id)}
                className={`${BOTAO} mt-3 border border-papel/60`}
              >
                Já tratei
              </button>
            </div>
          );
        }
        const cancelado = aviso.tipo === "cancelado";
        return (
          <button
            key={aviso.id}
            type="button"
            onClick={() => onFechar(aviso.id)}
            className={`rounded-2xl p-4 text-left shadow-lg ${cancelado ? "bg-tijolo text-papel" : "bg-tinta text-papel"}`}
          >
            <p className="font-semibold">
              {cancelado
                ? `CANCELADO ${pedido.referencia} — levantamento ${diaPorExtenso(pedido.levantamentoEm)} ${hora}`
                : `Novo pedido ${pedido.referencia} · ${hora} · talão impresso ✓`}
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-papel/80">Toque para fechar</p>
          </button>
        );
      })}
    </div>
  );
}
