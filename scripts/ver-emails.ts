import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "../src/lib/emails/exemplo";
import { escreverEmail } from "../src/lib/emails/modelos";

for (const { modelo, locale, variante } of exemplosEmail()) {
  const email = escreverEmail(modelo, exemploEmail(modelo, variante), CASA_EXEMPLO, locale);
  const cabecalho = `${modelo} · ${locale}${variante ? ` · ${variante}` : ""}`;
  console.log(`=== ${cabecalho} ===\n${email.assunto}\n\n${email.texto}\n`);
}
