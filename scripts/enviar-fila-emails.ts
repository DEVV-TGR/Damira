/**
 * Ensaio manual da fila, só após autorização e com variáveis fornecidas pelo Tomás.
 * Não carrega .env. Usar o ramo desenvolvimento e uma caixa EMAILS_SO_PARA.
 *   npx tsx scripts/enviar-fila-emails.ts                         # não consulta nem envia
 *   npx tsx scripts/enviar-fila-emails.ts --desenvolvimento --enviar --servidor-desenvolvimento=<hostname confirmado na Neon>
 */
import { validarEnsaioDaFila } from "../src/lib/emails/ensaio";
async function executar() {
  const alvo = validarEnsaioDaFila(process.argv.slice(2), process.env);
  if (!alvo) {
    console.log("Nenhuma consulta nem envio. O ensaio exige autorização, ambiente e servidor de desenvolvimento confirmado.");
    return;
  }
  console.log(`Ensaio no servidor ${alvo.servidor}, base ${alvo.base}.`);
  const { baseDaNeon } = await import("../src/lib/dados/bd-neon");
  const { criarEmailsBd } = await import("../src/lib/dados/bd-emails");
  const { executarEmissor } = await import("../src/lib/emails/executar");
  const { casa } = await import("../src/data/casa");
  const { db } = baseDaNeon(process.env.DATABASE_URL!);
  const resumo = await executarEmissor({ agora: new Date(), limite: 10 }, {
    fonte: criarEmailsBd(db), ambiente: { ...process.env, VERCEL_ENV: "development" },
    casa: { nome: casa.nome, morada: casa.morada, localidade: casa.cidade, telefone: casa.telefone ?? "", email: casa.email },
  });
  console.log(JSON.stringify(resumo));
  if (resumo.falhados || resumo.bloqueado) process.exitCode = 1;
}
executar().catch(() => {
  // Um erro do driver pode levar parâmetros pessoais e credenciais na mensagem.
  console.error("Ensaio interrompido. Confira a configuração; nenhum detalhe do erro foi registado.");
  process.exitCode = 1;
});
