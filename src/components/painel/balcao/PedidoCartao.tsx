"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { entregar } from "@/app/painel/acoes-balcao";
import type { Pedido } from "@/lib/dados/tipos";
import { faltaPagarCent, rotuloPagamento } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { usePainel } from "../PainelAberto";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS, quantidade } from "./comum";

/**
 * Um pedido, como o balcão o vê (`painel-balcao.md` › O que se vê): referência,
 * nome e telefone, hora, artigos com variante, escolhas, quantidade e notas,
 * observações e o pagamento em grande.
 *
 * Os de hoje levam o cabeçalho em **bloco invertido**, como no talão. Um
 * cancelado fica riscado, sem botão.
 */
export function PedidoCartao({
  pedido,
  destaque = false,
  onEntregue,
}: {
  pedido: Pedido;
  destaque?: boolean;
  onEntregue?: (pedido: Pedido) => void;
}) {
  const router = useRouter();
  const { ocupado } = usePainel();
  const [confirmarFalta, setConfirmarFalta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();
  const falta = faltaPagarCent(pedido);
  const cancelado = pedido.estado === "cancelado";

  const entregarJa = (faltaCobrada: boolean) =>
    iniciar(async () => {
      setErro(null);
      /* Nada de recarregar o painel a meio de um «entregue» (versão nova do site). */
      const libertar = ocupado();
      try {
        const resultado = await entregar(pedido.id, faltaCobrada);
        if (resultado.ok) {
          onEntregue?.(resultado.valor);
          router.refresh();
          return;
        }
        setErro(MENSAGENS[resultado.erro]);
        if (resultado.erro === "estado-mudou") router.refresh();
      } catch {
        /* «Entregue» sem rede falha à vista, nunca em silêncio (`robustez.md`). */
        setErro("Sem ligação: não ficou marcado. Tente outra vez.");
      } finally {
        libertar();
        setConfirmarFalta(false);
      }
    });

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-tinta/15 bg-papel ${cancelado ? "opacity-75" : ""}`}
      aria-label={`Pedido ${pedido.referencia}`}
    >
      <header
        className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 ${
          destaque && !cancelado ? "bg-tinta text-papel" : "bg-tinta/5"
        }`}
      >
        <span className={`titulo-display text-3xl tabular-nums ${cancelado ? "line-through" : ""}`}>
          {horaDeLisboa(pedido.levantamentoEm)}
        </span>
        <span className="select-all font-semibold tracking-wider">{pedido.referencia}</span>
      </header>

      <div className="px-5 py-4">
        {cancelado && (
          <p className="mb-3 inline-block rounded-full bg-tijolo px-3 py-1 text-xs font-semibold uppercase tracking-widest text-papel">
            Cancelado
          </p>
        )}
        <p className={cancelado ? "line-through" : ""}>
          <strong>{pedido.cliente.nome}</strong>
          {pedido.cliente.telefone && (
            <>
              {" · "}
              <a href={`tel:${pedido.cliente.telefone}`} className="underline underline-offset-4">
                {pedido.cliente.telefone}
              </a>
            </>
          )}
        </p>

        <ul className={`mt-3 space-y-2 ${cancelado ? "line-through" : ""}`}>
          {pedido.linhas.map((linha, i) => (
            <li key={`${linha.produtoId}-${linha.varianteId}-${i}`}>
              <strong className="tabular-nums">{quantidade(linha)}</strong> {linha.nome}
              {linha.variante && <span className="text-tinta-suave"> ({linha.variante})</span>}
              {linha.escolhas.length > 0 && <span className="text-tinta-suave"> · {linha.escolhas.join(", ")}</span>}
              {linha.notas && <span className="block text-sm text-tinta-suave">Nota: {linha.notas}</span>}
            </li>
          ))}
        </ul>

        {pedido.observacoes && (
          <p className="mt-3 rounded-xl bg-tinta/5 px-3 py-2 text-sm">
            <strong>Observações:</strong> {pedido.observacoes}
          </p>
        )}

        {/* Num cancelado, o pagamento risca-se com o resto: um «PAGO» por riscar
            lia-se como um pedido a entregar. O reembolso vê-se na gestão (#49). */}
        <p className={`titulo-display mt-4 text-xl ${falta > 0 ? "text-tijolo" : ""} ${cancelado ? "line-through" : ""}`}>
          {rotuloPagamento(pedido)}
        </p>

        {pedido.estado === "pago" && (
          <div className="mt-4">
            {confirmarFalta ? (
              /* ⚠️ Entregar sem cobrar o resto é o erro mais caro do balcão, e o mais
                 fácil numa hora de ponta. Pergunta primeiro. */
              <div className="rounded-xl border-2 border-tijolo p-4">
                <p className="font-semibold">Recebeu os {formatarCent(falta, "pt")} em falta?</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => entregarJa(true)} disabled={aEnviar} className={BOTAO_PRINCIPAL}>
                    Sim, recebi
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarFalta(false)}
                    disabled={aEnviar}
                    className={BOTAO_SECUNDARIO}
                  >
                    Ainda não
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (falta > 0 ? setConfirmarFalta(true) : entregarJa(false))}
                disabled={aEnviar}
                className={`${BOTAO_PRINCIPAL} min-h-14 w-full sm:w-auto sm:px-10`}
              >
                {aEnviar ? "A marcar…" : "Entregue"}
              </button>
            )}
          </div>
        )}
        <p role="alert" className="mt-2 text-sm font-semibold text-tijolo empty:hidden">
          {erro}
        </p>
      </div>
    </article>
  );
}
