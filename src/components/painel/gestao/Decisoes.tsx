"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cancelar, horasParaMudar, reagendar, reembolsar } from "@/app/painel/acoes-gestao";
import type { Pedido } from "@/lib/dados/tipos";
import { diaDeLisboa, diaPorExtenso, paraCent, porDevolverCent } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { BOTAO, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # As decisões da gerente sobre um pedido (`pedidos.md`)
 *
 * Mudar o levantamento, cancelar com o reembolso escolhido, reembolsar parte.
 * Servem o «Precisa de atenção» e o detalhe do pedido. Cada uma **pede
 * confirmação a dizer o que vai acontecer** — com o valor, quando há dinheiro —,
 * porque um cancelamento não se desfaz e o balcão é avisado logo.
 */

/* Sem pagamentos online, nenhum dinheiro sai: diz-se, para ninguém julgar o
   cliente reembolsado. */
const NOTA_REEMBOLSO = "Até aos pagamentos online, o reembolso só fica registado — não sai dinheiro.";

type Feito = (pedido: Pedido) => void;

function useAcao(onFeito?: Feito) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();
  const correr = (acao: () => Promise<{ ok: true; valor: Pedido } | { ok: false; erro: keyof typeof MENSAGENS }>) =>
    iniciar(async () => {
      setErro(null);
      const resultado = await acao();
      if (!resultado.ok) {
        setErro(MENSAGENS[resultado.erro]);
        if (resultado.erro === "estado-mudou") router.refresh();
        return;
      }
      onFeito?.(resultado.valor);
      router.refresh();
    });
  return { erro, setErro, aEnviar, correr };
}

