/**
 * As condições de encomenda: o que o cliente aceita ao enviar um pedido.
 *
 * ## De quem é cada parte
 *
 * Os pontos 1 a 7 são **da casa**, tal como a Andreia os escreveu a 10/11/2026
 * (Notion, «Precisamos de vocês» › «Política de encomendas, pagamentos e
 * cancelamentos»). Só se corrigiram gralhas. São a mesma política que o
 * `docs/loja/pedidos.md` traduz em estados (as referências «§1» a «§7» de lá
 * apontam para estes pontos): mudar um sem o outro põe o site a fazer uma coisa
 * e a prometer outra.
 *
 * As secções com `nossa: true` são o que a lei manda dizer **antes** de o
 * cliente se vincular (DL 24/2014, DL 7/2004, Lei 144/2015) e que a política
 * da casa não dizia: quem vende, os preços, a livre resolução, os alergénios e
 * as reclamações. A advogada revê-as.
 */

import type { Seccao } from "./tipos";

/** Muda-se com cada alteração ao texto. */
export const ATUALIZADAS_EM = "2026-11-16";

export const EMAIL_ENCOMENDAS = "encomendas@damira.pt";

export const CONDICOES: Seccao[] = [
  {
    id: "quem-vende",
    titulo: "Quem vende",
    nossa: true,
    blocos: [
      "Confeitaria e Pão Quente Damira Lda., R. Dom António Castro Meireles 155, 4445-397 Ermesinde.",
      `Telefone 22 973 0939 (chamada para a rede fixa nacional). E-mail ${EMAIL_ENCOMENDAS}.`,
      "Estas condições aplicam-se às encomendas feitas no site damira.pt. Ao enviar uma encomenda, declara que as leu e aceita.",
    ],
  },
  {
    id: "confirmacao",
    titulo: "1. Encomendas e confirmação",
    blocos: [
      "As encomendas para levantamento em loja são confirmadas de imediato por e-mail, exceto quando incluem bolos ou outros produtos que necessitem de validação por parte da loja. Os pedidos de entrega ao domicílio também carecem de confirmação. Basta que a encomenda contenha um produto que precise de confirmação para a confirmação ser feita para a encomenda inteira.",
      "Habitualmente, respondemos nas primeiras 24 horas após o registo do pedido. O pedido fica pendente até receber a nossa resposta. Se não receber uma resposta no prazo de 48 horas após o registo, o pedido expira. Ambos os prazos são contados em horas corridas.",
    ],
  },
  {
    id: "levantamento",
    titulo: "2. Levantamento e pagamento em loja",
    blocos: [
      "O registo da encomenda no site não implica uma obrigação de pagamento. Para encomendas com levantamento, o pagamento é feito na loja no momento do levantamento, sem sinal nem pagamento antecipado.",
      "Nos produtos vendidos ao quilo, o valor apresentado no final do pedido é indicativo. O preço final é calculado em loja com base no peso efetivo e no preço por quilo indicado no site.",
      "O levantamento é feito na Confeitaria Damira, na Rua Dom António Castro Meireles, 155, 4445-397 Ermesinde, na data e hora indicadas no e-mail de confirmação.",
      "Ao chegar para levantar a sua encomenda, por favor aguarde na fila única de atendimento. Todos os clientes são atendidos por ordem de chegada, incluindo quem tem uma encomenda confirmada para levantamento.",
    ],
  },
  {
    id: "entrega",
    titulo: "3. Entrega ao domicílio",
    blocos: [
      "A entrega ao domicílio está sujeita à disponibilidade da Damira e a orçamento. Se a entrega for possível, enviamos um orçamento com o custo da entrega, a data e a hora ou intervalo horário proposto, o montante a pagar, o IBAN e o prazo para pagamento por transferência bancária.",
      "A encomenda fica confirmada quando aceitar o orçamento. Se o pagamento não for recebido no prazo indicado, a Damira pode cancelar a encomenda e informar o cliente.",
      "Quando a entrega inclui produtos vendidos ao quilo, a Damira combina diretamente com o cliente, antes da aceitação do orçamento, como será apurado e pago o valor final.",
    ],
  },
  {
    id: "alteracoes",
    titulo: "4. Alterações e cancelamentos",
    blocos: [
      "Para alterar ou cancelar uma encomenda, contacte a Damira pelo 22 973 0939. As alterações estão sujeitas à disponibilidade e ao estado de preparação da encomenda.",
      "Pode desistir sem custos enquanto o pedido aguarda confirmação da Damira ou aceitação do orçamento. Após a confirmação, pode cancelar gratuitamente quando faltarem pelo menos 24 horas para a hora de levantamento ou de entrega acordada. Se a entrega estiver marcada para um intervalo horário, o prazo conta a partir do início desse intervalo. Se já tiver pago a encomenda, a Damira devolve o valor na íntegra.",
      "Se faltarem menos de 24 horas, contacte a Damira pelo mesmo número. A equipa avalia o pedido caso a caso, tendo em conta o estado de preparação e a possibilidade de reaproveitar os produtos. Nas entregas já pagas, o reembolso pode ser parcial quando existam custos diretamente associados à encomenda que a Damira já tenha suportado e não consiga recuperar. A Damira comunica a decisão por escrito e explica o montante de qualquer retenção.",
    ],
  },
  {
    id: "nao-levantadas",
    titulo: "5. Encomendas não levantadas",
    blocos: [
      "Se a encomenda não for levantada à hora marcada, fica guardada até ao encerramento da loja nesse dia, desde que seja possível assegurar as condições adequadas de conservação do produto.",
    ],
  },
  {
    id: "indisponibilidade",
    titulo: "6. Indisponibilidade",
    blocos: [
      "Se a Damira não puder cumprir uma encomenda nas condições confirmadas, entraremos em contacto consigo para propor uma alternativa, quando possível. Qualquer alteração depende da sua aceitação. Se não houver uma alternativa ou se preferir recusá-la, a encomenda é cancelada sem custos e a Damira devolve na íntegra qualquer valor já pago.",
    ],
  },
  {
    id: "direitos",
    titulo: "7. Direitos do consumidor",
    blocos: [
      "As condições de cancelamento desta política aplicam-se sem prejuízo dos direitos legais do consumidor. Nas compras concluídas à distância, a Damira informa o cliente, antes de este ficar vinculado, sobre o direito de livre resolução e as exceções aplicáveis, nomeadamente para produtos personalizados ou rapidamente perecíveis.",
    ],
    subseccoes: [
      {
        titulo: "Livre resolução",
        nossa: true,
        blocos: [
          "Os produtos da Damira são produtos alimentares frescos, que se deterioram rapidamente, e alguns são feitos por medida, segundo as indicações do cliente. Por isso, nos termos das alíneas c) e d) do n.º 1 do artigo 17.º do Decreto-Lei n.º 24/2014, não existe direito de livre resolução nas encomendas feitas no site, isto é, o direito de desistir da compra no prazo de 14 dias sem indicar motivo.",
          "Isto não afeta as condições de alteração e cancelamento do ponto 4, que a Damira oferece por sua iniciativa, nem os seus direitos legais se um produto não estiver conforme ao que foi encomendado.",
        ],
      },
    ],
  },
  {
    id: "precos",
    titulo: "Preços",
    nossa: true,
    blocos: [
      "Os preços apresentados no site estão em euros e incluem IVA à taxa legal em vigor. Os produtos sob orçamento, como os bolos personalizados, não têm preço no site: o valor é comunicado pela Damira antes de a encomenda ficar confirmada.",
      "A fatura é emitida na loja, no momento do pagamento. Se quiser fatura com número de contribuinte, indique-o na encomenda.",
    ],
  },
  {
    id: "alergenios",
    titulo: "Alergénios",
    nossa: true,
    blocos: [
      "A informação sobre os alergénios de cada produto está na respetiva página, antes de o juntar à encomenda. Se tiver uma alergia ou intolerância, indique-a nas observações ou contacte a Damira antes de encomendar: a possibilidade de a respeitar depende dos produtos e das condições de preparação, incluindo o risco de contaminação cruzada.",
    ],
  },
  {
    id: "reclamacoes",
    titulo: "Reclamações e resolução de litígios",
    nossa: true,
    blocos: [
      `Para qualquer reclamação, contacte primeiro a Damira pelo 22 973 0939 ou por ${EMAIL_ENCOMENDAS}. Pode também usar o Livro de Reclamações Eletrónico, em www.livroreclamacoes.pt.`,
      "Em caso de litígio de consumo, pode recorrer a uma entidade de resolução alternativa de litígios. A competente para a zona da loja é o CICAP — Centro de Informação de Consumo e Arbitragem do Porto (www.cicap.pt). A lista completa das entidades está no Portal do Consumidor, em www.consumidor.gov.pt.",
    ],
  },
];
