"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelar, tratar } from "@/app/painel/acoes-gestao";
import type { Pedido } from "@/lib/dados/tipos";
import { porDevolverCent } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { BOTAO, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";
import { PedidoCartao } from "../balcao/PedidoCartao";

/**
 * Um possível duplicado, **lado a lado** (`robustez.md` › Envios duplicados): o
 * cliente abriu dois separadores e pagou duas vezes a mesma coisa. Para o
 * sistema são dois pedidos legítimos; decide a gerente:
 *
 * - **ficar com um** — juntar os dois num só: o outro é cancelado e reembolsado
 *   por inteiro;
 * - ou **são dois pedidos diferentes** — mantêm-se os dois, e o aviso sai.
 */
export function Comparar({ a, b, onFechar }: { a: Pedido; b: Pedido; onFechar: () => void }) {
  const router = useRouter();
  const [ficar, setFicar] = useState<Pedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();
  const outro = ficar && (ficar.id === a.id ? b : a);

  const confirmar = () =>
    iniciar(async () => {
      if (!ficar || !outro) return;
      const cancelado = await cancelar(outro.id, porDevolverCent(outro));
      if (!cancelado.ok) return setErro(MENSAGENS[cancelado.erro]);
      await tratar(ficar.id, "possivel-duplicado");
      router.refresh();
      onFechar();
    });

  const manterOsDois = () =>
    iniciar(async () => {
      const resultado = await tratar(a.id, "possivel-duplicado");
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
      onFechar();
    });

  return (
    <section aria-label="Comparar pedidos" className="space-y-4">
      <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
        ← Voltar
      </button>
      <p className="text-tinta-suave">
        Mesmo cliente, mesmos artigos, mesma hora de levantamento, pagos com{" "}
        {Math.round(Math.abs((b.pagoEm?.getTime() ?? 0) - (a.pagoEm?.getTime() ?? 0)) / 60_000)} minutos de diferença.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {[a, b].map((p) => (
          <div key={p.id} className={`rounded-3xl p-1 ${ficar?.id === p.id ? "bg-tinta" : ""}`}>
            <PedidoCartao pedido={p} soLeitura />
            <p className="mt-2 px-3 text-sm text-tinta-suave">
              Pago às {p.pagoEm ? horaDeLisboa(p.pagoEm) : "—"} · {p.cliente.email}
            </p>
            <button
              type="button"
              onClick={() => setFicar(p)}
              className={`${BOTAO} mt-2 w-full ${ficar?.id === p.id ? "bg-papel text-tinta" : "border border-tinta/20 bg-papel"}`}
            >
              Ficar com este
            </button>
          </div>
        ))}
      </div>

      {ficar && outro && (
        <div className="rounded-2xl border-2 border-tijolo bg-papel p-4">
          <p className="font-semibold">
            Fica o {ficar.referencia}. O {outro.referencia} é cancelado e reembolsado em{" "}
            {formatarCent(porDevolverCent(outro), "pt")}.
          </p>
          <p className="text-sm text-tinta-suave">
            O balcão é avisado do cancelamento. Até aos pagamentos online, o reembolso só fica registado.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={aEnviar} onClick={confirmar} className={`${BOTAO} bg-tijolo text-papel`}>
              Confirmar
            </button>
            <button type="button" onClick={() => setFicar(null)} className={BOTAO_SECUNDARIO}>
              Afinal não
            </button>
          </div>
        </div>
      )}

      <button type="button" disabled={aEnviar} onClick={manterOsDois} className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
        São dois pedidos diferentes — manter os dois
      </button>
      {erro && <p className="font-semibold text-tijolo">{erro}</p>}
    </section>
  );
}
