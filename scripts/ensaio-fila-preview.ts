/** Ensaio descartável do #141. Não integrar; nunca carrega ficheiros .env. */
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { pedidos, linhasPedido, emailsPorEnviar, produtos } from "../src/db/esquema";
import { baseDaNeon } from "../src/lib/dados/bd-neon";
import { criarEmailsBd } from "../src/lib/dados/bd-emails";
import { EsquemaPedido } from "../src/lib/dados/tipos";
import { gerarReferencia } from "../src/lib/dados/regras";
import { validarEnsaioDaFila } from "../src/lib/emails/ensaio";
import { executarEmissor } from "../src/lib/emails/executar";
import { pedidoDeEmail } from "../src/lib/emails/exemplo-emissor-teste";
import { casa } from "../src/data/casa";

const RAMO = "codex/ensaio-fila-emails-preview";
// Confirmado na consola Neon: desenvolvimento / br-morning-river-zawaue5v.
const SERVIDOR = "ep-calm-glade-zaswrpbz-pooler.c-2.eu-west-2.aws.neon.tech";
const DESTINO = "developerplusteam@gmail.com";
const PEDIDO = "5ed1de4c-9894-4821-9b39-3e6cba7c7141";
const EMAIL = "de71fb7d-61eb-4441-b589-67c670107141";
const CHAVE = "cc2bf9b2-6583-4563-9a25-2ec6e1a57141";
const ORIGINAL = "ensaio-fila-141@example.com";

