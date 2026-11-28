// O texto vive à parte para cada correção da cliente ser uma linha de diff.
// Os textos do cliente são os da Andreia (24/11/2026, «Diagrama e template Damira»), que reescreveu
// os emails e o fluxo; o inglês segue-os. Os da loja não foram revistos por ela e ficam como estavam.
import type { ModeloEmail } from "./tipos";

/**
 * O nome que aparece como remetente, pedido pela Andreia a 24/11 («Confeitaria Damira», sem «e Pão
 * Quente»). Quem envia (a fila, e o envio de teste) usa-o no `from`.
 */
export const NOME_REMETENTE = "Confeitaria Damira";

// Os marcadores separam a redação da formatação e das condições do pedido.
export type TextoModelo = { assunto: string; corpo: string; corpoGerente?: string };

export const TEXTOS_PT = {
  "criado-confirmado-cliente": {
    assunto: "O seu pedido {referencia} está confirmado 🎂",
    corpo: `{saudacao}

A sua encomenda está confirmada!

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

PRODUTOS ENCOMENDADOS
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "criado-por-confirmar-cliente": {
    assunto: "O seu pedido {referencia} está em análise 🎂",
    corpo: `{saudacao}

Recebemos a sua encomenda!

A nossa equipa irá analisar o seu pedido. Receberá um email com uma resposta, habitualmente no prazo de 24 horas.

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

PRODUTOS ENCOMENDADOS
{linhas}

{total}
Pagamento: Depois de confirmado o pedido, o pagamento é efetuado na loja, no momento do levantamento. Não é necessário qualquer pagamento antecipado.{blocoIndicativo}

Importante: A sua encomenda aguarda confirmação da nossa equipa.

{rodapePendente}`,
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
    assunto: "O seu pedido {referencia} está confirmado 🎂",
    corpo: `{saudacao}

Boas notícias! A nossa equipa analisou o seu pedido e a sua encomenda está confirmada.

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

PRODUTOS ENCOMENDADOS
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "resposta-cliente": {
    assunto: "Temos uma proposta para o seu pedido {referencia} 🎂",
    corpo: `{saudacao}

Já temos uma resposta para o seu pedido! Consulte abaixo os detalhes da nossa proposta e confirme se pretende avançar com a encomenda.

PROPOSTA
{mudancas}

RESUMO DO PEDIDO
{linhas}

{total}

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

Pagamento: Depois de aceite a proposta, o pagamento é efetuado na loja, no momento do levantamento. Não é necessário qualquer pagamento antecipado.{blocoIndicativo}

Consultar e aceitar proposta:
{linkAceitar}

Importante: A sua encomenda só ficará confirmada após a aceitação da proposta.

Caso prefira não avançar com a encomenda, poderá recusar a proposta sem qualquer custo.

{rodapePendente}`,
  },
  "aceite-cliente": {
    assunto: "O seu pedido {referencia} está confirmado 🎂",
    corpo: `{saudacao}

Agradecemos a sua confirmação! A sua encomenda está confirmada e vamos tratar de tudo para que esteja pronta na data combinada.

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

PRODUTOS ENCOMENDADOS
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
    assunto: "O seu pedido {referencia} tem uma nova data de levantamento 🎂",
    corpo: `{saudacao}

Conforme combinado, atualizámos os dados de levantamento da sua encomenda.

LEVANTAMENTO INICIALMENTE PREVISTO
{anterior}

NOVO LEVANTAMENTO
{levantamento}
Na loja: {morada}

As restantes informações da sua encomenda mantêm-se inalteradas.

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
    assunto: "Uma atualização sobre o seu pedido {referencia}",
    corpo: `{saudacao}

Lamentamos não ter conseguido dar resposta ao seu pedido dentro do prazo previsto.

Por esse motivo, não foi possível confirmar a sua encomenda, pelo que não será necessário efetuar qualquer pagamento.

Se ainda pretender avançar com a encomenda, teremos todo o gosto em ajudar. Poderá submeter um novo pedido através do nosso site ou contactar-nos através do {telefoneCasa}.

Pedimos desculpa pelo inconveniente e agradecemos a sua compreensão.

Referência da encomenda: {referencia}

Esperamos poder ajudar numa próxima oportunidade.
{nomeRemetente}`,
  },
  "cancelado-cliente": {
    assunto: "O seu pedido {referencia} foi cancelado",
    corpo: `{saudacao}

Conforme solicitado, a sua encomenda foi cancelada. Não será necessário efetuar qualquer pagamento.

Referência da encomenda: {referencia}

Esperamos voltar a recebê-lo em breve!
{nomeRemetente}`,
    corpoGerente: `{saudacao}

Lamentamos informar que, excecionalmente, não nos será possível preparar a sua encomenda, pelo que tivemos de proceder ao seu cancelamento.

Não será necessário efetuar qualquer pagamento.

Caso pretenda encontrar uma alternativa, a nossa equipa está disponível para ajudar através do {telefoneCasa}.

Pedimos desculpa pelo inconveniente e agradecemos a sua compreensão.

Referência da encomenda: {referencia}

Esperamos poder recebê-lo numa próxima oportunidade.
{nomeRemetente}`,
  },
  // A casa recusa um pedido que ainda esperava a resposta dela (`por-confirmar` → `cancelado`). Tem
  // texto próprio porque o pedido nunca chegou a estar confirmado: o T16 da Andreia.
  "recusado-cliente": {
    assunto: "Uma atualização sobre o seu pedido {referencia}",
    corpo: `{saudacao}

Após analisarmos o seu pedido, lamentamos não conseguir dar resposta à sua encomenda nas condições solicitadas.

Caso pretenda encontrar uma alternativa, teremos todo o gosto em ajudar. Poderá contactar a nossa equipa através do {telefoneCasa}.

Agradecemos a sua preferência e compreensão.

Referência da encomenda: {referencia}

Esperamos poder ajudar numa próxima oportunidade.
{nomeRemetente}`,
  },
  // Uma entrega cancelada porque a transferência não chegou no prazo (`pedidos.md` › A transferência):
  // o T15 da Andreia. Só se usa com as entregas ligadas.
  "cancelado-sem-pagamento-cliente": {
    assunto: "O seu pedido {referencia} foi cancelado",
    corpo: `{saudacao}

Não conseguimos confirmar a receção do pagamento da sua encomenda dentro do prazo indicado, pelo que o pedido foi cancelado.

Caso já tenha efetuado a transferência bancária ou pretenda retomar a encomenda, entre em contacto connosco através do {telefoneCasa}.

Referência da encomenda: {referencia}

Agradecemos a sua compreensão.
{nomeRemetente}`,
  },
  // O cliente recusou a proposta pela página do link (o T13 da Andreia).
  "proposta-recusada-cliente": {
    assunto: "Uma atualização sobre o seu pedido {referencia}",
    corpo: `{saudacao}

Recebemos a sua resposta e encerrámos o pedido.

Esperamos ter uma nova oportunidade de preparar algo especial para si!

Referência da encomenda: {referencia}

{assinatura}`,
  },
  // A proposta passou as 24 horas sem resposta do cliente (o T14 da Andreia, decidido a 25/11).
  "proposta-expirada-cliente": {
    assunto: "A proposta do seu pedido {referencia} expirou",
    corpo: `{saudacao}

Não recebemos a sua resposta dentro do prazo previsto para a aceitação da nossa proposta.

Por esse motivo, a sua encomenda não foi confirmada e não será necessário efetuar qualquer pagamento.

Caso ainda pretenda avançar com a encomenda, poderá submeter um novo pedido através do nosso site ou contactar-nos através do {telefoneCasa}.

Referência da encomenda: {referencia}

{assinatura}`,
  },
  // A casa mudou os produtos de um pedido confirmado, depois de o combinar com o cliente (o T17).
  "alterado-cliente": {
    assunto: "O seu pedido {referencia} foi atualizado 🎂",
    corpo: `{saudacao}

Conforme combinado, atualizámos os produtos da sua encomenda. Consulte abaixo o resumo atualizado.

DATA DE LEVANTAMENTO
{levantamento}
Na loja: {morada}

PRODUTOS ENCOMENDADOS
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

Referência da encomenda: {referencia} — para facilitar o levantamento, basta indicar esta referência à nossa equipa.

Para qualquer questão, entre em contacto connosco através do {telefoneCasa}.

{assinatura}`,
  },
} satisfies Record<ModeloEmail, TextoModelo>;

export const BLOCOS = {
  pt: {
    saudacao: "Olá, {primeiroNome},",
    botaoAceitar: "Consultar e aceitar proposta",
    pagar: "Pagamento: O pagamento é efetuado na loja, no momento do levantamento. Não é necessário qualquer pagamento antecipado.",
    fila: `Levantamento: A sua encomenda estará pronta à hora indicada. Para garantir um atendimento organizado e justo para todos, o levantamento de encomendas segue a fila de atendimento habitual, por ordem de chegada.`,
    indicativo: `Produtos vendidos ao quilo: O valor apresentado é estimado. O total final será calculado com base no peso real dos produtos.`,
    rodape: `Referência da encomenda: {referencia} — para facilitar o levantamento, basta indicar esta referência à nossa equipa.

Para alterar ou cancelar a sua encomenda, entre em contacto connosco através do {telefoneCasa}.

{assinatura}`,
    rodapePendente: `Referência da encomenda: {referencia} — guarde esta referência caso necessite de contactar a nossa equipa.

Para qualquer questão, entre em contacto connosco através do {telefoneCasa}.

{assinatura}`,
    assinatura: "Até breve! 😊\n{nomeRemetente}",
    semPreco: "Sob orçamento",
    total: "Total: {valor}{indicativo}",
    totalConhecido: "Total: A confirmar",
    // O desconto da loja (27/11): só aparece num pedido que o teve (`src/lib/desconto.ts`).
    subtotal: "Subtotal: {subtotal}",
    desconto: "Desconto ({percentagem}%): −{desconto}",
    descontoAConfirmar: "Desconto de {percentagem}% aplicado ao total final",
    sufixoIndicativo: " (Valor indicativo)",
    mudancaHora: "Nova hora de levantamento: {depois} (em vez das {antes})",
    mudancaData: "Nova data de levantamento: {depois} (em vez de {antes})",
    teste: "⚠️ MODO DE TESTE — este email é um teste, não corresponde a um pedido real.",
  },
  en: {
    saudacao: "Hello {primeiroNome},",
    botaoAceitar: "View and accept the proposal",
    pagar: "Payment: Payment is made in the shop when you collect your order. No advance payment is required.",
    fila: `Collection: Your order will be ready at the time shown. To keep service organised and fair for everyone, order collection follows the shop’s usual queue, in order of arrival.`,
    indicativo: `Products sold by weight: The amount shown is an estimate. The final total will be calculated based on the actual weight of the products.`,
    rodape: `Order reference: {referencia} — to make collection easier, simply give this reference to our team.

To change or cancel your order, please contact us on {telefoneCasa}.

{assinatura}`,
    rodapePendente: `Order reference: {referencia} — please keep this reference in case you need to contact our team.

If you have any questions, please contact us on {telefoneCasa}.

{assinatura}`,
    assinatura: "See you soon! 😊\n{nomeRemetente}",
    semPreco: "To be quoted",
    total: "Total: {valor}{indicativo}",
    totalConhecido: "Total: To be confirmed",
    subtotal: "Subtotal: {subtotal}",
    desconto: "Discount ({percentagem}%): −{desconto}",
    descontoAConfirmar: "{percentagem}% discount applied to the final total",
    sufixoIndicativo: " (estimated amount)",
    mudancaHora: "New pick-up time: {depois} (instead of {antes})",
    mudancaData: "New pick-up date: {depois} (instead of {antes})",
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
  // Só para os pedidos que ainda não ficam guardados (`soPorEmail`): nada os confirmou, e não há painel nem talão.
  novo: "NOVO",
  // O site está no ar em modo de teste até ao lançamento, e um cliente pode encomendar a sério:
  // dizer à casa que «não corresponde a um pedido real» fazia-a ignorar um pedido verdadeiro.
  testeSite: "⚠️ MODO DE TESTE no site — os prazos são de exemplo e não se cobrou nada. O pedido pode ser verdadeiro: confirme com o cliente.",
  fimSoPorEmail: "Este pedido ainda não fica no painel nem sai talão: existe só neste email. Responder a este email chega ao cliente.",
  pagamento: "Na loja, ao levantar: {valor}{indicativo}",
  pagamentoIncompleto: "Na loja, ao levantar. Conhecido até agora: {valor}{indicativo} (sem preço: {semPrecos}).",
} as const;

export type ModeloCliente = Exclude<ModeloEmail, `${string}-loja`>;

export const TEXTOS_EN = {
  "criado-confirmado-cliente": {
    assunto: "Your order {referencia} is confirmed 🎂",
    corpo: `{saudacao}

Your order is confirmed!

PICK-UP DATE
{levantamento}
At the shop: {morada}

PRODUCTS ORDERED
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "criado-por-confirmar-cliente": {
    assunto: "Your order {referencia} is under review 🎂",
    corpo: `{saudacao}

We have received your order!

Our team will review your order. You will receive an email with a response, usually within 24 hours.

PICK-UP DATE
{levantamento}
At the shop: {morada}

PRODUCTS ORDERED
{linhas}

{total}
Payment: Once the order is confirmed, payment is made in the shop when you collect your order. No advance payment is required.{blocoIndicativo}

Important: Your order is awaiting confirmation from our team.

{rodapePendente}`,
  },
  "confirmado-cliente": {
    assunto: "Your order {referencia} is confirmed 🎂",
    corpo: `{saudacao}

Good news! Our team has reviewed your order and it is confirmed.

PICK-UP DATE
{levantamento}
At the shop: {morada}

PRODUCTS ORDERED
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "resposta-cliente": {
    assunto: "We have a proposal for your order {referencia} 🎂",
    corpo: `{saudacao}

We have a response to your order! Please see the details of our proposal below and let us know whether you would like to go ahead.

PROPOSAL
{mudancas}

ORDER SUMMARY
{linhas}

{total}

PICK-UP DATE
{levantamento}
At the shop: {morada}

Payment: Once you accept the proposal, payment is made in the shop when you collect your order. No advance payment is required.{blocoIndicativo}

View and accept the proposal:
{linkAceitar}

Important: Your order will only be confirmed once you accept the proposal.

If you would prefer not to go ahead, you can decline the proposal at no cost.

{rodapePendente}`,
  },
  "aceite-cliente": {
    assunto: "Your order {referencia} is confirmed 🎂",
    corpo: `{saudacao}

Thank you for confirming! Your order is confirmed and we will take care of everything so it is ready on the agreed date.

PICK-UP DATE
{levantamento}
At the shop: {morada}

PRODUCTS ORDERED
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

{rodape}`,
  },
  "reagendado-cliente": {
    assunto: "Your order {referencia} has a new pick-up date 🎂",
    corpo: `{saudacao}

As agreed, we have updated the pick-up details of your order.

ORIGINAL PICK-UP
{anterior}

NEW PICK-UP
{levantamento}
At the shop: {morada}

All other details of your order remain unchanged.

{pagar}

{fila}

{rodape}`,
  },
  "expirado-cliente": {
    assunto: "An update on your order {referencia}",
    corpo: `{saudacao}

We are sorry that we were unable to respond to your order within the expected time.

As a result, we could not confirm your order, so no payment is required.

If you would still like to go ahead, we will be happy to help. You can place a new order on our website or contact us on {telefoneCasa}.

We apologise for the inconvenience and thank you for your understanding.

Order reference: {referencia}

We hope to help you another time.
{nomeRemetente}`,
  },
  "cancelado-cliente": {
    assunto: "Your order {referencia} has been cancelled",
    corpo: `{saudacao}

As requested, your order has been cancelled. No payment is required.

Order reference: {referencia}

We hope to see you again soon!
{nomeRemetente}`,
    corpoGerente: `{saudacao}

We regret to inform you that, exceptionally, we will not be able to prepare your order, so we have had to cancel it.

No payment is required.

If you would like to find an alternative, our team is available to help on {telefoneCasa}.

We apologise for the inconvenience and thank you for your understanding.

Order reference: {referencia}

We hope to see you another time.
{nomeRemetente}`,
  },
  "recusado-cliente": {
    assunto: "An update on your order {referencia}",
    corpo: `{saudacao}

Having reviewed your order, we are sorry that we are unable to fulfil it on the terms requested.

If you would like to find an alternative, we will be happy to help. You can contact our team on {telefoneCasa}.

Thank you for choosing us and for your understanding.

Order reference: {referencia}

We hope to help you another time.
{nomeRemetente}`,
  },
  "cancelado-sem-pagamento-cliente": {
    assunto: "Your order {referencia} has been cancelled",
    corpo: `{saudacao}

We were unable to confirm receipt of payment for your order within the deadline, so the order has been cancelled.

If you have already made the bank transfer or would like to resume your order, please contact us on {telefoneCasa}.

Order reference: {referencia}

Thank you for your understanding.
{nomeRemetente}`,
  },
  "proposta-recusada-cliente": {
    assunto: "An update on your order {referencia}",
    corpo: `{saudacao}

We have received your answer and closed the order.

We hope to have another chance to prepare something special for you!

Order reference: {referencia}

{assinatura}`,
  },
  "proposta-expirada-cliente": {
    assunto: "The proposal for your order {referencia} has expired",
    corpo: `{saudacao}

We did not receive your answer within the time allowed to accept our proposal.

As a result, your order has not been confirmed, and no payment is required.

If you would still like to go ahead, you can place a new order on our website or contact us on {telefoneCasa}.

Order reference: {referencia}

{assinatura}`,
  },
  "alterado-cliente": {
    assunto: "Your order {referencia} has been updated 🎂",
    corpo: `{saudacao}

As agreed, we have updated the products in your order. Please see the updated summary below.

PICK-UP DATE
{levantamento}
At the shop: {morada}

PRODUCTS ORDERED
{linhas}

{total}
{pagar}{blocoIndicativo}

{fila}

Order reference: {referencia} — to make collection easier, simply give this reference to our team.

If you have any questions, please contact us on {telefoneCasa}.

{assinatura}`,
  },
} satisfies Record<ModeloCliente, TextoModelo>;
