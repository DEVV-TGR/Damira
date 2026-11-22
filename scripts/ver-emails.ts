import { CASA_EXEMPLO, exemploEmail } from "../src/lib/emails/exemplo";
import { escreverEmail } from "../src/lib/emails/modelos";
import { MODELOS_EMAIL } from "../src/lib/emails/tipos";
import type { Locale } from "../src/i18n/routing";

for (const modelo of MODELOS_EMAIL) {
  const linguas: Locale[] = modelo.endsWith("-loja") ? ["pt"] : ["pt", "en"];
  const variantes = modelo === "criado-loja" ? ["por-confirmar", "confirmado"] as const
    : modelo === "cancelado-cliente" ? ["cliente", "gerente"] as const : [undefined];
  for (const locale of linguas) {
    for (const variante of variantes) {
      const email = escreverEmail(modelo, exemploEmail(modelo, variante), CASA_EXEMPLO, locale);
      const cabecalho = `${modelo} · ${locale}${variante ? ` · ${variante}` : ""}`;
      console.log(`=== ${cabecalho} ===\n${email.assunto}\n\n${email.texto}\n`);
    }
  }
}
