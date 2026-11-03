import Stripe from "stripe";
import { acaoDoEvento, lerEnvelope, lerObjeto, type AcaoNada, type AcaoWebhook } from "./eventos";
import type { FonteWebhook, RegistoEvento, ResultadoWebhook } from "./tipos";

/**
 * # O webhook do Stripe
 *
 * `pagamentos.md` › Confirmar: o webhook. A rota (`src/app/api/stripe/webhook/`)
 * só liga as peças; tudo o que decide está aqui, com as dependências por
 * argumento, para os testes passarem pela rota inteira sem rede: assinaturas
 * verdadeiras, feitas no próprio teste, e uma fonte em memória.
 *
 * O que responde ao Stripe:
 *
 * | Caso | Resposta |
 * |---|---|
 * | sem o segredo configurado | 500 — é erro nosso, e o Stripe volta a tentar |
 * | sem assinatura válida | 400 |
 * | envelope que não se lê | 500 |
 * | `livemode` trocado com o modo da loja | 200, nada, e regista-o |
 * | tipo que não tratamos | 200 |
 * | tipo que tratamos, mas que o zod não lê | 500 |
 * | uma sessão que não é nossa, ou que não está paga | 200, sem tocar na base de dados |
 * | ainda sem fonte (antes da base de dados) | 503 |
 * | erro da fonte | 500 |
 * | o resto, repetido incluído | 200 |
 */

export type DependenciasWebhook = {
  /** O segredo do endpoint (`whsec_…`). Cada endpoint tem o seu, e o `stripe listen` também. */
  segredo: string | undefined;
  /** `LOJA_EM_TESTE=1`: só se aceitam eventos de teste. Sem ele, só reais. */
  emTeste: boolean;
  /** `null` enquanto não houver implementação sobre a base de dados. */
  fonte: FonteWebhook | null;
  /** `avisarQuePedidosMudaram`, no site. */
  avisarPainel: () => void;
  /* Por argumento, como no motor de horários (regra 3 do AGENTS.md): é com ele
     que se mede a idade da assinatura. */
  agora: () => Date;
};

const responder = (status: number, corpo: Record<string, string | boolean> = { recebido: true }) =>
  Response.json(corpo, { status });

/* ⚠️ Nunca o erro inteiro nos logs. Um erro da base de dados traz a consulta e
   os parâmetros dela, e entre eles pode ir o email do cliente (`robustez.md` ›
   Logs). O nome e o código chegam para saber por onde começar. */
const descrever = (erro: unknown): string => {
  if (!(erro instanceof Error)) return typeof erro;
  const codigo = "code" in erro && typeof erro.code === "string" ? ` ${erro.code}` : "";
  return `${erro.name}${codigo}`;
};

export async function tratarWebhook(pedido: Request, deps: DependenciasWebhook): Promise<Response> {
  if (!deps.segredo) {
    console.error("[pagamentos] webhook: falta o STRIPE_WEBHOOK_SECRET");
    return responder(500, { erro: "por-configurar" });
  }

  /* ⚠️ O corpo **em bruto**. A assinatura é sobre os bytes que o Stripe mandou;
     um `JSON.parse` seguido de `JSON.stringify` muda os espaços, e a assinatura
     de um evento verdadeiro deixava de bater. */
  const corpo = await pedido.text();
  const assinatura = pedido.headers.get("stripe-signature");
  if (!assinatura) return responder(400, { erro: "sem-assinatura" });

  let json: unknown;
  try {
    json = Stripe.webhooks.constructEvent(
      corpo,
      assinatura,
      deps.segredo,
      Stripe.webhooks.DEFAULT_TOLERANCE,
      undefined,
      /* Em milissegundos: o SDK divide por mil. */
      deps.agora().getTime(),
    );
  } catch {
    return responder(400, { erro: "assinatura-invalida" });
  }

  const envelope = lerEnvelope(json);
  if (!envelope.success) {
    console.error("[pagamentos] webhook: um evento assinado com um envelope que não se lê");
    return responder(500, { erro: "envelope-invalido" });
  }
  const { id, type: tipo, livemode, api_version } = envelope.data;

  /* ⚠️ Um evento de teste numa loja aberta ao público não paga nada, e
     vice-versa (`pagamentos.md` › Ambientes). 200, porque repetir não corrige
     uma configuração errada. */
  if (livemode === deps.emTeste) {
    console.error(
      `[pagamentos] ${id} (${tipo}): evento ${livemode ? "real" : "de teste"} numa loja ` +
        `${deps.emTeste ? "em modo de teste" : "aberta ao público"} — ignorado. A chave ou o endpoint estão trocados.`,
    );
    return responder(200, { recebido: true, ignorado: "livemode" });
  }

  const leitura = lerObjeto(envelope.data);
  if (leitura.leitura === "nao-tratado") return responder(200);
  if (leitura.leitura === "objeto-invalido") {
    /* Só os caminhos dos campos, e nunca os valores: podiam ser dados do cliente. */
    const campos = leitura.erro.issues.map((problema) => problema.path.map(String).join(".") || "(raiz)").join(", ");
    console.error(`[pagamentos] ${id} (${tipo}): o objeto não se lê — ${campos}`);
    return responder(500, { erro: "objeto-invalido" });
  }

  let acao: AcaoWebhook;
  try {
    acao = acaoDoEvento(leitura.evento);
  } catch (erro) {
    console.error(`[pagamentos] ${id} (${tipo}): ${erro instanceof Error ? erro.message : descrever(erro)}`);
    return responder(500, { erro: "objeto-invalido" });
  }
  if (acao.tipo === "nada") return responder(200, { recebido: true, ignorado: acao.porque });

  if (!deps.fonte) {
    console.error(`[pagamentos] ${id} (${tipo}): o webhook ainda não está ligado à base de dados`);
    return responder(503, { erro: "por-ligar" });
  }

  const registo: RegistoEvento = { id, tipo, apiVersion: api_version, recebidoEm: deps.agora() };
  let resultado: ResultadoWebhook;
  try {
    resultado = await executar(deps.fonte, registo, acao);
    /* Também num repetido: se a invalidação falhou da primeira vez, a
       retentativa do Stripe repara-a. Um pedido que não é desta base de dados
       não mudou nada aqui. */
    if (resultado.resultado !== "pedido-desconhecido") deps.avisarPainel();
  } catch (erro) {
    console.error(`[pagamentos] ${id} (${tipo}): ${descrever(erro)}`);
    return responder(500, { erro: "base-de-dados" });
  }

  if (resultado.resultado === "nao-bate") {
    const referencia = "referencia" in acao && acao.referencia ? ` ${acao.referencia}` : "";
    console.error(
      `[pagamentos] ${id} (${tipo})${referencia}: não bate com o pedido — ${resultado.campos.join(", ")}. A reconciliar.`,
    );
  }
  return responder(200, { recebido: true, resultado: resultado.resultado });
}

function executar(
  fonte: FonteWebhook,
  registo: RegistoEvento,
  acao: Exclude<AcaoWebhook, AcaoNada>,
): Promise<ResultadoWebhook> {
  switch (acao.tipo) {
    case "pagar":
      return fonte.marcarPago(registo, acao);
    case "expirar":
      return fonte.expirarPendente(registo, acao);
    case "reembolso":
      return fonte.atualizarReembolso(registo, acao);
    case "disputa":
      return fonte.registarDisputa(registo, acao);
  }
}
