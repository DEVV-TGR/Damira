"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { desfazer, procurar, simularPedido } from "@/app/painel/acoes-balcao";
import type { Papel, Pedido } from "@/lib/dados/tipos";
import { diaDeLisboa, diaPorExtenso, novidades, type Balcao as SeparadoresDoBalcao } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { Gestao, type DadosGestao, type VistaGestao } from "../gestao/Gestao";
import { ListaCompacta } from "../gestao/ListaCompacta";
import { ICONES, MenusGerente, Migalhas, type Menu } from "../gestao/MenuGerente";
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
 * A gerente vê isto tudo e a gestão (`../gestao/Gestao.tsx`), arrumados em três
 * menus junto da pesquisa — Produtos, Pedidos, Loja (proposta de 25/11). Os
 * dias aparecem-lhe em lista compacta; o balcão continua com cartões grandes,
 * porque despacha e não procura.
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

type Vista = "hoje" | "produzir" | "proximos" | "arquivo" | "esgotados" | VistaGestao;

/* O alarme do talão que não saiu: insiste até alguém tratar (`impressao.md`). */
const ALARME_MS = 4000;
const CINCO_MINUTOS = 5 * 60_000;

const mapaDe = (pedidos: Pedido[]) => new Map(pedidos.map((p) => [p.id, p.estado]));

