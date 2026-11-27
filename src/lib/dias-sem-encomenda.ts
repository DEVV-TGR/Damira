import { tz } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { FUSO, type DiasSemEncomenda } from "./horarios";
import type { Locale } from "@/i18n/routing";

const LISBOA = { in: tz(FUSO) };
const curta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** Só apresentação: o servidor volta a conferir os intervalos ao encomendar. */
export function textoDosDiasSemEncomenda(
  intervalos: readonly DiasSemEncomenda[], agora: Date, diasAFrente: number, locale: Locale,
): string {
  const hoje = format(agora, "yyyy-MM-dd", LISBOA);
  const ultimo = format(addDays(agora, diasAFrente, LISBOA), "yyyy-MM-dd", LISBOA);
  const visiveis = intervalos.filter(d => d.ate >= hoje && d.de <= ultimo).toSorted((a, b) => a.de.localeCompare(b.de));
  const curtos: string[] = [];
  const compridos: string[] = [];
  for (const { de, ate } of visiveis) {
    const inicio = Date.parse(`${de}T00:00:00Z`);
    const dias = (Date.parse(`${ate}T00:00:00Z`) - inicio) / 86_400_000;
    if (dias > 3) {
      const data = (d: string) => curta(d) + (de.slice(0, 4) === ate.slice(0, 4) ? "" : `/${d.slice(0, 4)}`);
      compridos.push(locale === "pt" ? `de ${data(de)} a ${data(ate)}` : `from ${data(de)} to ${data(ate)}`);
    } else {
      for (let i = 0; i <= dias; i++) curtos.push(format(addDays(new Date(inicio), i, { in: tz("UTC") }), "yyyy-MM-dd", { in: tz("UTC") }));
    }
  }
  const dias = [...new Set(curtos)].sort();
  const mesmoMes = dias.length > 0 && dias.every(d => d.slice(0, 7) === dias[0].slice(0, 7));
  const lista = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const textoCurto = mesmoMes
    ? `${lista.format(dias.map(d => d.slice(8, 10)))}/${dias[0].slice(5, 7)}`
    : lista.format(dias.map(curta));
  return lista.format([...(textoCurto ? [textoCurto] : []), ...compridos]);
}
