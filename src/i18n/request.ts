import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const pedido = await requestLocale;
  /* Um idioma desconhecido no URL (`/de/ementa`) cai no português em vez de
     rebentar — o `proxy.ts` já filtra a esmagadora maioria destes casos. */
  const locale = hasLocale(routing.locales, pedido)
    ? pedido
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
