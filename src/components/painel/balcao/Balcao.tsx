"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { desfazer, procurar, simularPedido } from "@/app/painel/acoes-balcao";
import type { Papel, Pedido } from "@/lib/dados/tipos";
import { diaDeLisboa, diaPorExtenso, novidades, type Balcao as SeparadoresDoBalcao } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { Gestao, type DadosGestao } from "../gestao/Gestao";
import { usePainel } from "../PainelAberto";
import { Arquivo } from "./Arquivo";
import { Avisos, type Aviso } from "./Avisos";
import { BOTAO_SECUNDARIO, MENSAGENS, quantidade } from "./comum";
import { Esgotados } from "./Esgotados";
import { Pausa } from "./Pausa";
import { PedidoCartao } from "./PedidoCartao";

/**
 * # A vista do balcão (`painel-balcao.md`)
 *
 * Os três separadores — **Levantam hoje**, **Produzir hoje**, **Próximos** —,
 * o arquivo, a pesquisa, os esgotados e a pausa. Os dados chegam do servidor
 * (`page.tsx`, com o `organizarBalcao`); quando a versão do polling muda, a
 * página volta a pedi-los, e é aqui que se vê o que mudou: **um pedido novo**
 * (som uma vez, e um aviso que fica até alguém lhe tocar) ou **um cancelado**
 * (som e aviso vermelho). Um talão que não saiu faz o alarme repetir-se.
 *
 * A gerente vê isto tudo e, por cima, a gestão (`../gestao/Gestao.tsx`).
 */

export type ProdutoDoBalcao = { id: string; nome: string; esgotadoHoje: boolean; foraDeVenda: boolean };

type Props = {
  papel: Papel;
  /** Os pedidos de hoje em diante (pagos, cancelados, entregues): é daqui que saem as novidades. */
  pedidos: Pedido[];
  balcao: SeparadoresDoBalcao;
  produtos: ProdutoDoBalcao[];
  pausaAte: Date | null;
  modoTeste: boolean;
  /** Só para a gerente: a página nem os pede para o balcão. */
  gestao: DadosGestao | null;
};

type Separador = "hoje" | "produzir" | "proximos" | "arquivo" | "esgotados" | "gestao";

/* O alarme do talão que não saiu: insiste até alguém tratar (`impressao.md`). */
const ALARME_MS = 4000;
const CINCO_MINUTOS = 5 * 60_000;

const mapaDe = (pedidos: Pedido[]) => new Map(pedidos.map((p) => [p.id, p.estado]));

