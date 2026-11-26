/** Descartável: só execução explícita na Preview desta branch; nunca carrega .env. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { eq } from "drizzle-orm";
import { pedidos, linhasPedido, emailsPorEnviar } from "../src/db/esquema";
import { baseDaNeon } from "../src/lib/dados/bd-neon";
import { criarEmailsBd } from "../src/lib/dados/bd-emails";
import { EsquemaPedido, type FonteEmails, type LinhaEmail } from "../src/lib/dados/tipos";
import { validarEnsaioDaFila } from "../src/lib/emails/ensaio";
import { executarEmissor, type DependenciasEmissor } from "../src/lib/emails/executar";
import { pedidoDeEmail } from "../src/lib/emails/exemplo-emissor-teste";
import { casa } from "../src/data/casa";

const RAMO = "codex/robustez-fila-emails";
// Reconfirmado na conta Neon a 26/11: desenvolvimento / br-morning-river-zawaue5v.
const SERVIDOR = "ep-calm-glade-zaswrpbz-pooler.c-2.eu-west-2.aws.neon.tech";
const DESTINO = "developerplusteam@gmail.com";
const ORIGINAL = "robustez-141@example.com";
const id = (n: number) => `26112026-0141-4141-8141-${String(n).padStart(12, "0")}`;
const registar = (marco: string, dados: unknown) => console.log("[robustez-141]", marco, JSON.stringify(dados));
const argumentos = ["--enviar", "--desenvolvimento", `--servidor-desenvolvimento=${SERVIDOR}`];

async function executar() {
  assert.deepEqual(process.argv.slice(2), ["--executar"]);
  assert.equal(process.env.VERCEL_ENV, "preview");
  assert.equal(process.env.VERCEL_GIT_COMMIT_REF, RAMO);
  assert.equal(process.env.EMAILS_SO_PARA?.trim(), DESTINO);
  assert.equal(process.env.EMAIL_REMETENTE?.trim(), "encomendas@damira.pt");
  const alvo = validarEnsaioDaFila(argumentos, process.env);
  assert.equal(alvo?.base, "neondb");
  // Estes casos terminam antes de construir a fonte/driver. Credenciais ficam só em memória.
  for (const [caso, ambiente, erro] of [
    ["producao", { ...process.env, VERCEL_ENV: "production" }, "ensaio-so-no-desenvolvimento"],
    ["hostname", { ...process.env, DATABASE_URL: "postgresql://inventado:inventado@ep-outro.neon.tech/neondb" }, "servidor-diferente-do-desenvolvimento-confirmado"],
    ["sem-destino", { ...process.env, EMAILS_SO_PARA: "" }, "sem-destino-seguro"],
  ] as const) {
    assert.throws(() => validarEnsaioDaFila(argumentos, ambiente), { message: erro });
    registar("protecao", { caso, erro, consultas: 0, chamadasApi: 0 });
  }
  registar("configuracao", { ...alvo, ramo: RAMO, destinoConferido: true, remetenteConferido: true });
  const { db, emLote } = baseDaNeon(process.env.DATABASE_URL!);
  const fonte = criarEmailsBd(db);
  const ler = async (n: number) => (await db.select().from(emailsPorEnviar).where(eq(emailsPorEnviar.id, id(n))))[0];
  const foto = async (n: number) => {
    const l = await ler(n); assert(l);
    const r = { id: l.id, pedidoId: l.pedidoId, modelo: l.modelo, criadoEm: l.criadoEm,
      tentativas: l.tentativas, ultimaTentativaEm: l.ultimaTentativaEm, enviadoEm: l.enviadoEm, ultimoErro: l.ultimoErro };
    registar("bd", r); return l;
  };
  // A preparação repete sem inserir mais nada. Um redeploy com tentativas prévias
  // recusa retomar automaticamente cenários parcialmente executados.
  const grupos = [[1, [11]], [2, [21]], [3, [31, 32]], [4, [41, 42]], [5, [51, 52]]] as const;
  for (const [numero, linhas] of grupos) {
    const existente = await fonte.pedidoDoEmail(id(numero));
    if (!existente) {
      const criadoEm = new Date("2026-11-22T09:00:00Z");
      const cancelado = numero === 5;
      const pedido = EsquemaPedido.parse({ ...pedidoDeEmail(), id: id(numero), referencia: `DAM-2211-R${numero}41`,
        estado: cancelado ? "cancelado" : "expirado", criadoEm,
        levantamentoEm: new Date("2026-11-27T10:00:00Z"),
        expiraEm: cancelado ? null : new Date(+criadoEm + 48 * 3_600_000),
        confirmadoEm: cancelado ? criadoEm : null,
        canceladoEm: cancelado ? new Date("2026-11-23T09:00:00Z") : null,
        canceladoPor: cancelado ? "gerente" : null,
        causaExpiracao: cancelado ? null : "sem-resposta-da-casa",
        cliente: { nome: "Pessoa Fictícia — Robustez 141", email: ORIGINAL, telefone: "+351912000000", nif: null, contaId: null },
        observacoes: "ENSAIO TÉCNICO — dados inventados; não produzir nem contactar ninguém.",
      });
      const criadoFila = new Date();
      // Fotografias históricas terminais, sem capacidade ocupada. A nº 5 documenta
      // recibos de uma confirmação anterior ao cancelamento, sem fingir uma compra.
      await emLote(b => [
        b.insert(pedidos).values({ id: pedido.id, referencia: pedido.referencia, estado: pedido.estado, criadoEm,
          levantamentoEm: pedido.levantamentoEm, expiraEm: pedido.expiraEm, confirmadoEm: pedido.confirmadoEm,
          canceladoEm: pedido.canceladoEm, canceladoPor: pedido.canceladoPor, causaExpiracao: pedido.causaExpiracao,
          clienteNome: pedido.cliente.nome, clienteEmail: ORIGINAL, clienteTelefone: pedido.cliente.telefone,
          totalCent: pedido.totalCent, modoPagamento: "na-loja", chaveIdempotencia: id(100 + numero),
          procura: `ensaio robustez ${pedido.referencia.toLowerCase()}`, observacoes: pedido.observacoes, deTeste: true }),
        b.insert(linhasPedido).values(pedido.linhas.map((l, posicao) => ({ ...l, pedidoId: pedido.id, posicao }))),
        b.insert(emailsPorEnviar).values(linhas.map((n, posicao) => ({ id: id(n), pedidoId: pedido.id,
          modelo: numero === 5 ? (posicao === 0 ? "criado-confirmado-cliente" : "criado-loja")
            : linhas.length === 2 && posicao === 0 ? "criado-por-confirmar-cliente" : "expirado-cliente",
          destinatario: numero === 5 && posicao === 1 ? "loja-ficticia@example.com" : ORIGINAL,
          criadoEm: new Date(+criadoFila + posicao),
        }))),
      ]);
    }
    const pedido = await fonte.pedidoDoEmail(id(numero)); assert(pedido);
    const [guardado] = await db.select({ teste: pedidos.deTeste }).from(pedidos).where(eq(pedidos.id, pedido.id));
    assert.equal(guardado.teste, true);
    registar("pedido", { id: pedido.id, referencia: pedido.referencia, estado: pedido.estado, totalCent: pedido.totalCent, deTeste: true });
    for (const n of linhas) assert.equal((await foto(n)).tentativas, 0, "Ensaio já iniciado: não retomar automaticamente.");
  }
  const chamadas: { id: string; hash: string; status: number; apiId: string | null; simulado: boolean; em: string }[] = [];
  let simular503 = true;
  const buscar: typeof fetch = async (url, opcoes) => {
    assert.equal(url, "https://api.resend.com/emails");
    const corpo = JSON.parse(String(opcoes?.body));
    assert.deepEqual(corpo.to, [DESTINO]); assert(!corpo.cc && !corpo.bcc);
    const chave = new Headers(opcoes?.headers).get("Idempotency-Key")!;
    assert(grupos.some(([, ns]) => ns.some(n => id(n) === chave)));
    const hash = createHash("sha256").update(String(opcoes?.body)).digest("hex");
    // O 503 é fabricado antes de tocar na rede; não é uma resposta do Resend.
    const simulado = chave === id(31) && simular503;
    let resposta: Response;
    if (simulado) { simular503 = false; resposta = new Response("", { status: 503 }); }
    else { await esperar(650); resposta = await fetch(url, opcoes); }
    const conteudo = resposta.ok ? await resposta.clone().json() as { id?: string } : null;
    const chamada = { id: chave, hash, status: resposta.status, apiId: conteudo?.id ?? null, simulado, em: new Date().toISOString() };
    chamadas.push(chamada); registar("api", chamada);
    return resposta;
  };
  const casaEmail = { nome: casa.nome, morada: casa.morada, localidade: casa.cidade, telefone: casa.telefone ?? "", email: casa.email };
  const restrita = (ns: readonly number[], outra: Partial<FonteEmails> = {}): DependenciasEmissor => ({
    fonte: { ...fonte, emailsPendentes: async opcoes =>
      (await fonte.emailsPendentes({ ...opcoes, limite: 100 })).filter(l => ns.some(n => l.id === id(n))),
    ...outra }, ambiente: process.env, buscar, casa: casaEmail,
  });
  const correr = async (caso: string, dep: DependenciasEmissor) => {
    const resumo = await executarEmissor({ agora: new Date(), limite: 10 }, dep);
    registar(caso, resumo); return resumo;
  };
  const ok = (enviados: number, falhados = 0) => ({ enviados, falhados, saltados: 0 });
  const antesApi = chamadas.length;
  let consultasBloqueadas = 0;
  const bloqueado = await correr("protecao-emissor", { ...restrita([11]), ambiente: { ...process.env, EMAILS_SO_PARA: "" },
    fonte: { ...fonte, emailsPendentes: async () => { consultasBloqueadas++; throw new Error("nao-devia-consultar"); } } });
  assert.equal(bloqueado.bloqueado, "sem-destino-seguro"); assert.equal(consultasBloqueadas, 0); assert.equal(chamadas.length, antesApi);
  // A exceção é ANTES da escrita real; nunca se apaga uma marca para fabricar a falha.
  assert.deepEqual(await correr("aceite-marca-falha", restrita([11], { marcarEmailEnviado: async () => {
    registar("falha-simulada", { id: id(11), antesDaEscrita: true }); throw new Error("marca-simulada");
  } })), ok(0, 1));
  const falhaMarca = await foto(11); assert.equal(falhaMarca.enviadoEm, null); assert.equal(falhaMarca.ultimoErro, "falha-interna");
  assert.deepEqual(await correr("repeticao-imediata", restrita([11])), ok(0));

  // Duas leituras terminam antes das reservas, forçando ambos a disputar o mesmo UUID.
  let leituras = 0; let libertar!: () => void;
  const barreira = new Promise<void>(resolve => { libertar = resolve; });
  const reservas: boolean[] = [];
  const concorrente = (): DependenciasEmissor => {
    const dep = restrita([21]); const selecionar = dep.fonte.emailsPendentes;
    dep.fonte.emailsPendentes = async opcoes => {
      const ls = await selecionar(opcoes); assert.equal(ls.length, 1);
      if (++leituras === 2) libertar();
      await Promise.race([barreira, esperar(10_000).then(() => { throw new Error("barreira-expirada"); })]); return ls;
    };
    dep.fonte.reservarEmail = async (uuid, agora) => { const r = await fonte.reservarEmail(uuid, agora); reservas.push(!!r); return r; };
    return dep;
  };
  const corrida = await Promise.all([correr("corrida-a", concorrente()), correr("corrida-b", concorrente())]);
  assert.equal(corrida.reduce((s, r) => s + r.enviados, 0), 1);
  assert.equal(corrida.reduce((s, r) => s + r.falhados, 0), 0);
  assert.deepEqual(reservas.sort(), [false, true]); registar("reservas-corrida", reservas);
  assert.equal((await foto(21)).tentativas, 1);

  assert.deepEqual(await correr("temporaria-503-simulado", restrita([31, 32])), ok(0, 1));
  const falhaTemporaria = await foto(31); assert.equal(falhaTemporaria.ultimoErro, "resend-503");
  assert.deepEqual(await correr("ordem-antecessor-em-espera", restrita([31, 32])), ok(0));
  assert.equal((await foto(32)).tentativas, 0);
  const reservado = await fonte.reservarEmail(id(41), new Date()); assert(reservado);
  registar("reserva-sem-envio", { id: reservado.id, tentativa: reservado.tentativas, em: reservado.ultimaTentativaEm });
  assert.deepEqual(await correr("ordem-antecessor-reservado", restrita([41, 42])), ok(0));
  assert.equal((await foto(42)).tentativas, 0);
  // Esperas delimitadas: sem consultas durante a pausa e sem automações.
  const retomarEm = +reservado.ultimaTentativaEm! + 121_000;
  registar("espera", { retomarEm: new Date(retomarEm), maximoMs: 121_000 });
  while (Date.now() < retomarEm) await esperar(Math.min(30_000, retomarEm - Date.now()));
  assert.deepEqual(await correr("aceite-repetir-mesma-chave", restrita([11])), ok(1));
  const repetidas = chamadas.filter(c => c.id === id(11));
  assert.equal(repetidas.length, 2); assert.equal(repetidas[0].status, 200); assert.equal(repetidas[1].status, 200);
  assert(repetidas[0].apiId); assert.equal(repetidas[0].apiId, repetidas[1].apiId); assert.equal(repetidas[0].hash, repetidas[1].hash);
  assert.equal((await foto(11)).tentativas, 2);
  assert.deepEqual(await correr("temporaria-recuperacao-e-ordem", restrita([31, 32])), ok(2));
  assert.deepEqual(await correr("reserva-abandonada-recuperacao-e-ordem", restrita([41, 42])), ok(2));
  assert.deepEqual(await correr("modelos-cliente-loja", restrita([51, 52])), ok(2));
  for (const ns of [[31, 32], [41, 42]]) {
    const reais = chamadas.filter(c => ns.some(n => c.id === id(n)) && !c.simulado);
    assert.deepEqual(reais.map(c => c.id), ns.map(id));
  }
  for (const [, ns] of grupos) for (const n of ns) {
    const l: LinhaEmail = await foto(n); assert(l.enviadoEm); assert.equal(l.ultimoErro, null);
  }
  const totalAntes = chamadas.length;
  assert.deepEqual(await correr("repeticao-final", restrita(grupos.flatMap(([, ns]) => [...ns]))), ok(0));
  assert.equal(chamadas.length, totalAntes);
  registar("concluido", { chamadasReais: chamadas.filter(c => !c.simulado).length, respostasSimuladas: 1,
    rececaoGmail: "por confirmar pelo Tomas", duplicadosNaCaixa: "por confirmar pelo Tomas" });
}

executar().catch(() => {
  console.error("[robustez-141] interrompido; conferir o último marco seguro, sem imprimir objetos de erro.");
  process.exitCode = 1;
});
