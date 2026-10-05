"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Afluencia, VagaDoCalendario } from "@/lib/vagas-servidor";

/**
 * # O calendário de levantamento
 *
 * **Embutido na página, sempre** — nunca a janela de data do browser. Pedido do
 * cliente a 04/10, com o calendário de um site de bilhetes de avião como
 * referência: os dias em círculos de cor cheia, dois meses lado a lado no
 * computador, a legenda em etiquetas no canto.
 *
 Cada dia tem a cor da sua procura e, ao tocar, mostra as horas, também com
 * cor; as cheias ficam riscadas. Escolhe-se **dia e hora**, sempre (#36).
 *
 * Quando ainda não há o horário da cozinha nem os tempos dos produtos (a casa
 * ainda não os deu, e o modo de teste está desligado), as horas são as da loja
 * e a escolhida é **pretendida** (`aConfirmar`): o calendário di-lo, e a casa
 * confirma. **Não se inventa um prazo.**
 *
 * **Não calcula nada.** As vagas e os dias chegam do servidor (`consultarVagas`),
 * já com a data e a hora de Lisboa escritas; o horário, os tempos e os degraus
 * das cores vêm de `@/lib/dados`, e a gerente muda-os no painel.
 *
 * ⚠️ **A cor nunca vai sozinha**: a afluência vai por palavras na legenda e no
 * nome de cada botão. ⚠️ **Sempre a hora de Lisboa**, também em inglês, e diz-o.
 */

const ORDEM: readonly Afluencia[] = ["livre", "media", "muita", "cheia"];

/* Classes por extenso: o Tailwind só gera as que encontra inteiras no código. */
const CIRCULO: Record<Afluencia, string> = {
  livre: "bg-afluencia-livre text-papel",
  media: "bg-afluencia-media text-tinta",
  muita: "bg-afluencia-muita text-papel",
  cheia: "bg-tinta/10 text-tinta/40 line-through",
};
const PASTILHA: Record<Afluencia, string> = {
  livre: "bg-afluencia-livre-fundo border-afluencia-livre",
  media: "bg-afluencia-media-fundo border-afluencia-media",
  muita: "bg-afluencia-muita-fundo border-afluencia-muita",
  cheia: "bg-tinta/5 border-tinta/10",
};
const CIRCULO_NEUTRO = "border-2 border-tinta/25 bg-papel text-tinta";
const PASTILHA_NEUTRA = "bg-papel border-tinta/20";

/**
 * ⚠️ **A cor de um dia é a média das suas horas, e não a da hora mais livre.**
 * Pela mais livre, o mês saía todo verde: quase todos os dias têm uma meia hora
 * livre, e um calendário de uma cor só não diz nada. Num calendário de bilhetes
 * o dia mostra a procura geral. Um dia todo cheio é «cheio»; um dia com alguma
 * hora livre nunca passa de «muita procura».
 */
function afluenciaDoDia(doDia: VagaDoCalendario[]): Afluencia | null {
  if (!doDia.some((v) => v.livre)) return "cheia";
  const niveis = doDia.map((v) => v.afluencia).filter((a): a is Afluencia => a !== null);
  if (niveis.length === 0) return null;
  const media = niveis.reduce((soma, a) => soma + ORDEM.indexOf(a), 0) / niveis.length;
  return ORDEM[Math.min(Math.round(media), ORDEM.indexOf("muita"))];
}

/* Datas civis («2026-10-07») em contas de calendário. O fuso não entra: são dias
   de Lisboa já escritos pelo servidor, e um dia é um dia. */
