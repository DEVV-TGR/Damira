import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

/** Fontes do painel, servidas pelo próprio domínio através de `next/font`. */
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--fonte-display",
  display: "swap",
});

export const corpo = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});
