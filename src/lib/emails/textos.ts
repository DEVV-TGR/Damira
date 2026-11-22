// O texto vive à parte para cada correção da cliente ser uma linha de diff.
import type { ModeloEmail } from "./tipos";

// Os marcadores separam a redação da formatação e das condições do pedido.
export type TextoModelo = { assunto: string; corpo: string; corpoGerente?: string };

export const TEXTOS_PT = {
  "criado-confirmado-cliente": {
    assunto: "Pedido {referencia} confirmado — {dataAssunto}",
    corpo: `{saudacao}

O seu pedido está confirmado.

Levantamento: {levantamento}
Na loja: {morada}

O que pediu:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "criado-por-confirmar-cliente": {
    assunto: "Pedido {referencia} recebido — a aguardar a resposta da loja",
    corpo: `{saudacao}

Recebemos o seu pedido. Ainda não está confirmado: tem um artigo que precisa da resposta da loja.

Levantamento pretendido: {levantamento}

O que pediu:
{linhas}

Não há nada a pagar agora.

Costumamos responder nas primeiras 24 horas. Se não lhe respondermos até {expira}, o pedido expira e não segue — e não há nada a pagar.

Quando respondermos, recebe outro email: a confirmação, ou, se a nossa resposta trouxer um preço ou uma hora que ainda não viu, uma proposta para aceitar.

Referência do pedido: {referencia}.

Para desistir ou alterar, ligue-nos para o {telefoneCasa}. Enquanto o pedido espera pela nossa resposta, desistir não tem custos.

{nomeCasa}
{morada}`,
  },
  "criado-loja": {
    assunto: "Pedido {referencia} — {estadoAssunto} · {nomeCompleto}{levantamentoAssunto}",
    corpo: `PEDIDO {referencia} — {estado}
Entrou pelo site: {criado} (hora de Lisboa){avisoPrazo}

LEVANTAMENTO NA LOJA
{levantamento} (hora de Lisboa){pretendida}

CLIENTE
Nome:      {nomeCompleto}
Email:     {email}
Telefone:  {telefoneCliente}
NIF:       {nif}

O QUE LEVA
{linhasLoja}

OBSERVAÇÕES
{observacoes}

PAGAMENTO
{pagamentoLoja}{blocoIndicativo}

{fimLoja}`,
  },
  "confirmado-cliente": {
    assunto: "Pedido {referencia} confirmado — {dataAssunto}",
    corpo: `{saudacao}

A loja confirmou o seu pedido.

Levantamento: {levantamento}
Na loja: {morada}

O que pediu:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "resposta-cliente": {
    assunto: "Pedido {referencia} — a nossa resposta, para aceitar",
    corpo: `{saudacao}

Respondemos ao seu pedido. Para o fazermos, precisamos que aceite o que mudou:

{mudancas}

O pedido fica assim:
{linhas}

{total}
{pagar}{blocoIndicativo}
Levantamento: {levantamento}

Para ver e aceitar:
{linkAceitar}

Abrir a página não aceita nada: o pedido só fica confirmado quando carregar em «Aceitar».

Se preferir não avançar, ligue-nos para o {telefoneCasa}. Desistir não tem custos.

Referência do pedido: {referencia}.

{nomeCasa}
{morada}`,
  },
  "aceite-cliente": {
    assunto: "Pedido {referencia} confirmado — {dataAssunto}",
    corpo: `{saudacao}

Obrigado por aceitar. O seu pedido está confirmado.

Levantamento: {levantamento}
Na loja: {morada}

O que pediu:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "aceite-loja": {
    assunto: "Pedido {referencia} — ACEITE pelo cliente · {nomeCompleto} · {dataCurta}",
    corpo: `PEDIDO {referencia} — ACEITE PELO CLIENTE
Aceite: {aceite} (hora de Lisboa)

O cliente aceitou a resposta da loja. O pedido está confirmado, e o talão sai no balcão.

LEVANTAMENTO NA LOJA
{levantamento} (hora de Lisboa)

CLIENTE
Nome:      {nomeCompleto}
Email:     {email}
Telefone:  {telefoneCliente}
NIF:       {nif}

O QUE LEVA
{linhasLoja}

PAGAMENTO
{pagamentoLoja}{blocoIndicativo}`,
  },
  "reagendado-cliente": {
    assunto: "Pedido {referencia} — nova hora de levantamento: {dataAssunto}",
    corpo: `{saudacao}

Como combinámos consigo, a hora de levantamento do seu pedido mudou:

  Antes: {anterior}
  Agora: {levantamento}

O resto do pedido não muda.

{pagar}

{fila}

{rodape}`,
  },
  "reagendado-loja": {
    assunto: "Pedido {referencia} — REAGENDADO para {dataCurta} · {nomeCompleto}",
    corpo: `PEDIDO {referencia} — REAGENDADO
Antes: {anterior}
Agora: {levantamento}
Combinado com o cliente. Registado pela gerente: {reagendado}.

Sai um talão de alteração no balcão: o da hora antiga já não vale.

CLIENTE
Nome:      {nomeCompleto}
Email:     {email}
Telefone:  {telefoneCliente}
NIF:       {nif}

O QUE LEVA
{linhasLoja}

PAGAMENTO
{pagamentoLoja}{blocoIndicativo}`,
  },
  "lembrete-loja": {
    assunto: "⏰ Pedido {referencia} ainda sem resposta — expira {expiraCurta}",
    corpo: `PEDIDO {referencia} — AINDA POR CONFIRMAR
Entrou: {criado}
Expira: {expira} (hora de Lisboa)

Ninguém respondeu ainda a este pedido. Se continuar sem resposta até à hora acima, expira, e o cliente é avisado de que a loja não respondeu a tempo.

Levantamento pretendido: {levantamento}
Cliente: {nomeCompleto} · {telefoneCliente}

O QUE LEVA
{linhasLembrete}

Responde-se no painel, em «Por confirmar».`,
  },
  "expirado-cliente": {
    assunto: "Pedido {referencia} — não conseguimos responder a tempo",
    corpo: `{saudacao}

Pedimos desculpa: não respondemos a tempo ao seu pedido, e ele expirou.

O pedido não vai ser feito, e não há nada a pagar.

Se ainda quiser, pode fazer um pedido novo no site, ou ligar-nos para o {telefoneCasa}.

Referência do pedido: {referencia}.

{nomeCasa}
{morada}`,
  },
  "cancelado-cliente": {
    assunto: "Pedido {referencia} cancelado",
    corpo: `{saudacao}

Como nos pediu, cancelámos o seu pedido. Não há nada a pagar.

Referência do pedido: {referencia}.

Até breve,
{nomeCasa}
{morada}`,
    corpoGerente: `{saudacao}

Lamentamos, mas não vamos conseguir fazer o seu pedido, e cancelámo-lo. Não há nada a pagar.

Se quiser falar connosco sobre uma alternativa, ligue-nos para o {telefoneCasa}.

Referência do pedido: {referencia}.

{nomeCasa}
{morada}`,
  },
} satisfies Record<ModeloEmail, TextoModelo>;

export const BLOCOS = {
  pt: {
    saudacao: "Olá, {primeiroNome},",
    botaoAceitar: "Ver e aceitar a proposta",
    pagar: "Paga na loja, ao levantar. Não há nada a pagar antes.",
    fila: `No dia, dirija-se ao balcão e entre na fila de atendimento, como os restantes clientes: a fila é uma só, por ordem de chegada, com ou sem encomenda. A hora indicada é a hora a que o seu pedido está pronto.`,
    indicativo: `Os artigos ao quilo são pesados na loja, e o valor final calcula-se com o peso efetivo. Por isso o total acima é indicativo.`,
    rodape: `Referência do pedido: {referencia} — diga-a ao balcão.

Para alterar ou cancelar, ligue-nos para o {telefoneCasa}. Não é possível fazê-lo pelo site.

Até breve,
{nomeCasa}
{morada}`,
    semPreco: "preço a fixar pela casa",
    total: "Total: {valor}{indicativo}",
    totalConhecido: "Conhecido até agora: {valor}{indicativo}",
    sufixoIndicativo: " (indicativo)",
    mudancaHora: "  Levantamento: passa de {antes} para {depois}",
    teste: "⚠️ MODO DE TESTE — este email é um teste, não corresponde a um pedido real.",
  },
  en: {
    saudacao: "Hello {primeiroNome},",
    botaoAceitar: "View and accept the proposal",
    pagar: "Please pay in the shop at pick-up. There is nothing to pay in advance.",
    fila: `On the day, please go to the counter and join the queue with the other customers: there is one queue, in order of arrival, whether or not you have placed an order. The time given is when your order will be ready.`,
    indicativo: `Items sold by weight are weighed in the shop, and the final amount is calculated using the actual weight. The total above is therefore indicative.`,
    rodape: `Order reference: {referencia} — please quote it at the counter.

To change or cancel your order, please call us on {telefoneCasa}. This cannot be done on the website.

See you soon,
{nomeCasa}
{morada}`,
    semPreco: "price to be set by the shop",
    total: "Total: {valor}{indicativo}",
    totalConhecido: "Known amount so far: {valor}{indicativo}",
    sufixoIndicativo: " (indicative)",
    mudancaHora: "  Pick-up: changes from {antes} to {depois}",
    teste: "⚠️ TEST MODE — this email is a test and does not correspond to a real order.",
  },
} as const;

export const TEXTOS_LOJA = {
  semPreco: "SEM PREÇO, a fixar pela gerente",
  naoIndicado: "— (não indicado)",
  confirmado: "CONFIRMADO",
  porConfirmar: "POR CONFIRMAR",
  porConfirmarAte: "POR CONFIRMAR até {expiraCurta}",
  avisoPrazo: `⚠️ Responder até {expira}. Depois disso o pedido expira, e o cliente é avisado de que a loja não respondeu a tempo.`,
  pretendida: " — pretendida",
  fimConfirmado: "Confirmado: o talão sai no balcão.",
  fimPorConfirmar: "Responde-se no painel, em «Por confirmar».",
  pagamento: "Na loja, ao levantar: {valor}{indicativo}",
  pagamentoIncompleto: "Na loja, ao levantar. Conhecido até agora: {valor}{indicativo} (sem preço: {semPrecos}).",
} as const;

export type ModeloCliente = Exclude<ModeloEmail, `${string}-loja`>;

export const TEXTOS_EN = {
  "criado-confirmado-cliente": {
    assunto: "Order {referencia} confirmed — {dataAssunto}",
    corpo: `{saudacao}

Your order is confirmed.

Pick-up: {levantamento}
At the shop: {morada}

Your order:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "criado-por-confirmar-cliente": {
    assunto: "Order {referencia} received — awaiting the shop’s response",
    corpo: `{saudacao}

We have received your order. It is not yet confirmed: it includes an item that requires a response from the shop.

Requested pick-up: {levantamento}

Your order:
{linhas}

There is nothing to pay now.

We usually respond within the first 24 hours. If we have not replied by {expira}, the order will expire and will not go ahead — and there will be nothing to pay.

When we reply, you will receive another email: either confirmation or, if our response includes a price or time you have not yet seen, a proposal to accept.

Order reference: {referencia}.

To withdraw or make changes, please call us on {telefoneCasa}. While the order is awaiting our response, there is no charge for withdrawing.

{nomeCasa}
{morada}`,
  },
  "confirmado-cliente": {
    assunto: "Order {referencia} confirmed — {dataAssunto}",
    corpo: `{saudacao}

The shop has confirmed your order.

Pick-up: {levantamento}
At the shop: {morada}

Your order:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "resposta-cliente": {
    assunto: "Order {referencia} — our response, for you to accept",
    corpo: `{saudacao}

We have responded to your order. To fulfil it, we need you to accept the changes:

{mudancas}

Your order will be:
{linhas}

{total}
{pagar}{blocoIndicativo}
Pick-up: {levantamento}

To view and accept:
{linkAceitar}

Opening the page does not accept anything: the order is only confirmed when you click ‘Accept’.

If you would prefer not to proceed, please call us on {telefoneCasa}. There is no charge for withdrawing.

Order reference: {referencia}.

{nomeCasa}
{morada}`,
  },
  "aceite-cliente": {
    assunto: "Order {referencia} confirmed — {dataAssunto}",
    corpo: `{saudacao}

Thank you for accepting. Your order is confirmed.

Pick-up: {levantamento}
At the shop: {morada}

Your order:
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "reagendado-cliente": {
    assunto: "Order {referencia} — new pick-up time: {dataAssunto}",
    corpo: `{saudacao}

As agreed with you, your order’s pick-up time has changed:

  Before: {anterior}
  Now: {levantamento}

The rest of your order remains unchanged.

{pagar}

{fila}

{rodape}`,
  },
  "expirado-cliente": {
    assunto: "Order {referencia} — we were unable to respond in time",
    corpo: `{saudacao}

We are sorry: we did not respond to your order in time, and it has expired.

The order will not be prepared, and there is nothing to pay.

If you would still like to order, you can place a new order on the website, or call us on {telefoneCasa}.

Order reference: {referencia}.

{nomeCasa}
{morada}`,
  },
  "cancelado-cliente": {
    assunto: "Order {referencia} cancelled",
    corpo: `{saudacao}

As you requested, we have cancelled your order. There is nothing to pay.

Order reference: {referencia}.

See you soon,
{nomeCasa}
{morada}`,
    corpoGerente: `{saudacao}

We are sorry, but we will not be able to fulfil your order and have cancelled it. There is nothing to pay.

If you would like to discuss an alternative, please call us on {telefoneCasa}.

Order reference: {referencia}.

{nomeCasa}
{morada}`,
  },
} satisfies Record<ModeloCliente, TextoModelo>;
