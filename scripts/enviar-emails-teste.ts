/*
 * Manda os 23 exemplos de `exemplo.ts` para uma caixa nossa, pelo Resend, para os ver
 * como chegam a sério (telemóvel, balcão, spam) antes de haver fila de envio (#119).
 * Não é a fila: não lê a base de dados, e os dados são os inventados dos exemplos.
 *
 *   npm run emails:enviar -- --para eu@exemplo.pt              # só lista, não envia
 *   RESEND_API_KEY=… EMAIL_REMETENTE=… npm run emails:enviar -- --para eu@exemplo.pt --enviar
 */
import { setTimeout as esperar } from "node:timers/promises";
import { lerArgumentosTeste, validarEmailTeste } from "../src/lib/emails/argumentos-teste";
import { CASA_EXEMPLO, exemploEmail, exemplosEmail } from "../src/lib/emails/exemplo";
import { ANEXO_LOGOTIPO } from "../src/lib/emails/html";
import { escreverEmail } from "../src/lib/emails/modelos";

async function executar() {
  const opcoes = lerArgumentosTeste(process.argv.slice(2));
  const chave = process.env.RESEND_API_KEY?.trim();
  const enderecoRemetente = process.env.EMAIL_REMETENTE?.trim();
  if (opcoes.enviar) {
    const faltam = [!chave && "RESEND_API_KEY", !enderecoRemetente && "EMAIL_REMETENTE"].filter(Boolean);
    if (faltam.length) throw new Error(`Falta configurar: ${faltam.join(", ")}.`);
  }
  if (enderecoRemetente) validarEmailTeste(enderecoRemetente);
  const remetente = `${CASA_EXEMPLO.nome} <${enderecoRemetente || "EMAIL_REMETENTE por configurar"}>`;
  const exemplos = exemplosEmail().filter(({ modelo, locale }) =>
    (!opcoes.modelo || modelo === opcoes.modelo) && (!opcoes.lingua || locale === opcoes.lingua));
  if (!exemplos.length) throw new Error("Não há exemplos para essa combinação de modelo e língua.");
  const mensagens = exemplos.map(({ modelo, locale, variante }, indice) => {
    const dados = { ...exemploEmail(modelo, variante), modoDeTeste: true };
    const email = escreverEmail(modelo, dados, CASA_EXEMPLO, locale);
    return {
      from: remetente,
      to: opcoes.para,
      ...(opcoes.responderPara ? { reply_to: opcoes.responderPara } : {}),
      subject: `[${indice + 1}/${exemplos.length} ${modelo} · ${locale}${variante ? ` · ${variante}` : ""}] ${email.assunto}`,
      text: email.texto,
      html: email.html,
      // O logótipo vai dentro do email (`cid:`); sem este anexo, o topo mostra só o texto alternativo.
      attachments: [ANEXO_LOGOTIPO],
    };
  });

  console.log(`Destinatários: ${opcoes.para.join(", ")}\nRemetente: ${remetente}`);
  if (opcoes.responderPara) console.log(`Responder para: ${opcoes.responderPara}`);
  for (const mensagem of mensagens) console.log(mensagem.subject);
  if (!opcoes.enviar) {
    console.log(`\nPré-visualização: ${mensagens.length} emails. Nenhum email enviado.`);
    console.log("Para enviar a sério, configure RESEND_API_KEY e EMAIL_REMETENTE e repita o comando com --enviar.");
    return;
  }

  // Nem um erro devolvido pelo serviço pode revelar a chave no terminal.
  const semChave = (texto: string) => chave ? texto.split(chave).join("[chave omitida]") : texto;
  let enviados = 0;
  try {
    for (const mensagem of mensagens) {
      if (enviados > 0) await esperar(600);
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify(mensagem),
      });
      if (!resposta.ok) {
        throw new Error(`Resend ${resposta.status}: ${await resposta.text()}`);
      }
      enviados++;
      console.log(`Enviado: ${mensagem.subject}`);
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido no envio.";
    throw new Error(`${semChave(mensagem)}\nEnvio interrompido: ${enviados} de ${mensagens.length} emails enviados.`);
  }
  console.log(`\n${enviados} emails enviados.`);
}

executar().catch((erro: unknown) => {
  const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
  const chave = process.env.RESEND_API_KEY?.trim();
  console.error(chave ? mensagem.split(chave).join("[chave omitida]") : mensagem);
  process.exitCode = 1;
});
