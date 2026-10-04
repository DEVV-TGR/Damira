"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { desfazer } from "@/app/painel/acoes-balcao";
import { detalheDoPedido } from "@/app/painel/acoes-gestao";
import type { Pedido } from "@/lib/dados/tipos";
import { diaPorExtenso, historicoDe, type EventoHistorico } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";
import { PedidoCartao } from "../balcao/PedidoCartao";
import { DecisoesDoPedido } from "./Decisoes";

const O_QUE: Record<EventoHistorico["o"], string> = {
  criado: "Criado no site",
  pago: "Pago",
  impresso: "Talão impresso",
  entregue: "Entregue",
  cancelado: "Cancelado",
  reagendado: "Levantamento mudado",
  reembolso: "Reembolso",
};

/**
 * O detalhe de um pedido para a gerente: tudo o que o balcão vê, e o histórico
 * (`painel-gerente.md` › Pedidos). Lê-se sempre do servidor, ao abrir: um
 * pedido de uma lista de há dez minutos pode já não ser o mesmo.
 */
export function DetalhePedido({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    void detalheDoPedido(id).then((resultado) => {
      if (!vivo) return;
      if (resultado.ok) setPedido(resultado.valor);
      else setErro(MENSAGENS[resultado.erro]);
    });
    return () => {
      vivo = false;
    };
  }, [id]);

  const desfazerJa = () =>
    iniciar(async () => {
      const resultado = await desfazer(id);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      setPedido(resultado.valor);
      router.refresh();
    });

  return (
    <section aria-label="Detalhe do pedido">
      <button type="button" onClick={onVoltar} className={BOTAO_SECUNDARIO}>
        ← Voltar
      </button>
      {erro && <p className="mt-4 font-semibold text-tijolo">{erro}</p>}
      {pedido === null ? (
        !erro && <p className="mt-4 text-tinta-suave">A carregar…</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <PedidoCartao pedido={pedido} onEntregue={setPedido} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-tinta/15 bg-papel p-5">
              <h3 className="titulo-display text-xl">Histórico</h3>
              <ol className="mt-3 space-y-2">
                {historicoDe(pedido).map((evento) => (
                  <li key={`${evento.o}-${evento.quando.getTime()}`} className="flex justify-between gap-4">
                    <span>
                      {O_QUE[evento.o]}
                      {evento.detalhe && <span className="block text-sm text-tinta-suave">{evento.detalhe}</span>}
                    </span>
                    <span className="text-right text-sm text-tinta-suave">
                      {diaPorExtenso(evento.quando)}, {horaDeLisboa(evento.quando)}
                    </span>
                  </li>
                ))}
              </ol>
              <dl className="mt-4 space-y-1 border-t border-tinta/10 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatarCent(pedido.totalCent, "pt")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Pago online</dt>
                  <dd className="tabular-nums">{formatarCent(pedido.pagoOnlineCent, "pt")}</dd>
                </div>
                {pedido.reembolsadoCent > 0 && (
                  <div className="flex justify-between">
                    <dt>Reembolsado</dt>
                    <dd className="tabular-nums">{formatarCent(pedido.reembolsadoCent, "pt")}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Email</dt>
                  <dd className="min-w-0 truncate pl-4">{pedido.cliente.email}</dd>
                </div>
                {pedido.cliente.nif && (
                  <div className="flex justify-between">
                    <dt>NIF</dt>
                    <dd>{pedido.cliente.nif}</dd>
                  </div>
                )}
              </dl>
            </div>
            {pedido.estado === "entregue" && (
              <button type="button" onClick={desfazerJa} disabled={aEnviar} className={BOTAO_SECUNDARIO}>
                Desfazer «entregue»
              </button>
            )}
            <DecisoesDoPedido pedido={pedido} onFeito={setPedido} />
            {/* Dizer o que falta, em vez de um botão que não faz nada. */}
            <p className="text-sm text-tinta-suave">Reimprimir o talão chega com a impressora.</p>
          </div>
        </div>
      )}
    </section>
  );
}
