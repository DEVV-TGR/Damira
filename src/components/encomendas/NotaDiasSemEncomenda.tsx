"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DiasSemEncomenda } from "@/lib/horarios";
import { partesDosDiasSemEncomenda, type PartesDiasSemEncomenda } from "@/lib/dias-sem-encomenda";
import type { Locale } from "@/i18n/routing";

/** As páginas são estáticas; o dia de Lisboa tem de ser o de quem as abre. */
export function NotaDiasSemEncomenda({ intervalos, diasAFrente, locale }: {
  intervalos: readonly DiasSemEncomenda[]; diasAFrente: number; locale: Locale;
}) {
  const t = useTranslations("produto");
  const [partes, setPartes] = useState<PartesDiasSemEncomenda | null>(null);
  useEffect(() => {
    const atualizar = () => setPartes(partesDosDiasSemEncomenda(intervalos, new Date(), diasAFrente, locale));
    atualizar();
    const temporizador = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(temporizador);
  }, [intervalos, diasAFrente, locale]);
  if (!partes) return null;
  const trechos = [
    ...(partes.dias ? [t("diasSemEncomendaDias", { dias: partes.dias })] : []),
    ...partes.intervalos.map(({ de, ate }) => t("diasSemEncomendaIntervalo", { de, ate })),
  ];
  if (trechos.length === 0) return null;
  const dias = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(trechos);
  return <p className="mt-3 text-sm font-semibold text-tijolo">{t("diasSemEncomenda", { dias })}</p>;
}