export function MudarData({ pedido, onFeito, onFechar }: { pedido: Pedido; onFeito?: Feito; onFechar: () => void }) {
  const [data, setData] = useState(() => diaDeLisboa(pedido.levantamentoEm));
  const [horas, setHoras] = useState<{ inicio: string; hora: string; livre: boolean }[] | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const { erro, aEnviar, correr } = useAcao(onFeito);

  useEffect(() => {
    let vivo = true;
    void horasParaMudar(data).then((h) => {
      if (vivo) {
        setHoras(h);
        setEscolhida(null);
      }
    });
    return () => {
      vivo = false;
    };
  }, [data]);

  return (
    <div className="mt-3 rounded-2xl border border-tinta/15 bg-papel-fundo p-4">
      <p className="font-semibold">Mudar o levantamento</p>
      <p className="text-sm text-tinta-suave">
        Agora: {diaPorExtenso(pedido.levantamentoEm)}, {horaDeLisboa(pedido.levantamentoEm)}. Avise o cliente da nova hora.
      </p>
      <label className="mt-3 block text-sm font-semibold">
        Dia
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="mt-1 block rounded-xl border border-tinta/20 bg-papel px-3 py-3"
        />
      </label>
      {horas === null ? (
        <p className="mt-3 text-tinta-suave">A ver as horas…</p>
      ) : horas.length === 0 ? (
        <p className="mt-3 text-tinta-suave">Neste dia a loja está fechada, ou as horas já passaram.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Hora">
          {horas.map((h) => (
            <button
              key={h.inicio}
              type="button"
              role="radio"
              aria-checked={escolhida === h.inicio}
              disabled={!h.livre}
              onClick={() => setEscolhida(h.inicio)}
              className={`min-h-11 min-w-16 rounded-xl border px-3 tabular-nums ${
                escolhida === h.inicio ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-papel"
              } disabled:line-through disabled:opacity-40`}
            >
              {h.hora}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={escolhida === null || aEnviar}
          onClick={() => escolhida && correr(() => reagendar(pedido.id, escolhida))}
          className={BOTAO_PRINCIPAL}
        >
          {escolhida ? `Mudar para as ${horaDeLisboa(new Date(escolhida))}` : "Escolha a hora"}
        </button>
        <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
          Não mudar
        </button>
      </div>
      {erro && <p className="mt-2 font-semibold text-tijolo">{erro}</p>}
    </div>
  );
}

/**
 * Cancelar com o reembolso escolhido: tudo, nada (um bolo já feito pode não se
 * devolver) ou um valor.
 */
export function Cancelar({ pedido, onFeito, onFechar }: { pedido: Pedido; onFeito?: Feito; onFechar: () => void }) {
  const maximo = porDevolverCent(pedido);
  const [modo, setModo] = useState<"total" | "nada" | "parte">(maximo > 0 ? "total" : "nada");
  const [parte, setParte] = useState("");
  const { erro, setErro, aEnviar, correr } = useAcao(onFeito);
  const valor = modo === "total" ? maximo : modo === "nada" ? 0 : paraCent(parte);

  const confirmar = () => {
    if (valor === null || valor > maximo) {
      return setErro(`O reembolso vai de 0 a ${formatarCent(maximo, "pt")}.`);
    }
    correr(() => cancelar(pedido.id, valor));
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-tijolo bg-papel p-4">
      <p className="font-semibold">Cancelar o {pedido.referencia}</p>
      <p className="text-sm text-tinta-suave">
        O balcão é avisado e sai o talão de cancelamento. Não se desfaz.
      </p>
      {maximo > 0 && (
        <fieldset className="mt-3 space-y-2">
          <legend className="text-sm font-semibold">Reembolso</legend>
          {(
            [
              ["total", `Tudo — ${formatarCent(maximo, "pt")}`],
              ["parte", "Uma parte"],
              ["nada", "Nada"],
            ] as const
          ).map(([id, rotulo]) => (
            <label key={id} className="flex min-h-11 items-center gap-3">
              <input type="radio" name={`reembolso-${pedido.id}`} checked={modo === id} onChange={() => setModo(id)} className="size-5 accent-tijolo" />
              {rotulo}
            </label>
          ))}
          {modo === "parte" && (
            <span className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={parte}
                onChange={(e) => setParte(e.target.value)}
                placeholder="0,00"
                aria-label="Valor a reembolsar"
                className="w-32 rounded-xl border border-tinta/20 bg-papel px-3 py-3 text-right tabular-nums"
              />
              €
            </span>
          )}
          <p className="text-xs text-tinta-suave">{NOTA_REEMBOLSO}</p>
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={aEnviar} onClick={confirmar} className={`${BOTAO} bg-tijolo text-papel`}>
          {valor ? `Cancelar e reembolsar ${formatarCent(valor, "pt")}` : "Cancelar sem reembolso"}
        </button>
        <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
          Não cancelar
        </button>
      </div>
      {erro && <p className="mt-2 font-semibold text-tijolo">{erro}</p>}
    </div>
  );
}

/** Reembolsar parte, sem cancelar — um artigo que faltou, uma queixa. */
export function Reembolsar({ pedido, onFeito, onFechar }: { pedido: Pedido; onFeito?: Feito; onFechar: () => void }) {
  const maximo = porDevolverCent(pedido);
  const [texto, setTexto] = useState("");
  const { erro, setErro, aEnviar, correr } = useAcao(onFeito);
  const valor = paraCent(texto);

  return (
    <div className="mt-3 rounded-2xl border border-tinta/15 bg-papel-fundo p-4">
      <p className="font-semibold">Reembolsar sem cancelar</p>
      <p className="text-sm text-tinta-suave">Pode devolver até {formatarCent(maximo, "pt")}.</p>
      <span className="mt-3 flex items-center gap-2">
        <input
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="0,00"
          aria-label="Valor a reembolsar"
          className="w-32 rounded-xl border border-tinta/20 bg-papel px-3 py-3 text-right tabular-nums"
        />
        €
      </span>
      <p className="mt-2 text-xs text-tinta-suave">{NOTA_REEMBOLSO}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={aEnviar}
          onClick={() =>
            valor === null || valor === 0 || valor > maximo
              ? setErro(`Escreva um valor entre 0,01 € e ${formatarCent(maximo, "pt")}.`)
              : correr(() => reembolsar(pedido.id, valor))
          }
          className={BOTAO_PRINCIPAL}
        >
          {valor ? `Reembolsar ${formatarCent(valor, "pt")}` : "Reembolsar"}
        </button>
        <button type="button" onClick={onFechar} className={BOTAO_SECUNDARIO}>
          Fechar
        </button>
      </div>
      {erro && <p className="mt-2 font-semibold text-tijolo">{erro}</p>}
    </div>
  );
}

/**
 * Os botões de decisão de um pedido, com o painel de cada um a abrir por baixo.
 * Só mostra o que o estado deixa: mudar a data e cancelar num pago; reembolsar
 * enquanto houver o que devolver.
 */
export function DecisoesDoPedido({ pedido, onFeito }: { pedido: Pedido; onFeito?: Feito }) {
  const [aberta, setAberta] = useState<"data" | "cancelar" | "reembolsar" | null>(null);
  const feito = (p: Pedido) => {
    setAberta(null);
    onFeito?.(p);
  };
  const podeReembolsar = porDevolverCent(pedido) > 0 && ["pago", "entregue", "cancelado"].includes(pedido.estado);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {pedido.estado === "pago" && (
          <button type="button" onClick={() => setAberta("data")} className={BOTAO_SECUNDARIO}>
            Mudar a data
          </button>
        )}
        {podeReembolsar && pedido.estado !== "pago" && (
          <button type="button" onClick={() => setAberta("reembolsar")} className={BOTAO_SECUNDARIO}>
            Reembolsar
          </button>
        )}
        {pedido.estado === "pago" && podeReembolsar && (
          <button type="button" onClick={() => setAberta("reembolsar")} className={BOTAO_SECUNDARIO}>
            Reembolsar parte
          </button>
        )}
        {pedido.estado === "pago" && (
          <button type="button" onClick={() => setAberta("cancelar")} className={`${BOTAO} border border-tijolo text-tijolo`}>
            Cancelar
          </button>
        )}
      </div>
      {aberta === "data" && <MudarData pedido={pedido} onFeito={feito} onFechar={() => setAberta(null)} />}
      {aberta === "cancelar" && <Cancelar pedido={pedido} onFeito={feito} onFechar={() => setAberta(null)} />}
      {aberta === "reembolsar" && <Reembolsar pedido={pedido} onFeito={feito} onFechar={() => setAberta(null)} />}
    </div>
  );
}