async function executar() {
  const modo = process.argv.slice(2);
  assert(modo.length === 1 && ["--verificar", "--executar"].includes(modo[0]));
  assert.equal(process.env.VERCEL_ENV, "preview");
  assert.equal(process.env.VERCEL_GIT_COMMIT_REF, RAMO);
  assert.equal(process.env.EMAILS_SO_PARA?.trim(), DESTINO);
  assert.equal(process.env.EMAIL_REMETENTE?.trim(), "encomendas@damira.pt");
  const alvo = validarEnsaioDaFila(["--enviar", "--desenvolvimento", `--servidor-desenvolvimento=${SERVIDOR}`], process.env);
  assert.equal(alvo?.base, "neondb");
  console.log("[ensaio-fila] configuração conferida", JSON.stringify({ servidor: alvo.servidor, base: alvo.base, ramo: RAMO, destino: DESTINO }));
  if (modo[0] === "--verificar") return;

  const { db, emLote } = baseDaNeon(process.env.DATABASE_URL!);
  const fonte = criarEmailsBd(db);
  const lerLinha = async () => (await db.select().from(emailsPorEnviar).where(eq(emailsPorEnviar.id, EMAIL)))[0];
  let linha = await lerLinha();
  if (!linha) {
    assert.equal((await db.select({ id: produtos.id }).from(produtos).where(eq(produtos.id, "festa-premium"))).length, 1);
    const agora = new Date();
    const criadoEm = new Date(+agora - 72 * 3_600_000);
    const pedido = EsquemaPedido.parse({ ...pedidoDeEmail(), id: PEDIDO, referencia: gerarReferencia(criadoEm),
      estado: "expirado", criadoEm, expiraEm: new Date(+criadoEm + 48 * 3_600_000),
      levantamentoEm: new Date(+agora + 72 * 3_600_000), causaExpiracao: "sem-resposta-da-casa",
      cliente: { nome: "Pessoa Fictícia — Ensaio Fila 141", email: ORIGINAL, telefone: "+351912000000", nif: null, contaId: null },
      observacoes: "ENSAIO TÉCNICO #141 — dados inventados; não produzir nem contactar ninguém.",
    });
    // Estado terminal: não reserva vagas nem quantidades. Pedido, fotografia das linhas
    // e email de expiração nascem juntos, sem simular uma compra ou alterar o esquema.
    await emLote(b => [
      b.insert(pedidos).values({ id: PEDIDO, referencia: pedido.referencia, estado: pedido.estado,
        criadoEm, levantamentoEm: pedido.levantamentoEm, expiraEm: pedido.expiraEm,
        causaExpiracao: pedido.causaExpiracao, clienteNome: pedido.cliente.nome,
        clienteEmail: ORIGINAL, clienteTelefone: pedido.cliente.telefone,
        totalCent: pedido.totalCent, modoPagamento: "na-loja", chaveIdempotencia: CHAVE,
        procura: `ensaio fila 141 ${pedido.referencia.toLowerCase()}`, observacoes: pedido.observacoes, deTeste: true }),
      b.insert(linhasPedido).values(pedido.linhas.map((l, posicao) => ({ ...l, pedidoId: PEDIDO, posicao }))),
      b.insert(emailsPorEnviar).values({ id: EMAIL, pedidoId: PEDIDO, modelo: "expirado-cliente", destinatario: ORIGINAL, criadoEm: agora }),
    ]);
    linha = await lerLinha();
  }
  assert(linha);
  assert.equal(linha.pedidoId, PEDIDO);
  assert.equal(linha.modelo, "expirado-cliente");
  assert.equal(linha.destinatario, ORIGINAL);
  const pedido = await fonte.pedidoDoEmail(PEDIDO);
  assert(pedido && pedido.estado === "expirado" && pedido.cliente.email === ORIGINAL);
  const [guardado] = await db.select({ deTeste: pedidos.deTeste }).from(pedidos).where(eq(pedidos.id, PEDIDO));
  assert.equal(guardado.deTeste, true);
  console.log("[ensaio-fila] pedido validado pelo leitor real", JSON.stringify({ id: PEDIDO, referencia: pedido.referencia, estado: pedido.estado, deTeste: true }));
  console.log("[ensaio-fila] antes", JSON.stringify(linha));
  const jaEnviado = linha.enviadoEm !== null;
  let chamadas = 0;
  const buscar: typeof fetch = async (url, opcoes) => {
    // A última barreira é junto da API, incluindo quaisquer destinatários adicionais.
    assert.equal(url, "https://api.resend.com/emails");
    const corpo = JSON.parse(String(opcoes?.body));
    assert.deepEqual(corpo.to, [DESTINO]);
    assert(!corpo.cc && !corpo.bcc);
    chamadas++;
    const resposta = await fetch(url, opcoes);
    console.log("[ensaio-fila] resposta Resend", resposta.status);
    return resposta;
  };
  // Só a seleção é limitada ao UUID do ensaio. Reserva, leitura do pedido,
  // modelos, transporte, chave de idempotência e conclusão são os do #141.
  const dependencias = { fonte: { ...fonte,
    emailsPendentes: async (opcoes: { agora: Date; limite: number }) =>
      (await fonte.emailsPendentes({ ...opcoes, limite: 100 })).filter(l => l.id === EMAIL),
  }, ambiente: process.env, buscar,
  casa: { nome: casa.nome, morada: casa.morada, localidade: casa.cidade, telefone: casa.telefone ?? "", email: casa.email } };
  const primeira = await executarEmissor({ agora: new Date(), limite: 1 }, dependencias);
  console.log("[ensaio-fila] primeira execução", JSON.stringify(primeira));
  assert.deepEqual(primeira, { enviados: jaEnviado ? 0 : 1, falhados: 0, saltados: 0 });
  const depois = await lerLinha();
  assert(depois?.enviadoEm && depois.ultimaTentativaEm && depois.ultimoErro === null);
  assert.equal(depois.tentativas, jaEnviado ? linha.tentativas : linha.tentativas + 1);
  console.log("[ensaio-fila] depois", JSON.stringify(depois));
  const segunda = await executarEmissor({ agora: new Date(), limite: 1 }, dependencias);
  assert.deepEqual(segunda, { enviados: 0, falhados: 0, saltados: 0 });
  assert.deepEqual(await lerLinha(), depois);
  assert.equal(chamadas, jaEnviado ? 0 : 1);
  assert.equal((await db.select({ id: emailsPorEnviar.id }).from(emailsPorEnviar)
    .where(and(eq(emailsPorEnviar.pedidoId, PEDIDO), eq(emailsPorEnviar.destinatario, ORIGINAL)))).length, 1);
  console.log("[ensaio-fila] segunda execução", JSON.stringify({ ...segunda, chamadasResendNestaExecucao: 0, linhaInalterada: true }));
  console.log("[ensaio-fila] concluído", JSON.stringify({ chamadasResendTotais: chamadas, rececaoNaCaixa: "por confirmar pelo Tomás" }));
}

executar().catch(() => {
  // Erros do driver e asserts podem conter credenciais: nunca imprimir o objeto.
  console.error("[ensaio-fila] interrompido; conferir o último marco seguro nos logs.");
  process.exitCode = 1;
});
