"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DiasSemEncomenda } from "@/lib/horarios";
import { textoDosDiasSemEncomenda } from "@/lib/dias-sem-encomenda";
import type { Locale } from "@/i18n/routing";

/** As páginas são estáticas; o dia de Lisboa tem de ser o de quem as abre. */
export function NotaDiasSemEncomenda({ intervalos, diasAFrente, locale }: {
  intervalos: readonly DiasSemEncomenda[]; diasAFrente: number; locale: Locale;
}) {
  const t = useTranslations("produto");
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const atualizar = () => setTexto(textoDosDiasSemEncomenda(intervalos, new Date(), diasAFrente, locale));
    atualizar();
    const temporizador = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(temporizador);
  }, [intervalos, diasAFrente, locale]);
  return texto ? <p className="mt-3 text-sm font-semibold text-tijolo">{t(locale === "en" && texto.startsWith("from ") ? "diasSemEncomendaIntervalo" : "diasSemEncomenda", { dias: locale === "pt" && !texto.startsWith("de ") ? `a ${texto}` : texto })}</p> : null;
}
