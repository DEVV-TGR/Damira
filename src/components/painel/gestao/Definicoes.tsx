"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gravarDefinicoes } from "@/app/painel/acoes-gestao";
import type { DefinicoesLoja } from "@/lib/dados/tipos";
import { paraCent } from "@/lib/painel";
import { BOTAO_PRINCIPAL, MENSAGENS } from "../balcao/comum";

/**
 * As definições da loja (`painel-gerente.md` › Definições): aceitar
 * cancelamentos pelo site, devolver o sinal ao cancelar, e o valor mínimo. As
 * duas primeiras vêm **desligadas** (`pedidos.md` › Cancelar): a casa decide o
 * que liga.
 */
export function Definicoes({ definicoes }: { definicoes: DefinicoesLoja }) {
  const router = useRouter();
  const [aceitar, setAceitar] = useState(definicoes.aceitarCancelamentosSite);
  const [devolver, setDevolver] = useState(definicoes.devolverSinalAoCancelar);
  const [minimo, setMinimo] = useState(
    definicoes.valorMinimoCent === null ? "" : (definicoes.valorMinimoCent / 100).toFixed(2).replace(".", ","),
  );
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aGravar, iniciar] = useTransition();

  const gravar = () =>
    iniciar(async () => {
      const valorMinimoCent = minimo.trim() === "" ? null : paraCent(minimo);
      if (minimo.trim() !== "" && valorMinimoCent === null) {
        return setMensagem({ ok: false, texto: "O valor mínimo escreve-se em euros, como 15 ou 12,50." });
      }
      const resultado = await gravarDefinicoes({
        aceitarCancelamentosSite: aceitar,
        devolverSinalAoCancelar: devolver,
        valorMinimoCent,
      });
      setMensagem(resultado.ok ? { ok: true, texto: "Gravado." } : { ok: false, texto: MENSAGENS[resultado.erro] });
      if (resultado.ok) router.refresh();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        gravar();
      }}
      className="space-y-4 rounded-2xl border border-tinta/15 bg-papel p-5"
    >
      <label className="flex min-h-12 items-start gap-3">
        <input type="checkbox" checked={aceitar} onChange={(e) => setAceitar(e.target.checked)} className="mt-1 size-5 accent-tijolo" />
        <span>
          <strong>Aceitar cancelamentos pelo site</strong>
          <span className="block text-sm text-tinta-suave">
            O cliente com conta cancela até à hora em que a produção tem de começar. Depois disso, liga para a loja.
          </span>
        </span>
      </label>
      <label className="flex min-h-12 items-start gap-3">
        <input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} className="mt-1 size-5 accent-tijolo" />
        <span>
          <strong>Devolver o sinal ao cancelar</strong>
          <span className="block text-sm text-tinta-suave">
            Desligado, um pedido com sinal cancelado pelo cliente não é reembolsado. Cada reembolso custa à casa a
            comissão do pagamento.
          </span>
        </span>
      </label>
      <label className="block">
        <strong>Valor mínimo das encomendas online</strong>
        <span className="block text-sm text-tinta-suave">Em branco, sem mínimo.</span>
        <span className="mt-2 flex items-center gap-2">
          <input
            inputMode="decimal"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            placeholder="0,00"
            className="w-32 rounded-xl border border-tinta/20 bg-papel px-3 py-3 text-right tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
          />
          <span>€</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={aGravar} className={`${BOTAO_PRINCIPAL} min-h-14 px-10`}>
          {aGravar ? "A gravar…" : "Gravar definições"}
        </button>
        {mensagem && (
          <p role="status" className={`font-semibold ${mensagem.ok ? "" : "text-tijolo"}`}>
            {mensagem.texto}
          </p>
        )}
      </div>
    </form>
  );
}
