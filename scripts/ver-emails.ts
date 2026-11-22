import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { escaparHtml } from "../src/lib/emails/html";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "../src/lib/emails/exemplo";
import { escreverEmail } from "../src/lib/emails/modelos";

const argumentos = process.argv.slice(2);
if (argumentos.length && (argumentos[0] !== "--html" || argumentos.length !== 2 || !argumentos[1])) {
  throw new Error("Uso: ver-emails.ts [--html <pasta>]");
}
const pasta = argumentos[1];
if (pasta) mkdirSync(pasta, { recursive: true });
const links: string[] = [];

for (const [indice, { modelo, locale, variante }] of exemplosEmail().entries()) {
  const email = escreverEmail(modelo, exemploEmail(modelo, variante), CASA_EXEMPLO, locale);
  const cabecalho = `${modelo} · ${locale}${variante ? ` · ${variante}` : ""}`;
  if (pasta) {
    const nome = `${String(indice + 1).padStart(2, "0")}-${modelo}-${locale}${variante ? `-${variante}` : ""}.html`;
    writeFileSync(join(pasta, nome), email.html);
    links.push(`<li><a href="${nome}">${escaparHtml(cabecalho)}</a></li>`);
  }
  console.log(`=== ${cabecalho} ===\n${email.assunto}\n\n${email.texto}\n`);
}

if (pasta) writeFileSync(join(pasta, "index.html"), `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Emails da Damira</title></head><body><h1>Emails da Damira</h1><ul>${links.join("")}</ul></body></html>`);