export function Balcao({ papel, pedidos, balcao, produtos, pausaAte, modoTeste, gestao }: Props) {
  const router = useRouter();
  const { tocar, atualizadoEm } = usePainel();
  /* A gerente com avisos por tratar abre neles; o resto abre no dia. */
  const [vista, setVista] = useState<Vista>(gestao && gestao.avisos.length > 0 ? "atencao" : "hoje");
  const [texto, setTexto] = useState("");
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Vista | null>(null);
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

  const ehGerente = gestao !== null;
  /* A pesquisa de cima procura produtos quando a lista de produtos está aberta,
     e pedidos em todo o resto — como no balcão. */
  const procuraProdutos = vista === "produtos" || vista === "por-preencher";
  const pesquisa = usePesquisaPedidos(procuraProdutos ? "" : texto);

  /* Mudar de vista com um produto a meio pede confirmação: o rascunho vive na
     ficha, e a ficha desmonta-se ao sair. */
  const navegar = (v: Vista) => {
    if (v === vista) return;
    if (rascunho) return setPendente(v);
    setVista(v);
    setTexto("");
  };

  const contagemHoje = balcao.levantamHoje.filter((p) => p.estado === "pago").length;
  const separadores: { id: Vista; rotulo: string }[] = [
    { id: "hoje", rotulo: `Levantam hoje · ${contagemHoje}` },
    { id: "produzir", rotulo: `Produzir hoje · ${balcao.produzirHoje.length}` },
    { id: "proximos", rotulo: `Próximos · ${balcao.proximos.length}` },
    { id: "arquivo", rotulo: "Arquivo" },
    { id: "esgotados", rotulo: "Esgotados" },
  ];

  const menus: Menu<Vista>[] = gestao
    ? [
        {
          id: "produtos",
          rotulo: "Produtos",
          icone: ICONES.produtos,
          itens: [
            { id: "produtos", rotulo: "Todos os produtos" },
            { id: "categorias", rotulo: "Famílias, categorias e secções" },
            { id: "bolos", rotulo: "Bolos personalizados" },
            { id: "por-preencher", rotulo: "Por preencher", contagem: gestao.porPreencher.produtos.length },
            { id: "esgotados", rotulo: "Esgotados" },
          ],
        },
        {
          id: "pedidos",
          rotulo: "Pedidos",
          icone: ICONES.pedidos,
          itens: [
            { id: "hoje", rotulo: "Levantam hoje", contagem: contagemHoje },
            { id: "produzir", rotulo: "Produzir hoje", contagem: balcao.produzirHoje.length },
            { id: "proximos", rotulo: "Próximos", contagem: balcao.proximos.length },
            { id: "todos-pedidos", rotulo: "Todos os pedidos" },
            { id: "arquivo", rotulo: "Arquivo" },
          ],
        },
        {
          id: "loja",
          rotulo: "Loja",
          icone: ICONES.loja,
          itens: [
            { id: "atencao", rotulo: "Precisa de atenção", contagem: gestao.avisos.length, alerta: gestao.avisos.length > 0 },
            { id: "horarios", rotulo: "Horários" },
            { id: "definicoes", rotulo: "Definições" },
            { id: "equipa", rotulo: "Equipa" },
          ],
        },
      ]
    : [];

  return (
    <>
      <Pausa pausaAte={pausaAte} />

      <div className={`mt-4 flex flex-col gap-3 ${ehGerente ? "sm:flex-row sm:items-center" : ""}`}>
        <CampoPesquisa
          texto={texto}
          onTexto={setTexto}
          rotulo={procuraProdutos ? "Procurar produto" : "Procurar por referência ou nome"}
        />
        {ehGerente && <MenusGerente menus={menus} vista={vista} onEscolher={navegar} />}
      </div>

      {pendente && rascunho && (
        <div role="alert" className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-tijolo bg-papel px-5 py-3 shadow-lg">
          <p className="mr-auto font-semibold">«{rascunho}» tem alterações por guardar.</p>
          <button type="button" onClick={() => setPendente(null)} className={BOTAO_SECUNDARIO}>
            Continuar a editar
          </button>
          <button
            type="button"
            onClick={() => {
              setRascunho(null);
              setPendente(null);
              setVista(pendente);
              setTexto("");
            }}
            className={`${BOTAO_SECUNDARIO} border-tijolo text-tijolo`}
          >
            Descartar e sair
          </button>
        </div>
      )}

      {pesquisa.ativa ? (
        <Resultados texto={texto} pesquisa={pesquisa} />
      ) : (
        <>
          {ehGerente ? (
            <Migalhas menus={menus} vista={vista} />
          ) : (
            <nav aria-label="Vistas" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div role="tablist" className="flex min-w-max gap-2">
                {separadores.map(({ id, rotulo }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={vista === id}
                    onClick={() => navegar(id)}
                    className={`premivel min-h-14 rounded-full px-5 text-sm font-semibold uppercase tracking-widest ${
                      vista === id ? "bg-tinta text-papel" : "border border-tinta/15 bg-papel"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </nav>
          )}

          <div role={ehGerente ? undefined : "tabpanel"} className={ehGerente ? "mt-4" : "mt-6"}>
            {erroAviso && <p className="mb-3 font-semibold text-tijolo">{erroAviso}</p>}
            {vista === "hoje" &&
              (ehGerente ? (
                <Compacta titulo="Levantam hoje" pedidos={balcao.levantamHoje} vazio="Sem pedidos para hoje" atualizadoEm={atualizadoEm}>
                  <ListaCompacta pedidos={balcao.levantamHoje} onEntregue={aoEntregar} rotuloDia={() => "Hoje"} />
                </Compacta>
              ) : (
                <Lista vazio="Sem pedidos para hoje" atualizadoEm={atualizadoEm}>
                  {balcao.levantamHoje.map((p) => (
                    <PedidoCartao key={p.id} pedido={p} destaque onEntregue={aoEntregar} />
                  ))}
                </Lista>
              ))}
            {vista === "produzir" && <Produzir balcao={balcao} atualizadoEm={atualizadoEm} />}
            {vista === "proximos" &&
              (ehGerente ? (
                <Compacta titulo="Próximos" pedidos={balcao.proximos} vazio="Sem pedidos para os próximos dias" atualizadoEm={atualizadoEm}>
                  <ListaCompacta pedidos={balcao.proximos} onEntregue={aoEntregar} rotuloDia={(p) => primeiraMaiuscula(diaPorExtenso(p.levantamentoEm))} />
                </Compacta>
              ) : (
                <Proximos pedidos={balcao.proximos} onEntregue={aoEntregar} atualizadoEm={atualizadoEm} />
              ))}
            {vista === "arquivo" && <Arquivo papel={papel} />}
            {vista === "esgotados" && <Esgotados produtos={produtos} />}
            {gestao && ehVistaGestao(vista) && (
              <Gestao key={vista} dados={gestao} vista={vista} procura={texto} onRascunho={setRascunho} />
            )}
          </div>
        </>
      )}

      {modoTeste && <Simulador />}
      <Avisos avisos={avisos} onFechar={fechar} onDesfazer={desfazerAviso} />
    </>
  );
}

const primeiraMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

const VISTAS_GESTAO: readonly VistaGestao[] = [
  "atencao",
  "todos-pedidos",
  "produtos",
  "por-preencher",
  "categorias",
  "bolos",
  "horarios",
  "definicoes",
  "equipa",
];
const ehVistaGestao = (v: Vista): v is VistaGestao => (VISTAS_GESTAO as readonly string[]).includes(v);

/** A lista compacta da gerente, com o título e a contagem por cima — ou o vazio, com a hora. */
function Compacta({
  titulo,
  pedidos,
  vazio,
  atualizadoEm,
  children,
}: {
  titulo: string;
  pedidos: Pedido[];
  vazio: string;
  atualizadoEm: Date;
  children: React.ReactNode;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">
        {vazio} · atualizado às {horaDeLisboa(atualizadoEm)}
      </p>
    );
  }
  return (
    <section aria-label={titulo}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="titulo-display text-2xl">{titulo}</h2>
        <p className="text-sm text-tinta-suave">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
        </p>
      </div>
      {children}
    </section>
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
 * resultados tomam o lugar das vistas.
 */
function CampoPesquisa({ texto, onTexto, rotulo }: { texto: string; onTexto: (t: string) => void; rotulo: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="painel-procura" className="sr-only">
        {rotulo}
      </label>
      <input
        id="painel-procura"
        type="search"
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        placeholder={rotulo}
        className="[&::-webkit-search-cancel-button]:appearance-none min-h-12 w-full rounded-full border border-tinta/20 bg-papel py-3 pl-5 pr-24 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      />
      {texto && (
        <button
          type="button"
          onClick={() => onTexto("")}
          className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded-full px-4 text-xs font-semibold uppercase tracking-widest hover:bg-tinta/5"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

type Pesquisa = { ativa: boolean; resultados: Pedido[] | null; erro: string | null };

function usePesquisaPedidos(texto: string): Pesquisa {
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

  return { ativa, resultados, erro };
}

function Resultados({ texto, pesquisa }: { texto: string; pesquisa: Pesquisa }) {
  return (
    <section aria-label="Resultados" className="mt-6">
      {pesquisa.erro && <p className="mb-3 font-semibold text-tijolo">{pesquisa.erro}</p>}
      {pesquisa.resultados === null ? (
        <p className="text-tinta-suave">A procurar…</p>
      ) : pesquisa.resultados.length === 0 ? (
        <p className="rounded-2xl border border-tinta/15 bg-papel p-8 text-tinta-suave">Nenhum pedido com «{texto.trim()}».</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pesquisa.resultados.map((p) => (
            <PedidoCartao key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </section>
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
