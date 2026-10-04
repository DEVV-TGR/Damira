"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Afluencia, VagaDoCalendario } from "@/lib/vagas-servidor";

/**
 * # O calendário de levantamento
 *
 * Um mês inteiro à vista, como nos calendários dos bilhetes de avião: **cada
 * dia diz pela cor quanta procura tem**, e tocar num dia mostra as horas dele,
 * também com cor. Pedido do cliente a 04/10 — ver-se logo o que está livre, em
 * vez de abrir dia a dia.
 *
 * **Não calcula nada.** As vagas chegam do servidor (`consultarVagas`), já com a
 * data e a hora de Lisboa escritas e com a afluência de cada uma — o horário da
 * casa, os tempos dos produtos e os degraus das cores vêm de `@/lib/dados`, e a
 * gerente muda-os no painel.
 *
 * ⚠️ **A cor nunca vai sozinha.** Cada dia e cada hora dizem a afluência por
 * palavras (no `aria-label` e na legenda), para quem não distingue cores.
 *
 * ⚠️ **Sempre a hora de Lisboa, também em inglês** (`horarios.md`), e diz-o.
 *
 * ⚠️ **As horas cheias ficam riscadas, não escondidas**: um dia que parece vazio
 * de manhã lê-se como «não abrem de manhã»; riscado lê-se como «já está
 * ocupado».
 */

/* Do mais livre ao mais cheio. */
const ORDEM: readonly Afluencia[] = [
  "livre",
  "pouca",
  "media",
  "muita",
  "cheia",
];

/**
 * ⚠️ **A cor de um dia é a média das suas horas, e não a da hora mais livre.**
 * Começou pela mais livre, e na primeira captura o mês inteiro saiu verde:
 * quase todos os dias têm pelo menos uma meia hora livre, e um calendário
 * todo da mesma cor não diz nada. Num calendário de bilhetes de avião o dia
 * mostra a procura geral — é isso que aqui se faz. Um dia todo cheio é
 * «cheio»; um dia com alguma hora livre nunca passa de «muita procura».
 */
function afluenciaDoDia(doDia: VagaDoCalendario[]): Afluencia | null {
  if (!doDia.some((v) => v.livre)) return "cheia";
  const niveis = doDia
    .map((v) => v.afluencia)
    .filter((a): a is Afluencia => a !== null);
  if (niveis.length === 0) return null;
  const media =
    niveis.reduce((soma, a) => soma + ORDEM.indexOf(a), 0) / niveis.length;
  return ORDEM[Math.min(Math.round(media), ORDEM.indexOf("muita"))];
}

/* Classes escritas por extenso, e não montadas por partes: o Tailwind só gera
   as classes que encontra inteiras no código. */
const COR: Record<Afluencia, { fundo: string; ponto: string }> = {
  livre: {
    fundo: "bg-afluencia-livre-fundo border-afluencia-livre",
    ponto: "bg-afluencia-livre",
  },
  pouca: {
    fundo: "bg-afluencia-pouca-fundo border-afluencia-pouca",
    ponto: "bg-afluencia-pouca",
  },
  media: {
    fundo: "bg-afluencia-media-fundo border-afluencia-media",
    ponto: "bg-afluencia-media",
  },
  muita: {
    fundo: "bg-afluencia-muita-fundo border-afluencia-muita",
    ponto: "bg-afluencia-muita",
  },
  cheia: { fundo: "bg-tinta/5 border-tinta/10", ponto: "bg-tinta/25" },
};
const NEUTRO = "bg-papel border-tinta/20";

type Dia = {
  data: string;
  vagas: VagaDoCalendario[];
  afluencia: Afluencia | null;
  livre: boolean;
};

/* Datas civis («2026-10-07») em contas de calendário. O fuso não entra aqui:
   são dias de Lisboa já escritos pelo servidor, e um dia é um dia. */
const partes = (data: string) =>
  data.split("-").map(Number) as [number, number, number];
const diaDaSemanaSeg0 = (ano: number, mes: number, dia: number) =>
  (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() + 6) % 7;
const diasNoMes = (ano: number, mes: number) =>
  new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const chaveMes = (data: string) => data.slice(0, 7);
const somarMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export function CalendarioLevantamento({
  vagas,
  escolhida,
  aoEscolher,
  locale,
  telefone,
  comTitulo = true,
}: {
  /* A página de compra já tem o título do passo («1 · Quando levanta») por
     cima, e dois títulos seguidos a dizer o mesmo leem-se como um erro. */
  comTitulo?: boolean;
  vagas: VagaDoCalendario[];
  escolhida: string | null;
  aoEscolher: (vaga: VagaDoCalendario) => void;
  locale: Locale;
  telefone: string | null;
}) {
  const t = useTranslations("encomendas.calendario");
  const lingua = locale === "pt" ? "pt-PT" : "en-GB";

  const dias = useMemo(() => {
    const porDia = new Map<string, VagaDoCalendario[]>();
    for (const vaga of vagas)
      porDia.set(vaga.data, [...(porDia.get(vaga.data) ?? []), vaga]);
    const mapa = new Map<string, Dia>();
    for (const [data, doDia] of porDia) {
      mapa.set(data, {
        data,
        vagas: doDia,
        afluencia: afluenciaDoDia(doDia),
        livre: doDia.some((v) => v.livre),
      });
    }
    return mapa;
  }, [vagas]);

  const comCores = vagas.some(
    (v) => v.afluencia !== null && v.afluencia !== "cheia",
  );
  const primeiroLivre = [...dias.values()].find((d) => d.livre)?.data ?? null;
  const diaDaEscolhida =
    vagas.find((v) => v.inicio === escolhida)?.data ?? null;
  const [aberto, setAberto] = useState<string | null>(
    () => diaDaEscolhida ?? primeiroLivre,
  );
  const diaAberto = dias.get(diaDaEscolhida ?? aberto ?? "") ?? null;

  const meses = useMemo(() => {
    const datas = [...dias.keys()].sort();
    if (datas.length === 0) return [];
    const lista = [chaveMes(datas[0])];
    while (lista.at(-1)! < chaveMes(datas.at(-1)!))
      lista.push(somarMes(lista.at(-1)!, 1));
    return lista;
  }, [dias]);
  const [mes, setMes] = useState(() =>
    chaveMes(diaDaEscolhida ?? primeiroLivre ?? meses[0] ?? "2000-01"),
  );

  const formato = useMemo(
    () => ({
      mes: new Intl.DateTimeFormat(lingua, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      diaSemana: new Intl.DateTimeFormat(lingua, {
        weekday: "short",
        timeZone: "UTC",
      }),
      diaLongo: new Intl.DateTimeFormat(lingua, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
      escolhido: new Intl.DateTimeFormat(lingua, {
        timeZone: "Europe/Lisbon",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
    [lingua],
  );

  if (!primeiroLivre) {
    return (
      <p className="rounded-2xl bg-papel px-5 py-4 text-sm text-tinta sm:col-span-2">
        {t("semVagas")}{" "}
        {telefone && (
          <a
            href={`tel:${telefone.replace(/\s/g, "")}`}
            className="font-semibold underline underline-offset-4"
          >
            {telefone}
          </a>
        )}
      </p>
    );
  }

  const [ano, numMes] = mes.split("-").map(Number);
  const vazios = diaDaSemanaSeg0(ano, numMes, 1);
  const total = diasNoMes(ano, numMes);
  /* Os nomes dos dias, de segunda a domingo: 5 de janeiro de 1970 foi segunda.
     ⚠️ Cortados a três letras: em português o formato «curto» do `Intl`
     devolve «segunda», «terça», e sete colunas de 40 px não os levam — os
     nomes encavalitavam-se uns nos outros. */
  const cabecalho = Array.from({ length: 7 }, (_, i) =>
    formato.diaSemana
      .format(new Date(Date.UTC(1970, 0, 5 + i)))
      .replace(".", "")
      .slice(0, 3),
  );
  const indice = meses.indexOf(mes);
  const rotuloAfluencia = (a: Afluencia | null) =>
    a ? t(`afluencia.${a}`) : "";
  const nomeDoDia = (data: string) => {
    const [a, m, d] = partes(data);
    return formato.diaLongo.format(new Date(Date.UTC(a, m - 1, d)));
  };

  return (
    <div className="grid gap-5 rounded-2xl bg-papel p-4 text-tinta sm:col-span-2 sm:p-5">
      {comTitulo && <h3 className="text-sm font-semibold">{t("titulo")}</h3>}

      {/* No computador o mês fica à esquerda e as horas à direita: com o mês a
          toda a largura, as células passavam dos 180 px e um calendário de
          bolso virava um quadro de parede. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="grid gap-4">
          {/* ⚠️ O nome do mês ocupa o espaço que sobra e não uma largura fixa: com
          `min-w-36` ao lado do título, a 320 px a página ganhava 39 px de
          rolagem horizontal. */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMes(meses[indice - 1])}
              disabled={indice <= 0}
              aria-label={t("mesAnterior")}
              className="premivel grid size-10 place-items-center rounded-full border border-tinta/20 disabled:opacity-30"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-sm font-semibold tabular-nums first-letter:uppercase">
              {formato.mes.format(new Date(Date.UTC(ano, numMes - 1, 1)))}
            </span>
            <button
              type="button"
              onClick={() => setMes(meses[indice + 1])}
              disabled={indice >= meses.length - 1}
              aria-label={t("mesSeguinte")}
              className="premivel grid size-10 place-items-center rounded-full border border-tinta/20 disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {/* O mês: sete colunas, de segunda a domingo, como num calendário de
          parede português. */}
          <div
            role="grid"
            aria-label={formato.mes.format(
              new Date(Date.UTC(ano, numMes - 1, 1)),
            )}
            className="grid grid-cols-7 gap-1.5"
          >
            {cabecalho.map((nome) => (
              <span
                key={nome}
                className="pb-1 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-tinta-suave"
              >
                {nome}
              </span>
            ))}
            {Array.from({ length: vazios }, (_, i) => (
              <span key={`vazio-${i}`} aria-hidden />
            ))}
            {Array.from({ length: total }, (_, i) => {
              const data = `${mes}-${String(i + 1).padStart(2, "0")}`;
              const dia = dias.get(data);
              const activo = dia && dia.data === diaAberto?.data;
              const cor = dia?.afluencia ? COR[dia.afluencia].fundo : NEUTRO;
              const nomeLongo = nomeDoDia(data);
              if (!dia) {
                return (
                  <span
                    key={data}
                    className="grid aspect-square place-items-center rounded-lg text-sm tabular-nums text-tinta/25"
                  >
                    {i + 1}
                  </span>
                );
              }
              return (
                <button
                  key={data}
                  type="button"
                  disabled={!dia.livre}
                  aria-pressed={Boolean(activo)}
                  aria-label={`${nomeLongo}${dia.afluencia ? ` — ${rotuloAfluencia(dia.afluencia)}` : ""}`}
                  onClick={() => setAberto(data)}
                  className={`premivel relative grid aspect-square place-items-center rounded-lg border-2 text-sm font-semibold tabular-nums disabled:line-through disabled:opacity-50 ${cor} ${
                    activo
                      ? "ring-2 ring-tinta ring-offset-2 ring-offset-papel"
                      : ""
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {comCores && (
            <ul
              className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta-suave"
              aria-label={t("legenda")}
            >
              {(["livre", "pouca", "media", "muita"] as const).map((nivel) => (
                <li key={nivel} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`size-2.5 rounded-full ${COR[nivel].ponto}`}
                  />
                  {rotuloAfluencia(nivel)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4">
          {diaAberto && (
            <div className="grid gap-3 border-t border-tinta/10 pt-4 lg:border-t-0 lg:pt-0">
              <p className="text-sm font-semibold first-letter:uppercase">
                {nomeDoDia(diaAberto.data)}
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
                {diaAberto.vagas.map((vaga) => {
                  const marcada = vaga.inicio === escolhida;
                  const cor = vaga.afluencia
                    ? COR[vaga.afluencia].fundo
                    : NEUTRO;
                  return (
                    <button
                      key={vaga.inicio}
                      type="button"
                      disabled={!vaga.livre}
                      aria-pressed={marcada}
                      aria-label={`${vaga.hora}${vaga.afluencia ? ` — ${rotuloAfluencia(vaga.afluencia)}` : ""}`}
                      onClick={() => aoEscolher(vaga)}
                      className={`premivel min-h-11 rounded-lg border-2 text-sm font-semibold tabular-nums disabled:line-through disabled:opacity-50 ${
                        marcada ? "border-tinta bg-tinta text-papel" : cor
                      }`}
                    >
                      {vaga.hora}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-sm text-tinta-suave" aria-live="polite">
            {escolhida ? (
              <strong className="font-semibold text-tinta">
                {t("escolhido", {
                  quando: formato.escolhido.format(new Date(escolhida)),
                })}
              </strong>
            ) : (
              t("escolha")
            )}{" "}
            {t("horaDeLisboa")}
          </p>
        </div>
      </div>
    </div>
  );
}
