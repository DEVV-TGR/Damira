import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * `Link`, `redirect` e companhia já cientes do idioma — usar sempre estes em vez
 * dos do `next/navigation`, senão um link em `/en` atira o visitante de volta
 * para português sem se perceber porquê.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