export function Balcao({ papel, pedidos, balcao, produtos, pausaAte, modoTeste, gestao }: Props) {
  const router = useRouter();
  const { tocar, atualizadoEm } = usePainel();
  const [separador, setSeparador] = useState<Separador>("hoje");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [toques, setToques] = useState(0);

  /* O que mudou desde a última leitura. Compara-se ao desenhar, quando os
     pedidos chegam outros — e não num efeito — para o aviso aparecer na mesma
     passagem que a lista nova. Na primeira leitura não há nada de novo. */
  const [vistos, setVistos] = useState(() => ({ pedidos, mapa: mapaDe(pedidos) }));
  if (vistos.pedidos !== pedidos) {
    const { novos, cancelados } = novidades(vistos.mapa, pedidos);
    setVistos({ pedidos, mapa: mapaDe(pedidos) });
    if (novos.length > 0 || cancelados.length > 0) {
      setAvisos((atuais) => [
        ...atuais,
        ...novos.map((p): Aviso => ({ id: `novo-${p.id}`, tipo: p.impressoEm ? "novo" : "talao", pedido: p })),
        ...cancelados.map((p): Aviso => ({ id: `cancelado-${p.id}`, tipo: "cancelado", pedido: p })),
      ]);
      setToques((t) => t + 1);
    }
  }

  /* O som toca **uma vez** por leva de novidades. */
  useEffect(() => {
    if (toques > 0) tocar();
  }, [toques, tocar]);

  /* Com um talão por tratar, o alarme repete-se. */
  const talaoPorTratar = avisos.some((a) => a.tipo === "talao");
  useEffect(() => {
    if (!talaoPorTratar) return;
    const alarme = window.setInterval(tocar, ALARME_MS);
    return () => window.clearInterval(alarme);
  }, [talaoPorTratar, tocar]);

  /* O «Desfazer» de um entregue dura 5 minutos e depois sai sozinho. */
  const haEntregues = avisos.some((a) => a.tipo === "entregue");
  useEffect(() => {
    if (!haEntregues) return;
    const relogio = window.setInterval(() => {
      const agora = Date.now();
      setAvisos((atuais) => atuais.filter((a) => a.tipo !== "entregue" || a.ate > agora));
    }, 10_000);
    return () => window.clearInterval(relogio);
  }, [haEntregues]);

  const fechar = (id: string) => setAvisos((atuais) => atuais.filter((a) => a.id !== id));
  const aoEntregar = (p: Pedido) =>
    setAvisos((atuais) => [
      ...atuais.filter((a) => a.pedido.id !== p.id),
      { id: `entregue-${p.id}`, tipo: "entregue", pedido: p, ate: (p.entregueEm ?? new Date()).getTime() + CINCO_MINUTOS },
    ]);
  const [, iniciar] = useTransition();
  const [erroAviso, setErroAviso] = useState<string | null>(null);
  const desfazerAviso = (aviso: Aviso) =>
    iniciar(async () => {
      const resultado = await desfazer(aviso.pedido.id);
      fechar(aviso.id);
      if (!resultado.ok) setErroAviso(MENSAGENS[resultado.erro]);
      else router.refresh();
    });

  const separadores: { id: Separador; rotulo: string }[] = [
    { id: "hoje", rotulo: `Levantam hoje · ${balcao.levantamHoje.filter((p) => p.estado === "pago").length}` },
    { id: "produzir", rotulo: `Produzir hoje · ${balcao.produzirHoje.length}` },
    { id: "proximos", rotulo: `Próximos · ${balcao.proximos.length}` },
    { id: "arquivo", rotulo: "Arquivo" },
    { id: "esgotados", rotulo: "Esgotados" },
    ...(gestao ? [{ id: "gestao" as const, rotulo: gestao.avisos.length > 0 ? `Gestão · ${gestao.avisos.length} ⚠` : "Gestão" }] : []),
  ];

  return (
    <>
      <Pausa pausaAte={pausaAte} />
      <Pesquisa>
        <nav aria-label="Vistas" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" className="flex min-w-max gap-2">
            {separadores.map(({ id, rotulo }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={separador === id}
                onClick={() => setSeparador(id)}
                className={`min-h-12 rounded-full px-5 text-sm font-semibold uppercase tracking-widest ${
                  separador === id ? "bg-tinta text-papel" : "border border-tinta/15 bg-papel"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </nav>

        <div role="tabpanel" className="mt-6">
          {erroAviso && <p className="mb-3 font-semibold text-tijolo">{erroAviso}</p>}
          {separador === "hoje" && (
            <Lista vazio="Sem pedidos para hoje" atualizadoEm={atualizadoEm}>
              {balcao.levantamHoje.map((p) => (
                <PedidoCartao key={p.id} pedido={p} destaque onEntregue={aoEntregar} />
              ))}
            </Lista>
          )}
          {separador === "produzir" && <Produzir balcao={balcao} atualizadoEm={atualizadoEm} />}
          {separador === "proximos" && <Proximos pedidos={balcao.proximos} onEntregue={aoEntregar} atualizadoEm={atualizadoEm} />}
          {separador === "arquivo" && <Arquivo papel={papel} />}
          {separador === "esgotados" && <Esgotados produtos={produtos} />}
          {separador === "gestao" && gestao && <Gestao dados={gestao} />}
        </div>
      </Pesquisa>

      {modoTeste && <Simulador />}
      <Avisos avisos={avisos} onFechar={fechar} onDesfazer={desfazerAviso} />
    </>
  );
}

/* ⚠️ Vazio leva sempre a hora: uma lista vazia sem hora não distingue um dia
   calmo de um tablet desligado (`robustez.md` › Estados vazios). */
function Lista({ vazio, atualizadoEm, children }: { vazio: string; atualizadoEm: Date; children: React.ReactNode[] }) {
  if (children.length === 0) {
    return (
      <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">
        {vazio} · atualizado às {horaDeLisboa(atualizadoEm)}
      </p>
    );
  }
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Produzir({ balcao, atualizadoEm }: { balcao: SeparadoresDoBalcao; atualizadoEm: Date }) {
  return (
    <section aria-label="Produzir hoje">
      {balcao.semInicio.length > 0 && (
        /* Sem horário da cozinha ou sem tempo de um produto, não se sabe quando
           começar. Diz-se, em vez de os calar. */
        <p className="mb-4 rounded-2xl border-2 border-tijolo bg-papel p-4">
          <strong>Sem hora de início</strong> (falta o tempo de produção): {balcao.semInicio.join(", ")}
        </p>
      )}
      {balcao.produzirHoje.length === 0 ? (
        <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">
          Nada para começar hoje · atualizado às {horaDeLisboa(atualizadoEm)}
        </p>
      ) : (
        <ul className="divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
          {balcao.produzirHoje.map((item) => (
            <li key={`${item.produtoId}|${item.varianteId}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
              <span className="titulo-display text-2xl tabular-nums">
                {quantidade(item)}
              </span>
              <span className="mr-auto">
                <strong>{item.nome}</strong>
                {item.variante && <span className="text-tinta-suave"> ({item.variante})</span>}
                <span className="block text-sm text-tinta-suave">{item.referencias.join(" · ")}</span>
              </span>
              <span className="font-semibold">Começar até às {horaDeLisboa(item.comecaAte)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Proximos({
  pedidos,
  onEntregue,
  atualizadoEm,
}: {
  pedidos: Pedido[];
  onEntregue: (p: Pedido) => void;
  atualizadoEm: Date;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">
        Sem pedidos para os próximos dias · atualizado às {horaDeLisboa(atualizadoEm)}
      </p>
    );
  }
  /* Por dia de Lisboa, já ordenados pelo `organizarBalcao`. */
  const dias = new Map<string, Pedido[]>();
  for (const p of pedidos) dias.set(diaDeLisboa(p.levantamentoEm), [...(dias.get(diaDeLisboa(p.levantamentoEm)) ?? []), p]);
  return (
    <div className="space-y-8">
      {[...dias].map(([dia, doDia]) => (
        <section key={dia} aria-label={diaPorExtenso(doDia[0].levantamentoEm)}>
          <h2 className="titulo-display mb-3 text-2xl first-letter:uppercase">{diaPorExtenso(doDia[0].levantamentoEm)}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {doDia.map((p) => (
              <PedidoCartao key={p.id} pedido={p} onEntregue={onEntregue} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * A pesquisa por referência ou nome (`painel-balcao.md`): quem liga diz
 * «DAM-0309-4F7K» ou «é a encomenda da Marta». Com duas letras ou mais, os
 * resultados tomam o lugar dos separadores.
 */
function Pesquisa({ children }: { children: React.ReactNode }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ativa = texto.trim().length >= 2;

  useEffect(() => {
    if (!ativa) return;
    let vivo = true;
    /* Espera que se pare de escrever: uma pergunta por palavra, e não por letra. */
    const espera = window.setTimeout(async () => {
      const resultado = await procurar(texto.trim());
      if (!vivo) return;
      if (resultado.ok) {
        setResultados(resultado.valor.pedidos);
        setErro(null);
      } else setErro(MENSAGENS[resultado.erro]);
    }, 300);
    return () => {
      vivo = false;
      window.clearTimeout(espera);
    };
  }, [texto, ativa]);

  return (
    <>
      <div className="mt-4 flex gap-2">
        <label htmlFor="balcao-procura" className="sr-only">
          Procurar por referência ou nome
        </label>
        <input
          id="balcao-procura"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Procurar por referência ou nome"
          className="min-w-0 flex-1 rounded-full border border-tinta/20 bg-papel px-5 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
        />
        {texto && (
          <button type="button" onClick={() => setTexto("")} className={BOTAO_SECUNDARIO}>
            Limpar
          </button>
        )}
      </div>
      {ativa ? (
        <section aria-label="Resultados" className="mt-6">
          {erro && <p className="mb-3 font-semibold text-tijolo">{erro}</p>}
          {resultados === null ? (
            <p className="text-tinta-suave">A procurar…</p>
          ) : resultados.length === 0 ? (
            <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Nenhum pedido com «{texto.trim()}».</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {resultados.map((p) => (
                <PedidoCartao key={p.id} pedido={p} />
              ))}
            </div>
          )}
        </section>
      ) : (
        children
      )}
    </>
  );
}

/**
 * ⚠️ **Só no modo de teste.** Sem pagamentos (#42) não chega nenhum pedido
 * novo, e o som, o aviso e o talão que falha ficavam por experimentar.
 */
function Simulador() {
  const router = useRouter();
  const [aEnviar, iniciar] = useTransition();
  const simular = (talaoFalhou: boolean) =>
    iniciar(async () => {
      await simularPedido(talaoFalhou);
      router.refresh();
    });
  return (
    <aside className="mt-10 rounded-2xl border-2 border-dashed border-tinta/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">Modo de teste</p>
      <p className="mt-1 text-sm text-tinta-suave">Um pedido pago a chegar agora, como se viesse do site.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => simular(false)} disabled={aEnviar} className={BOTAO_SECUNDARIO}>
          Simular pedido novo
        </button>
        <button type="button" onClick={() => simular(true)} disabled={aEnviar} className={BOTAO_SECUNDARIO}>
          Simular com o talão a falhar
        </button>
      </div>
    </aside>
  );
}
