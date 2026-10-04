"use client";

import type { AvisoAtencao } from "@/lib/dados/tipos";
import type { contarPorPreencher } from "@/lib/painel";

/**
 * O topo da gestão: o que espera pela gerente (`painel-gerente.md` › Precisa de
 * atenção). Só aparece quando há alguma coisa — vazio não ocupa o ecrã.
 */

const TEXTO: Record<AvisoAtencao["tipo"], string> = {
  "chegou-tarde": "Pago depois de expirar — a vaga pode já não existir",
  "possivel-duplicado": "Possível pedido duplicado — mesmo cliente, mesmos artigos, mesma hora",
  "dia-fechado": "Marcado para um dia que entretanto fechou",
  "reembolso-falhado": "O reembolso falhou",
  disputa: "Disputa aberta no Stripe",
  "apanhado-pela-verificacao": "Pagamento apanhado pela verificação (o aviso do Stripe não chegou)",
};

export function Atencao({
  avisos,
  porPreencher,
  onAbrir,
}: {
  avisos: AvisoAtencao[];
  porPreencher: ReturnType<typeof contarPorPreencher>;
  onAbrir: (pedidoId: string) => void;
}) {
  const faltaPreencher = porPreencher.produtos.length > 0;
  if (avisos.length === 0 && !faltaPreencher) {
    return <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Nada à espera da gerente.</p>;
  }
  return (
    <section aria-label="Precisa de atenção" className="space-y-3">
      {avisos.map((aviso) => {
        const ids = "pedidoIds" in aviso ? aviso.pedidoIds : [aviso.pedidoId];
        const refs = "referencias" in aviso ? aviso.referencias : [aviso.referencia];
        return (
          <div key={`${aviso.tipo}-${ids.join("-")}`} className="rounded-2xl border-2 border-tijolo bg-papel p-4">
            <p className="font-semibold">{TEXTO[aviso.tipo]}</p>
            {aviso.tipo === "dia-fechado" && <p className="text-sm text-tinta-suave">Dia {aviso.data}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {ids.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onAbrir(id)}
                  className="min-h-12 rounded-full border border-tinta/20 px-4 text-sm font-semibold tracking-wider"
                >
                  {refs[i]} →
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {faltaPreencher && (
        <div className="rounded-2xl border border-tinta/15 bg-papel p-4">
          <p className="font-semibold">Produtos por preencher</p>
          <p className="mt-1">
            {porPreencher.semFoto} sem foto · {porPreencher.semAlergenios} sem alergénios · {porPreencher.semTempo} sem
            tempo de produção
          </p>
          <p className="mt-1 text-sm text-tinta-suave">
            Sem alergénios respondidos um produto não vai à venda online. A edição de produtos chega na próxima etapa
            do painel.
          </p>
        </div>
      )}
    </section>
  );
}
