"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { arquivo, desfazer } from "@/app/painel/acoes-balcao";
import type { Papel, Pedido } from "@/lib/dados/tipos";
import { diaPorExtenso } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { BOTAO, BOTAO_SECUNDARIO, MENSAGENS } from "./comum";

/**
 * O arquivo: entregues e cancelados, do mais recente para trás, página a página
 * (`robustez.md` › paginação). A gerente desfaz um «entregue» a qualquer
 * momento; o balcão só nos 5 minutos, pelo aviso.
 */
export function Arquivo({ papel }: { papel: Papel }) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [seguinte, setSeguinte] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, iniciar] = useTransition();

  const carregar = (cursor: string | null) =>
    iniciar(async () => {
      const resultado = await arquivo(cursor);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      setPedidos((atuais) => [...(cursor === null ? [] : (atuais ?? [])), ...resultado.valor.pedidos]);
      setSeguinte(resultado.valor.seguinte);
    });

  /* Carrega ao abrir o separador, e só aí: o arquivo não entra no polling. */
  useEffect(() => {
    carregar(null);
  }, []);

  const desfazerJa = (id: string) =>
    iniciar(async () => {
      const resultado = await desfazer(id);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
      const novo = await arquivo(null);
      if (novo.ok) {
        setPedidos(novo.valor.pedidos);
        setSeguinte(novo.valor.seguinte);
      }
    });

  if (pedidos === null) return <p className="text-tinta-suave">A carregar o arquivo…</p>;

  return (
    <section aria-label="Arquivo">
      {erro && <p className="mb-3 font-semibold text-tijolo">{erro}</p>}
      {pedidos.length === 0 ? (
        <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Ainda não há pedidos no arquivo.</p>
      ) : (
        <ul className="divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 mr-auto">
                <strong className="select-all tracking-wider">{p.referencia}</strong> · {p.cliente.nome}
                <span className="block text-sm text-tinta-suave">
                  {diaPorExtenso(p.levantamentoEm)}, {horaDeLisboa(p.levantamentoEm)}
                </span>
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                  p.estado === "cancelado" ? "bg-tijolo text-papel" : "bg-tinta/10"
                }`}
              >
                {p.estado === "cancelado" ? "Cancelado" : "Entregue"}
              </span>
              {papel === "gerente" && p.estado === "entregue" && (
                <button type="button" onClick={() => desfazerJa(p.id)} disabled={aCarregar} className={`${BOTAO} border border-tinta/20`}>
                  Desfazer entregue
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {seguinte && (
        <button type="button" onClick={() => carregar(seguinte)} disabled={aCarregar} className={`${BOTAO_SECUNDARIO} mt-4`}>
          {aCarregar ? "A carregar…" : "Mostrar mais"}
        </button>
      )}
    </section>
  );
}
