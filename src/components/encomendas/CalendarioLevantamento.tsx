"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { VagaDoCalendario } from "@/lib/vagas-servidor";

/**
 * # O calendário de levantamento
 *
 * Os dias com vagas numa fila, e as horas do dia escolhido em botões. **Não
 * calcula nada**: as vagas chegam do servidor (`consultarVagas`), já com a data
 * e a hora de Lisboa escritas — o horário da casa e os tempos dos produtos não
 * estão aqui, nem podiam estar, porque a gerente os muda no painel.
 *
 * ⚠️ **Sempre a hora de Lisboa, também em inglês** (`horarios.md`). Um cliente em
 * Londres que lesse «10:00» na hora dele chegava uma hora antes de o bolo estar
 * pronto. Os rótulos dos dias formatam-se com o fuso explícito, e a nota por
 * baixo di-lo por extenso.
 *
 * ⚠️ **As horas cheias ficam riscadas, não escondidas.** Um dia que parece vazio
 * de manhã lê-se como «não abrem de manhã»; riscado lê-se como «já está
 * ocupado».
 */
export function CalendarioLevantamento({
  vagas,
  escolhida,
  aoEscolher,
  locale,
  telefone,
}: {
  vagas: VagaDoCalendario[];
  escolhida: string | null;
  aoEscolher: (vaga: VagaDoCalendario) => void;
  locale: Locale;
  telefone: string | null;
}) {
  const t = useTranslations("encomendas.calendario");

  const dias = useMemo(() => {
    const porDia = new Map<string, VagaDoCalendario[]>();
    for (const vaga of vagas) porDia.set(vaga.data, [...(porDia.get(vaga.data) ?? []), vaga]);
    return [...porDia].map(([data, doDia]) => ({ data, vagas: doDia, livres: doDia.some((v) => v.livre) }));
  }, [vagas]);

  const diaDaEscolhida = vagas.find((v) => v.inicio === escolhida)?.data ?? null;
  const [aberto, setAberto] = useState<string | null>(
    () => diaDaEscolhida ?? dias.find((d) => d.livres)?.data ?? null,
  );
  const dia = dias.find((d) => d.data === (diaDaEscolhida ?? aberto)) ?? null;

  const rotulo = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        timeZone: "Europe/Lisbon",
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [locale],
  );
  const extenso = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        timeZone: "Europe/Lisbon",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  if (!dias.some((d) => d.livres)) {
    return (
      <p className="rounded-xl border border-papel/25 px-5 py-4 text-sm sm:col-span-2">
        {t("semVagas")}{" "}
        {telefone && (
          <a href={`tel:${telefone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
            {telefone}
          </a>
        )}
      </p>
    );
  }

  return (
    <fieldset className="grid gap-4 sm:col-span-2">
      <legend className="text-sm font-semibold">{t("titulo")}</legend>

      {/* Os dias: uma fila que se arrasta no telemóvel. Um dia sem nenhuma vaga
          livre aparece apagado, para a fila não saltar dias sem explicação. */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {dias.map((d) => {
          const activo = d.data === dia?.data;
          return (
            <button
              key={d.data}
              type="button"
              disabled={!d.livres}
              aria-pressed={activo}
              onClick={() => setAberto(d.data)}
              className={`premivel min-h-11 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm tabular-nums disabled:opacity-35 ${
                activo ? "border-papel bg-papel text-tinta" : "border-papel/25 hover:border-papel"
              }`}
            >
              {rotulo.format(new Date(d.vagas[0].inicio))}
            </button>
          );
        })}
      </div>

      {dia && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {dia.vagas.map((vaga) => {
            const marcada = vaga.inicio === escolhida;
            return (
              <button
                key={vaga.inicio}
                type="button"
                disabled={!vaga.livre}
                aria-pressed={marcada}
                aria-label={vaga.livre ? vaga.hora : `${vaga.hora} — ${t("cheia")}`}
                onClick={() => aoEscolher(vaga)}
                className={`premivel min-h-11 rounded-lg border-2 text-sm font-semibold tabular-nums disabled:line-through disabled:opacity-35 ${
                  marcada ? "border-papel bg-papel text-tinta" : "border-papel/25 hover:border-papel"
                }`}
              >
                {vaga.hora}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm text-papel/75" aria-live="polite">
        {escolhida ? t("escolhido", { quando: extenso.format(new Date(escolhida)) }) : t("escolha")}{" "}
        {t("horaDeLisboa")}
      </p>
    </fieldset>
  );
}
