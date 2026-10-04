"use client";

import { useState } from "react";
import type { AvisoAtencao, ConfiguracaoDaCasa, DefinicoesLoja, OrdemEmenta, Pedido, Produto } from "@/lib/dados/tipos";
import type { contarPorPreencher } from "@/lib/painel";
import { Atencao } from "./Atencao";
import { Definicoes } from "./Definicoes";
import { DetalhePedido } from "./DetalhePedido";
import { Horarios } from "./Horarios";
import { PedidosGestao } from "./PedidosGestao";
import { Produtos } from "./Produtos";

/**
 * # A gestão — o que a gerente vê por cima do balcão (`painel-gerente.md`)
 *
 * Precisa de atenção, pedidos, produtos, horários, definições e equipa. Tudo
 * tem de funcionar num telemóvel — é lá que a gerente vai preencher os produtos.
 *
 * Só é desenhada para a gerente — e as ações recusam-na a quem não é, no
 * servidor: esconder isto ao balcão não é o que protege (regra 8).
 */

export type DadosGestao = {
  avisos: AvisoAtencao[];
  /** Os pedidos de que os avisos falam, para as decisões se tomarem ali mesmo. */
  pedidosDosAvisos: Record<string, Pedido>;
  porPreencher: ReturnType<typeof contarPorPreencher>;
  casa: ConfiguracaoDaCasa;
  definicoes: DefinicoesLoja;
  /** Todos, arquivados incluídos, para a edição de produtos. */
  produtos: Produto[];
  ordem: OrdemEmenta;
};

type Secao = "atencao" | "pedidos" | "produtos" | "horarios" | "definicoes" | "equipa";

export function Gestao({ dados }: { dados: DadosGestao }) {
  const atencao = dados.avisos.length;
  const [secao, setSecao] = useState<Secao>(atencao > 0 ? "atencao" : "pedidos");
  const [aberto, setAberto] = useState<string | null>(null);

  const abrir = (id: string) => {
    setAberto(id);
    setSecao("pedidos");
  };

  const secoes: { id: Secao; rotulo: string }[] = [
    { id: "atencao", rotulo: atencao > 0 ? `Precisa de atenção · ${atencao}` : "Precisa de atenção" },
    { id: "pedidos", rotulo: "Pedidos" },
    { id: "produtos", rotulo: "Produtos" },
    { id: "horarios", rotulo: "Horários" },
    { id: "definicoes", rotulo: "Definições" },
    { id: "equipa", rotulo: "Equipa" },
  ];

  return (
    <section aria-label="Gestão">
      <div role="tablist" aria-label="Gestão" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {secoes.map(({ id, rotulo }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={secao === id}
            onClick={() => {
              setSecao(id);
              setAberto(null);
            }}
            className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-semibold ${
              secao === id ? "bg-tijolo text-papel" : "border border-tinta/15 bg-papel"
            } ${id === "atencao" && atencao > 0 && secao !== id ? "border-tijolo text-tijolo" : ""}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {secao === "atencao" && <Atencao avisos={dados.avisos} pedidos={dados.pedidosDosAvisos} porPreencher={dados.porPreencher} onAbrir={abrir} />}
        {secao === "pedidos" &&
          (aberto ? <DetalhePedido id={aberto} onVoltar={() => setAberto(null)} /> : <PedidosGestao onAbrir={setAberto} />)}
        {secao === "produtos" && <Produtos produtos={dados.produtos} ordem={dados.ordem} />}
        {secao === "horarios" && <Horarios casa={dados.casa} />}
        {secao === "definicoes" && <Definicoes definicoes={dados.definicoes} />}
        {secao === "equipa" && (
          /* Mudar o PIN e terminar dispositivos pedem sessões na base de dados
             (#33): com a entrada provisória, uma sessão é um cookie assinado e
             não se termina à distância. Diz-se, em vez de um botão que não faz nada. */
          <div className="rounded-2xl border border-tinta/15 bg-papel p-6">
            <h3 className="titulo-display text-xl">Equipa e dispositivos</h3>
            <p className="mt-2 text-tinta-suave">
              Mudar o PIN da equipa e ver ou terminar os dispositivos com sessão chegam com a entrada verdadeira do
              painel. Até lá, «Esquecer este dispositivo», no topo, termina a sessão do aparelho onde se está.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
