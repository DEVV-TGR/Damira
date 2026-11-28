import { createNavigation } from "next-intl/navigation";
import { createElement, type ComponentProps } from "react";
import { IndicadorLigacao } from "@/components/espera/IndicadorLigacao";
import { routing } from "./routing";

/**
 * `Link`, `redirect` e companhia já cientes do idioma — usar sempre estes em vez
 * dos do `next/navigation`, senão um link em `/en` atira o visitante de volta
 * para português sem se perceber porquê.
 */
const { Link: LigacaoLocalizada, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export { redirect, usePathname, useRouter, getPathname };

export function Link({ children, ...props }: ComponentProps<typeof LigacaoLocalizada>) {
  return createElement(
    LigacaoLocalizada,
    props,
    children,
    createElement(IndicadorLigacao),
  );
}
