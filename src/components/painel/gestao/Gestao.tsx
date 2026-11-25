"use client";

import { useState } from "react";
import type { AvisoAtencao, ConfiguracaoDaCasa, DefinicoesLoja, OrdemEmenta, Pedido, Produto } from "@/lib/dados/tipos";
import type { contarPorPreencher } from "@/lib/painel";
import { Atencao } from "./Atencao";
import { Definicoes } from "./Definicoes";
import { DetalhePedido } from "./DetalhePedido";
import { Equipa } from "./Equipa";
import { Horarios } from "./Horarios";
import { OrdemCategorias } from "./OrdemCategorias";
import { PedidosGestao } from "./PedidosGestao";
import { Produtos } from "./Produtos";

/**
 * # A gestão — o que a gerente vê por cima do balcão (`painel-gerente.md`)
 *
 * Desde a proposta de 25/11 já não tem separadores próprios: o `Balcao` põe a
 * pesquisa e os menus Produtos / Pedidos / Loja por cima de tudo, e isto
 * desenha a vista escolhida que não é do balcão. Tudo tem de funcionar num
 * telemóvel — é lá que a gerente vai preencher os produtos.
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
  /** Os nomes das categorias como o site os escreve, para a ordem (#87). */
  nomesCategorias: Record<string, string>;
};

export type VistaGestao =
  | "atencao"
  | "todos-pedidos"
  | "produtos"
  | "por-preencher"
  | "categorias"
  | "horarios"
  | "definicoes"
  | "equipa";

export function Gestao({
  dados,
  vista,
  procura,
  onRascunho,
}: {
  dados: DadosGestao;
  vista: VistaGestao;
  /** A pesquisa de cima, quando o menu aberto é o dos produtos. */
  procura: string;
  /** O nome do produto com alterações por guardar, ou `null`. */
  onRascunho: (nome: string | null) => void;
}) {
  /* Um pedido aberto a partir de «Precisa de atenção» ou da lista: o detalhe
     toma o lugar da vista, e «Voltar» devolve-a como estava. */
  const [aberto, setAberto] = useState<string | null>(null);
  if (aberto) return <DetalhePedido id={aberto} onVoltar={() => setAberto(null)} />;

  switch (vista) {
    case "atencao":
      return <Atencao avisos={dados.avisos} pedidos={dados.pedidosDosAvisos} porPreencher={dados.porPreencher} onAbrir={setAberto} />;
    case "todos-pedidos":
      return <PedidosGestao onAbrir={setAberto} />;
    case "produtos":
    case "por-preencher":
      return (
        <Produtos
          produtos={dados.produtos}
          ordem={dados.ordem}
          vistaInicial={vista === "por-preencher" ? "por-preencher" : "todos"}
          procura={procura}
          onRascunho={onRascunho}
        />
      );
    case "categorias":
      return <OrdemCategorias ordem={dados.ordem} produtos={dados.produtos} nomes={dados.nomesCategorias} />;
    case "horarios":
      return <Horarios casa={dados.casa} />;
    case "definicoes":
      return <Definicoes definicoes={dados.definicoes} />;
    case "equipa":
      return <Equipa />;
  }
}