const utc = (data: string) => {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const somarMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

type Dia = { afluencia: Afluencia | null; ativo: boolean };

type Props = {
  locale: Locale;
  telefone: string | null;
  comTitulo?: boolean;
  vagas: VagaDoCalendario[];
  /** As horas são as da loja, e a escolhida confirma-se com a pessoa. */
  aConfirmar?: boolean;
  escolhida: string | null;
  aoEscolher: (vaga: VagaDoCalendario) => void;
};

function mapaDeDias(vagas: VagaDoCalendario[]): Map<string, Dia> {
  const mapa = new Map<string, Dia>();
  const porDia = new Map<string, VagaDoCalendario[]>();
  for (const vaga of vagas) porDia.set(vaga.data, [...(porDia.get(vaga.data) ?? []), vaga]);
  for (const [data, doDia] of porDia) {
    mapa.set(data, { afluencia: afluenciaDoDia(doDia), ativo: doDia.some((v) => v.livre) });
  }
  return mapa;
}

export function CalendarioLevantamento({
  locale,
  telefone,
  comTitulo = true,
  vagas,
  aConfirmar = false,
  escolhida: escolhidaVaga,
  aoEscolher,
}: Props) {
  const t = useTranslations("encomendas.calendario");
  const lingua = locale === "pt" ? "pt-PT" : "en-GB";

  const dias = useMemo(() => mapaDeDias(vagas), [vagas]);
  const diaEscolhido = vagas.find((v) => v.inicio === escolhidaVaga)?.data ?? null;
  const primeiro = [...dias].find(([, d]) => d.ativo)?.[0] ?? null;
  const [aberto, setAberto] = useState<string | null>(() => diaEscolhido ?? primeiro);
  const diaAberto = diaEscolhido ?? aberto;

  const meses = useMemo(() => {
    const datas = [...dias.keys()].sort();
    if (datas.length === 0) return [];
    const lista = [datas[0].slice(0, 7)];
    while (lista.at(-1)! < datas.at(-1)!.slice(0, 7)) lista.push(somarMes(lista.at(-1)!, 1));
    return lista;
  }, [dias]);
  const [mes, setMes] = useState(() => (diaEscolhido ?? primeiro ?? meses[0] ?? "2000-01").slice(0, 7));
  const indice = Math.max(0, meses.indexOf(mes));

  const formato = useMemo(
    () => ({
      mes: new Intl.DateTimeFormat(lingua, { month: "long", year: "numeric", timeZone: "UTC" }),
      diaSemana: new Intl.DateTimeFormat(lingua, { weekday: "narrow", timeZone: "UTC" }),
      diaLongo: new Intl.DateTimeFormat(lingua, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
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

  if (!primeiro) {
    return (
      <p className="rounded-2xl bg-papel px-5 py-4 text-sm text-tinta">
        {t("semVagas")}{" "}
        {telefone && (
          <a href={`tel:${telefone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
            {telefone}
          </a>
        )}
      </p>
    );
  }

  const rotulo = (a: Afluencia | null) => (a ? t(`afluencia.${a}`) : "");
  const comCores = [...dias.values()].some((d) => d.afluencia !== null && d.afluencia !== "cheia");
  const escolher = (data: string) => setAberto(data);
  /* Os nomes dos dias, de segunda a domingo — 5 de janeiro de 1970 foi segunda —,
     numa letra só, como nos calendários de bolso. */
  const cabecalho = Array.from({ length: 7 }, (_, i) => formato.diaSemana.format(new Date(Date.UTC(1970, 0, 5 + i))));

  const grelha = (chave: string) => {
    const [ano, numMes] = chave.split("-").map(Number);
    const vazios = (new Date(Date.UTC(ano, numMes - 1, 1)).getUTCDay() + 6) % 7;
    const total = new Date(Date.UTC(ano, numMes, 0)).getUTCDate();
    const nomeMes = formato.mes.format(new Date(Date.UTC(ano, numMes - 1, 1)));
    return (
      <div className="grid content-start gap-2">
        <p className="text-center text-base font-semibold first-letter:uppercase">{nomeMes}</p>
        {/* Os dias ocupam a coluna até 40 px, e encolhem com ela: sete círculos
            fixos de 40 px não cabiam num telemóvel de 320 (armadilha 15). */}
        <div role="grid" aria-label={nomeMes} className="grid grid-cols-7 gap-y-1.5 text-center">
          {cabecalho.map((nome, i) => (
            <span key={i} className="pb-1 text-xs font-semibold text-tinta-suave">
              {nome}
            </span>
          ))}
          {Array.from({ length: vazios }, (_, i) => (
            <span key={`vazio-${i}`} aria-hidden />
          ))}
          {Array.from({ length: total }, (_, i) => {
            const data = `${chave}-${String(i + 1).padStart(2, "0")}`;
            const dia = dias.get(data);
            if (!dia) {
              return (
                <span key={data} className="grid h-10 place-items-center text-sm tabular-nums text-tinta/25">
                  {i + 1}
                </span>
              );
            }
            const marcado = data === (diaEscolhido ?? diaAberto);
            const cor = dia.afluencia ? CIRCULO[dia.afluencia] : CIRCULO_NEUTRO;
            return (
              <span key={data} className="grid place-items-center">
                <button
                  type="button"
                  disabled={!dia.ativo}
                  aria-pressed={marcado}
                  aria-label={`${formato.diaLongo.format(utc(data))}${dia.afluencia ? ` — ${rotulo(dia.afluencia)}` : ""}`}
                  onClick={() => escolher(data)}
                  className={`premivel grid aspect-square w-full max-w-10 place-items-center justify-self-center rounded-full text-sm font-bold tabular-nums ${cor} ${
                    marcado ? "ring-[3px] ring-tinta ring-offset-2 ring-offset-papel" : ""
                  }`}
                >
                  {i + 1}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const vagasDoDia = diaAberto ? vagas.filter((v) => v.data === diaAberto) : [];

  return (
    <div className="grid gap-5 rounded-2xl bg-papel p-4 text-tinta sm:p-5">
      {(comTitulo || comCores) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {comTitulo ? <h3 className="text-sm font-semibold">{t("titulo")}</h3> : <span />}
          {comCores && (
            <ul className="flex flex-wrap gap-1.5" aria-label={t("legenda")}>
              {(["livre", "media", "muita"] as const).map((nivel) => (
                <li key={nivel} className={`rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ${CIRCULO[nivel]}`}>
                  {rotulo(nivel)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Os meses: um no telemóvel, dois lado a lado no computador, com as setas
          de fora a andar um mês de cada vez. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMes(meses[indice - 1])}
          disabled={indice <= 0}
          aria-label={t("mesAnterior")}
          className="premivel absolute left-0 top-0 z-10 grid size-9 place-items-center rounded-full text-xl disabled:opacity-25"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setMes(meses[indice + 1])}
          disabled={indice >= meses.length - 1}
          aria-label={t("mesSeguinte")}
          className="premivel absolute right-0 top-0 z-10 grid size-9 place-items-center rounded-full text-xl disabled:opacity-25"
        >
          ›
        </button>
        <div className="grid gap-8 lg:grid-cols-2">
          {grelha(meses[indice])}
          {meses[indice + 1] && <div className="hidden lg:grid">{grelha(meses[indice + 1])}</div>}
        </div>
      </div>

      {diaAberto && (
        <div className="grid gap-3 border-t border-tinta/10 pt-4">
          <p className="text-sm font-semibold first-letter:uppercase">{formato.diaLongo.format(utc(diaAberto))}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {vagasDoDia.map((vaga) => {
              const marcada = vaga.inicio === escolhidaVaga;
              return (
                <button
                  key={vaga.inicio}
                  type="button"
                  disabled={!vaga.livre}
                  aria-pressed={marcada}
                  aria-label={`${vaga.hora}${vaga.afluencia ? ` — ${rotulo(vaga.afluencia)}` : ""}`}
                  onClick={() => aoEscolher(vaga)}
                  className={`premivel min-h-11 rounded-lg border-2 text-sm font-semibold tabular-nums disabled:line-through disabled:opacity-50 ${
                    marcada ? "border-tinta bg-tinta text-papel" : vaga.afluencia ? PASTILHA[vaga.afluencia] : PASTILHA_NEUTRA
                  }`}
                >
                  {vaga.hora}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="border-t border-tinta/10 pt-4 text-sm text-tinta-suave" aria-live="polite">
        {escolhidaVaga ? (
          <strong className="font-semibold text-tinta">
            {t(aConfirmar ? "escolhidoAConfirmar" : "escolhido", {
              quando: formato.escolhido.format(new Date(escolhidaVaga)),
            })}
          </strong>
        ) : (
          t(aConfirmar ? "escolhaAConfirmar" : "escolha")
        )}{" "}
        {t("horaDeLisboa")}
      </p>
    </div>
  );
}
