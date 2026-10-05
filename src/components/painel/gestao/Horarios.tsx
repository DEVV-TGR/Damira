"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gravarHorarios } from "@/app/painel/acoes-gestao";
import type { ConfiguracaoDaCasa } from "@/lib/dados/tipos";
import type { DiaDaSemana, Intervalo } from "@/lib/horarios";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * Os horários (`painel-gerente.md` › Horários, `horarios.md`): loja e cozinha
 * por dia da semana, dias fechados, tamanho da vaga, limite por vaga, até
 * quantos dias à frente e os degraus das cores do calendário.
 *
 * ⚠️ **O calendário lê isto sem mudar código** (#36): gravar aqui é o que a loja
 * passa a mostrar. A validação está no servidor (`EsquemaHorarios`); aqui só se
 * marca o campo que ele recusou. Fechar um dia **não cancela** os pedidos que já
 * existem para ele — aparecem em «Precisa de atenção».
 */

const DIAS: { dia: DiaDaSemana; nome: string }[] = [
  { dia: "segunda", nome: "Segunda" },
  { dia: "terca", nome: "Terça" },
  { dia: "quarta", nome: "Quarta" },
  { dia: "quinta", nome: "Quinta" },
  { dia: "sexta", nome: "Sexta" },
  { dia: "sabado", nome: "Sábado" },
  { dia: "domingo", nome: "Domingo" },
];

const CAMPOS: Record<string, string> = {
  loja: "o horário da loja",
  cozinha: "o horário da cozinha",
  diasFechados: "os dias fechados",
  duracaoVagaMinutos: "o tamanho da vaga",
  limitePorVaga: "o limite por vaga",
  diasAFrente: "os dias à frente",
  limiaresAfluencia: "as cores do calendário (o verde tem de acabar antes do amarelo)",
};

const campo =
  "rounded-xl border border-tinta/20 bg-papel px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";

type Semana = Record<DiaDaSemana, Intervalo[]>;

export function Horarios({ casa }: { casa: ConfiguracaoDaCasa }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState(() => structuredClone(casa) as ConfiguracaoDaCasa & { loja: Semana; cozinha: Semana | null });
  const [novoFecho, setNovoFecho] = useState({ data: "", fecha: "ambas" as "ambas" | "loja" | "cozinha" });
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aGravar, iniciar] = useTransition();

  const gravar = () =>
    iniciar(async () => {
      const resultado = await gravarHorarios(rascunho);
      if (resultado.ok) {
        setMensagem({ ok: true, texto: "Gravado. O calendário do site já usa este horário." });
        router.refresh();
        return;
      }
      const campos = (resultado.campos ?? []).map((c) => CAMPOS[c] ?? c);
      setMensagem({
        ok: false,
        texto: campos.length > 0 ? `Confira ${campos.join(", ")}.` : MENSAGENS[resultado.erro],
      });
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        gravar();
      }}
      className="space-y-6"
    >
      <Semanal
        titulo="Loja"
        explicacao="Quando se levanta. Só aqui há vagas no calendário."
        semana={rascunho.loja}
        onMudar={(loja) => setRascunho({ ...rascunho, loja })}
      />

      {rascunho.cozinha === null ? (
        <div className="rounded-2xl border-2 border-dashed border-tinta/30 p-5">
          <h3 className="titulo-display text-xl">Cozinha</h3>
          <p className="mt-1 text-tinta-suave">
            Sem horário da cozinha, o calendário oferece as horas da loja como «a confirmar».
          </p>
          <button type="button" onClick={() => setRascunho({ ...rascunho, cozinha: structuredClone(rascunho.loja) })} className={`${BOTAO_SECUNDARIO} mt-3`}>
            Definir, a partir do da loja
          </button>
        </div>
      ) : (
        <Semanal
          titulo="Cozinha"
          explicacao="Quando se produz. É o que conta para o tempo de produção."
          semana={rascunho.cozinha}
          onMudar={(cozinha) => setRascunho({ ...rascunho, cozinha })}
        />
      )}

      <fieldset className="min-w-0 rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5">
        <legend className="titulo-display px-1 text-xl">Dias fechados</legend>
        <p className="text-sm text-tinta-suave">Feriados e férias. Fechar um dia não cancela os pedidos que já há para ele.</p>
        <ul className="mt-3 space-y-2">
          {rascunho.diasFechados.map((d, i) => (
            <li key={`${d.data}-${d.fecha}`} className="flex flex-wrap items-center gap-3">
              <span className="tabular-nums">{d.data}</span>
              <span className="text-tinta-suave">{d.fecha === "ambas" ? "loja e cozinha" : d.fecha}</span>
              <button
                type="button"
                onClick={() => setRascunho({ ...rascunho, diasFechados: rascunho.diasFechados.filter((_, j) => j !== i) })}
                className="min-h-12 px-3 text-sm underline underline-offset-4"
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">
            Dia
            <input type="date" value={novoFecho.data} onChange={(e) => setNovoFecho({ ...novoFecho, data: e.target.value })} className={`${campo} mt-1 block`} />
          </label>
          <label className="text-sm font-semibold">
            Fecha
            <select value={novoFecho.fecha} onChange={(e) => setNovoFecho({ ...novoFecho, fecha: e.target.value as typeof novoFecho.fecha })} className={`${campo} mt-1 block`}>
              <option value="ambas">Loja e cozinha</option>
              <option value="loja">Só a loja</option>
              <option value="cozinha">Só a cozinha</option>
            </select>
          </label>
          <button
            type="button"
            disabled={novoFecho.data === ""}
            onClick={() => {
              setRascunho({ ...rascunho, diasFechados: [...rascunho.diasFechados, novoFecho].sort((a, b) => a.data.localeCompare(b.data)) });
              setNovoFecho({ ...novoFecho, data: "" });
            }}
            className={BOTAO_SECUNDARIO}
          >
            Juntar
          </button>
        </div>
      </fieldset>

      {/* ⚠️ `min-w-0`: um `<fieldset>` tem, por defeito, a largura mínima do que leva
          dentro, e a 320 px a linha das cores esticava a página (armadilha 16). */}
      <fieldset className="grid min-w-0 gap-4 rounded-2xl border border-tinta/15 bg-papel p-4 sm:grid-cols-2 sm:p-5">
        <legend className="titulo-display px-1 text-xl">Vagas e calendário</legend>
        <label className="text-sm font-semibold">
          Tamanho da vaga
          <select
            value={rascunho.duracaoVagaMinutos}
            onChange={(e) => setRascunho({ ...rascunho, duracaoVagaMinutos: Number(e.target.value) })}
            className={`${campo} mt-1 block w-full`}
          >
            {[15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Até quantos dias à frente
          <input
            type="number"
            min={0}
            max={365}
            value={rascunho.diasAFrente}
            onChange={(e) => setRascunho({ ...rascunho, diasAFrente: Number(e.target.value) })}
            className={`${campo} mt-1 block w-full`}
          />
        </label>
        <div className="text-sm font-semibold">
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={rascunho.limitePorVaga !== null}
              onChange={(e) => setRascunho({ ...rascunho, limitePorVaga: e.target.checked ? 4 : null })}
              className="size-5 accent-tijolo"
            />
            Limitar pedidos por vaga
          </label>
          {rascunho.limitePorVaga !== null && (
            <input
              type="number"
              min={1}
              aria-label="Pedidos por vaga"
              value={rascunho.limitePorVaga}
              onChange={(e) => setRascunho({ ...rascunho, limitePorVaga: Number(e.target.value) })}
              className={`${campo} mt-1 block w-full`}
            />
          )}
          <span className="mt-1 block font-normal text-tinta-suave">Sem limite, o calendário não tem cores.</span>
        </div>
        <div className="text-sm font-semibold">
          Cores do calendário (% do limite)
          <div className="mt-1 flex flex-wrap items-center gap-2 font-normal">
            <span>verde até</span>
            <input
              type="number"
              min={0}
              max={100}
              aria-label="Verde até"
              value={rascunho.limiaresAfluencia.livre}
              onChange={(e) => setRascunho({ ...rascunho, limiaresAfluencia: { ...rascunho.limiaresAfluencia, livre: Number(e.target.value) } })}
              className={`${campo} w-20`}
            />
            <span>amarelo até</span>
            <input
              type="number"
              min={0}
              max={100}
              aria-label="Amarelo até"
              value={rascunho.limiaresAfluencia.media}
              onChange={(e) => setRascunho({ ...rascunho, limiaresAfluencia: { ...rascunho.limiaresAfluencia, media: Number(e.target.value) } })}
              className={`${campo} w-20`}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={aGravar} className={`${BOTAO_PRINCIPAL} min-h-14 px-10`}>
          {aGravar ? "A gravar…" : "Gravar horários"}
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

function Semanal({
  titulo,
  explicacao,
  semana,
  onMudar,
}: {
  titulo: string;
  explicacao: string;
  semana: Semana;
  onMudar: (semana: Semana) => void;
}) {
  const mudarDia = (dia: DiaDaSemana, periodos: Intervalo[]) => onMudar({ ...semana, [dia]: periodos });
  return (
    <fieldset className="rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5">
      <legend className="titulo-display px-1 text-xl">{titulo}</legend>
      <p className="text-sm text-tinta-suave">{explicacao}</p>
      <ul className="mt-3 divide-y divide-tinta/10">
        {DIAS.map(({ dia, nome }) => (
          <li key={dia} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-3">
            <span className="w-full font-semibold sm:w-20">{nome}</span>
            {semana[dia].length === 0 && <span className="text-tinta-suave">Fechado</span>}
            {semana[dia].map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  aria-label={`${nome}, abre`}
                  value={p.abre}
                  onChange={(e) => mudarDia(dia, semana[dia].map((q, j) => (j === i ? { ...q, abre: e.target.value } : q)))}
                  className={`${campo} w-[5.75rem] px-2 tabular-nums`}
                />
                <span aria-hidden>–</span>
                <input
                  type="time"
                  aria-label={`${nome}, fecha`}
                  value={p.fecha}
                  onChange={(e) => mudarDia(dia, semana[dia].map((q, j) => (j === i ? { ...q, fecha: e.target.value } : q)))}
                  className={`${campo} w-[5.75rem] px-2 tabular-nums`}
                />
                <button
                  type="button"
                  aria-label={`Tirar o período das ${p.abre} de ${nome}`}
                  onClick={() => mudarDia(dia, semana[dia].filter((_, j) => j !== i))}
                  className="min-h-12 min-w-10 text-xl"
                >
                  ×
                </button>
              </span>
            ))}
            {semana[dia].length < 4 && (
              <button
                type="button"
                onClick={() => mudarDia(dia, [...semana[dia], { abre: semana[dia].at(-1)?.fecha ?? "08:00", fecha: "18:00" }])}
                className="min-h-12 px-2 text-sm underline underline-offset-4"
              >
                {semana[dia].length === 0 ? "Abrir" : "+ período"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
