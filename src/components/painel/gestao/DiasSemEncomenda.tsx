"use client";

import { useState } from "react";
import type { DiasSemEncomenda as Intervalo } from "@/lib/horarios";
import { diaDeLisboa } from "@/lib/painel";
import { BOTAO_SECUNDARIO } from "../balcao/comum";

const dataLegivel = (data: string) => data.split("-").reverse().join("/");

export function DiasSemEncomenda({ dias, aoMudar }: { dias: readonly Intervalo[]; aoMudar: (dias: Intervalo[]) => void }) {
  const [novo, setNovo] = useState({ de: "", ate: "" });
  const [hoje] = useState(() => diaDeLisboa(new Date()));
  const campo = "mt-1 block min-h-12 w-full min-w-0 rounded-xl border border-tinta/20 bg-papel px-3 py-2";
  return (
    <fieldset className="min-w-0 rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5">
      <legend className="px-1 text-base font-semibold">Dias em que não se encomenda</legend>
      <p className="text-sm text-tinta-suave">O produto continua no site, com uma nota. Nestes dias não se pode escolher para levantar. Os pedidos que já existem não mudam.</p>
      <ul className="mt-3 space-y-2">
        {dias.map((dia, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tabular-nums">{dataLegivel(dia.de)}{dia.ate !== dia.de ? ` a ${dataLegivel(dia.ate)}` : ""}</span>
            {dia.ate < hoje && <span className="text-tinta-suave">já passou</span>}
            <button type="button" onClick={() => aoMudar(dias.filter((_, j) => j !== i))} className="min-h-12 px-3 underline underline-offset-4">Tirar</button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="min-w-0 text-sm font-semibold">De<input type="date" value={novo.de} onChange={e => setNovo({ ...novo, de: e.target.value })} className={campo} /></label>
        <label className="min-w-0 text-sm font-semibold">Até <span className="font-normal text-tinta-suave">· opcional</span><input type="date" value={novo.ate} onChange={e => setNovo({ ...novo, ate: e.target.value })} className={campo} /></label>
        <button type="button" disabled={!novo.de} className={BOTAO_SECUNDARIO} onClick={() => {
          aoMudar([...dias, { de: novo.de, ate: novo.ate || novo.de }].sort((a, b) => a.de.localeCompare(b.de)));
          setNovo({ de: "", ate: "" });
        }}>Juntar</button>
      </div>
      <p className="mt-2 text-xs text-tinta-suave">Deixe «Até» vazio para marcar só um dia. As datas só mudam no site ao gravar o produto.</p>
    </fieldset>
  );
}
