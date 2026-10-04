"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { tratar } from "@/app/painel/acoes-gestao";
import type { AvisoAtencao, AvisoTratavel, Pedido } from "@/lib/dados/tipos";
import type { contarPorPreencher } from "@/lib/painel";
import { diaPorExtenso } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { BOTAO, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";
import { Comparar } from "./Comparar";
import { Cancelar, MudarData } from "./Decisoes";

/**
 * O topo da gestão: o que espera pela gerente (`painel-gerente.md` › Precisa de
 * atenção) — **e o que ela pode fazer a cada coisa**. Um aviso que só se lê não
 * resolve nada: cada um traz as suas decisões, e o que ela decide tira-o da
 * lista (`pedidos.md` › Avisos tratados).
 */

const TEXTO: Record<AvisoAtencao["tipo"], { titulo: string; explicacao: string }> = {
  "chegou-tarde": {
    titulo: "Pago depois de expirar",
    explicacao: "O pagamento chegou depois de a reserva acabar: a vaga pode ter ido para outro pedido.",
  },
  "possivel-duplicado": {
    titulo: "Possível pedido duplicado",
    explicacao: "Mesmo cliente, mesmos artigos, mesma hora, pagos com minutos de diferença.",
  },
  "dia-fechado": {
    titulo: "Marcado para um dia que fechou",
    explicacao: "Fechar o dia não cancelou o pedido. Mude-o para outro dia, ou cancele.",
  },
  "reembolso-falhado": {
    titulo: "O reembolso falhou",
    explicacao: "O dinheiro não voltou ao cliente (sem saldo no Stripe?). Devolva-o por outra via.",
  },
  disputa: { titulo: "Disputa aberta no Stripe", explicacao: "Responda no Stripe dentro do prazo." },
  "apanhado-pela-verificacao": {
    titulo: "Pagamento apanhado pela verificação",
    explicacao: "O aviso do Stripe não chegou: o pedido entrou na mesma. Vale a pena ver porquê.",
  },
};

type Aberta = { pedidoId: string; acao: "data" | "cancelar" } | null;

export function Atencao({
  avisos,
  pedidos,
  porPreencher,
  onAbrir,
}: {
  avisos: AvisoAtencao[];
  /** Os pedidos de que os avisos falam, já lidos no servidor. */
  pedidos: Record<string, Pedido>;
  porPreencher: ReturnType<typeof contarPorPreencher>;
  onAbrir: (pedidoId: string) => void;
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState<Aberta>(null);
  const [comparar, setComparar] = useState<[Pedido, Pedido] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

  const darPorTratado = (id: string, tipo: AvisoTratavel) =>
    iniciar(async () => {
      const resultado = await tratar(id, tipo);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
    });

  if (comparar) return <Comparar a={comparar[0]} b={comparar[1]} onFechar={() => setComparar(null)} />;

  const faltaPreencher = porPreencher.produtos.length > 0;
  if (avisos.length === 0 && !faltaPreencher) {
    return <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Nada à espera da gerente.</p>;
  }

  return (
    <section aria-label="Precisa de atenção" className="space-y-3">
      {erro && <p className="font-semibold text-tijolo">{erro}</p>}
      {avisos.map((aviso) => {
        const texto = TEXTO[aviso.tipo];
        if (aviso.tipo === "possivel-duplicado") {
          const [a, b] = aviso.pedidoIds.map((id) => pedidos[id]);
          return (
            <article key={`dup-${aviso.pedidoIds.join("-")}`} className="rounded-2xl border-2 border-tijolo bg-papel p-4">
              <h3 className="font-semibold">{texto.titulo}</h3>
              <p className="text-sm text-tinta-suave">{texto.explicacao}</p>
              <p className="mt-1 text-sm">
                {aviso.referencias.join(" e ")}
                {a && ` · ${a.cliente.nome} · ${diaPorExtenso(a.levantamentoEm)}, ${horaDeLisboa(a.levantamentoEm)}`}
              </p>
              {a && b && (
                <button type="button" onClick={() => setComparar([a, b])} className={`${BOTAO_PRINCIPAL} mt-3`}>
                  Comparar lado a lado
                </button>
              )}
            </article>
          );
        }

        const pedido = pedidos[aviso.pedidoId];
        const tratavel = aviso.tipo !== "disputa" && aviso.tipo !== "apanhado-pela-verificacao";
        const aqui = aberta?.pedidoId === aviso.pedidoId;
        return (
          <article key={`${aviso.tipo}-${aviso.pedidoId}`} className="rounded-2xl border-2 border-tijolo bg-papel p-4">
            <h3 className="font-semibold">{texto.titulo}</h3>
            <p className="text-sm text-tinta-suave">{texto.explicacao}</p>
            {pedido && (
              <p className="mt-1 text-sm">
                {pedido.referencia} · {pedido.cliente.nome}
                {pedido.cliente.telefone && ` · ${pedido.cliente.telefone}`} · levanta {diaPorExtenso(pedido.levantamentoEm)},{" "}
                {horaDeLisboa(pedido.levantamentoEm)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {aviso.tipo === "chegou-tarde" && (
                <button type="button" disabled={aEnviar} onClick={() => darPorTratado(aviso.pedidoId, "chegou-tarde")} className={BOTAO_PRINCIPAL}>
                  Aceitar o pedido
                </button>
              )}
              {aviso.tipo === "reembolso-falhado" && (
                <button type="button" disabled={aEnviar} onClick={() => darPorTratado(aviso.pedidoId, "reembolso-falhado")} className={BOTAO_PRINCIPAL}>
                  Já devolvi por outra via
                </button>
              )}
              {pedido?.estado === "pago" && (aviso.tipo === "chegou-tarde" || aviso.tipo === "dia-fechado") && (
                <>
                  <button type="button" onClick={() => setAberta({ pedidoId: pedido.id, acao: "data" })} className={BOTAO_SECUNDARIO}>
                    Mudar a data
                  </button>
                  <button
                    type="button"
                    onClick={() => setAberta({ pedidoId: pedido.id, acao: "cancelar" })}
                    className={`${BOTAO} border border-tijolo text-tijolo`}
                  >
                    Cancelar e reembolsar
                  </button>
                </>
              )}
              {aviso.tipo === "dia-fechado" && tratavel && (
                <button type="button" disabled={aEnviar} onClick={() => darPorTratado(aviso.pedidoId, "dia-fechado")} className={BOTAO_SECUNDARIO}>
                  Manter neste dia
                </button>
              )}
              <button type="button" onClick={() => onAbrir(aviso.pedidoId)} className={`${BOTAO} underline underline-offset-4`}>
                Ver o pedido
              </button>
            </div>
            {pedido && aqui && aberta?.acao === "data" && <MudarData pedido={pedido} onFechar={() => setAberta(null)} onFeito={() => setAberta(null)} />}
            {pedido && aqui && aberta?.acao === "cancelar" && <Cancelar pedido={pedido} onFechar={() => setAberta(null)} onFeito={() => setAberta(null)} />}
          </article>
        );
      })}
      {faltaPreencher && (
        <div className="rounded-2xl border border-tinta/15 bg-papel p-4">
          <p className="font-semibold">Produtos por preencher</p>
          <p className="mt-1">
            {porPreencher.semFoto} sem foto · {porPreencher.semAlergenios} sem alergénios · {porPreencher.semTempo} sem
            tempo de produção
          </p>
          <p className="mt-1 text-sm text-tinta-suave">Sem alergénios respondidos, um produto não vai à venda online.</p>
        </div>
      )}
    </section>
  );
}
