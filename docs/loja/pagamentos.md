# Pagamentos — Stripe

Como o dinheiro entra e sai. O que acontece ao pedido quando é pago, expira ou é
cancelado está em `pedidos.md`; aqui está a ligação ao Stripe.

## A conta

- **A conta Stripe é da Damira**, em nome dela. O dinheiro, as comissões, os
  reembolsos e as disputas são dela; nós integramos.
- A Damira convida a conta da DevPlus com o papel de programador. As chaves vão
  diretamente para as variáveis de ambiente da Vercel — nunca por mensagem.
- ⚠️ **A ativação da conta (verificação da empresa) demora.** Sem ela não há
  modo real. Começa cedo — é tarefa presencial (ver `divisao.md`).

## Checkout alojado no Stripe

O cliente sai do site para a página do Stripe, paga, e volta. É a opção mais
simples e a mais segura: os dados do cartão nunca passam por nós, e o Apple Pay
funciona sem configurar o nosso domínio. A página do Stripe leva o logótipo, o
nome e as cores da Damira (definições do Stripe).

**Métodos de pagamento: cartão — crédito e débito, incluindo Apple Pay e Google
Pay — e MB WAY. Mais nenhum.** A lista vai **explícita** na criação da sessão, e
não fica entregue às definições do painel do Stripe.

⚠️ **Porquê explícita.** Se alguém ligar o Multibanco no painel do Stripe, ele
aparecia no nosso checkout — e uma referência Multibanco pode ser paga horas ou
dias depois, muito depois de o pedido expirar aos 31 minutos. A proposta excluiu-o
por isso mesmo.

**MB WAY:** a confirmação é imediata, como num cartão. Limites que convém saber:

- valores entre 0,50 € e 5.000 € por pagamento;
- cada cliente tem, por defeito, um limite diário de 1.000 € na app. Um kit
  grande pode falhar por aí — o cliente paga com cartão;
- no extrato do cliente aparece **«Stripe Inc»** e não «Confeitaria Damira» (o
  MB WAY não deixa mudar isto). O email de confirmação avisa, para ninguém
  estranhar o movimento e abrir uma reclamação.

## Criar a sessão

1. O browser manda ids, quantidades e uma chave de idempotência (ver
   `pedidos.md` e `robustez.md`).
2. O servidor valida tudo — preços da base de dados, horário (`horarios.md`),
   quantidades, combinações — e cria o pedido `pendente`, reservando vaga e
   quantidades na mesma transação.
3. Cria a sessão do Stripe:
   - **`price_data` com os valores da base de dados**, linha a linha. Não se criam
     produtos no Stripe: o catálogo vive num sítio só, o nosso.
   - **Expira em `criadoEm + 31 min`**, e esse é também o prazo do pedido
     (`pedidos.md`): um prazo só, contado de quando o pedido nasceu e não de
     quando a sessão se cria. O Stripe exige pelo menos 30 minutos a partir da
     criação da sessão; o minuto de folga cobre os segundos entre uma coisa e a
     outra, e relógios desacertados.

     ⚠️ **Quando já não dá** — a criação da sessão falhou, e o «Tentar outra
     vez» chega mais de um minuto depois de o pedido nascer —, não se estica o
     prazo só do lado do Stripe. O pedido, que ainda não tem sessão e que por isso
     ninguém pode pagar, passa logo a `expirado` e liberta a vaga; a ação devolve
     um erro próprio, e o «Tentar outra vez» seguinte já leva uma chave de
     idempotência nova, que cria um pedido novo.
   - O id e a referência do pedido nos metadados (`pedidoId`, `referencia`), e a
     referência em `client_reference_id`. É pelo id que o webhook encontra o
     pedido (ver «Confirmar: o webhook»).
   - Email do cliente pré-preenchido; língua `pt` ou `en`, conforme o site.
   - Chave de idempotência com o id do pedido: dois cliques não criam duas sessões.
4. Redireciona o cliente.

**Sinal.** Quando o pedido pede sinal, a sessão leva **uma linha só** — «Sinal
(30 %) · Pedido DAM-…» — com o valor do sinal. O valor em cêntimos é
`Math.round(total × percentagem / 100)`; o resto é `total − sinal`, para nunca
haver um cêntimo perdido no arredondamento. O cliente vê a divisão no nosso site
antes de sair para o Stripe.

**Impostos.** Os preços já incluem IVA. O Stripe não calcula impostos nem emite
faturas — a faturação é manual (o talão leva o NIF, se o cliente o deu).

## Voltar do Stripe

- **Pagou** → página de sucesso com «A confirmar o pagamento…», que pergunta ao
  nosso servidor de dois em dois segundos até o pedido estar `pago`, e depois
  mostra a referência. Normalmente são segundos.
- **Voltou atrás** → o servidor expira a sessão no Stripe e só depois o pedido
  passa a `expirado`. Só uma sessão aberta se expira, e uma sessão expirada já
  não se paga: por esta ordem, a vaga nunca sai enquanto alguém a pode pagar. Se
  o Stripe recusar porque a sessão já foi paga, o pedido não expira — pergunta-se
  a sessão ao Stripe e segue para a `marcarPago`, como na verificação periódica.

⚠️ **Porquê expirar logo.** Um pedido `pendente` ocupa a vaga e as quantidades
durante 31 minutos. Quem volta atrás para mudar uma coisa e tenta outra vez
encontrava a última vaga ocupada… pelo seu próprio pedido abandonado.

⚠️ **Abrir o endereço de regresso não expira nada.** O `cancel_url` leva um
token aleatório do pedido, só para esta operação e com validade, e não o id do
pedido nem a referência. O GET mostra a página; quem expira é o POST que ela faz
com o token. Um pré-carregamento do browser, ou um id adivinhado, não chegam
para expirar o checkout de ninguém.

## Confirmar: o webhook

`src/app/api/stripe/webhook/route.ts`.

- Lê o corpo **em bruto** (`await req.text()`) e verifica a assinatura com o
  segredo do webhook. Um pedido sem assinatura válida é recusado.
- Guarda o id de cada evento processado; um evento repetido é ignorado.
- Responde depressa. Sem um 2xx, o Stripe volta a tentar: em modo real durante
  até três dias; numa sandbox, só três vezes em poucas horas.
- **Encontra o pedido pelo id dele**, que vai nos metadados (`metadata.pedidoId`)
  além da referência, e não pelo id da sessão. Se a sessão foi criada no Stripe e
  a gravação do `stripe_session_id` falhou, o pagamento continua a ser nosso.
  Antes de associar, confere a sessão, o modo, a moeda e o montante esperado — o
  total ou o sinal como ficaram gravados quando o pedido nasceu, e nunca
  recalculados com o catálogo de hoje.
- **Valida com zod**, primeiro o envelope (`id`, `type`, `livemode`,
  `api_version`) e depois só os campos que lê de cada objeto (sessão, reembolso,
  disputa). Os tipos do SDK só existem na compilação; em execução, o corpo vem na
  versão da API do endpoint, e se não for a do SDK um campo pode faltar sem erro
  nenhum. O schema não copia o objeto inteiro do Stripe — centenas de campos que
  não usamos e que mudam a cada versão.
- **Guarda o `api_version` de cada evento.** Um evento nunca muda depois de
  criado: uma retentativa que chega depois de uma atualização da API vem com a
  forma antiga.
- ⚠️ **O `livemode` do evento tem de bater com o modo da loja** (ver «Ambientes»).
  Um evento de teste numa loja aberta ao público não paga nada, e vice-versa.

O que responde ao Stripe:

| Caso | Resposta |
|---|---|
| sem assinatura válida | 400 |
| evento repetido | 200, e não faz nada — mas volta a avisar o painel (`avisarQuePedidosMudaram`): se a invalidação falhou da primeira vez, a retentativa do Stripe repara-a |
| `pedidoId` que esta base de dados não conhece (de outro ambiente) | 200, e não faz nada — senão o Stripe insiste |
| pedido nosso, com sessão, modo, moeda ou montante que não batem | 200; o pagamento recebido fica registado e há aviso para reconciliar (ver «Em aberto», 8) |
| tipo de evento que não tratamos | 200, e não faz nada |
| `livemode` trocado | 200, não faz nada, e regista-o: é configuração errada, e repetir não a corrige |
| um tipo que tratamos, mas que o zod não consegue ler | 5xx, com alerta: é erro nosso, e o Stripe volta a tentar depois de corrigido. Nunca 200 a um pagamento que não se tratou |
| erro da base de dados | 5xx — o Stripe volta a tentar |

O que faz com cada evento:

| Evento | O que faz |
|---|---|
| `checkout.session.completed` | só com `payment_status: 'paid'` → `marcarPago`. `completed` não quer dizer pago |
| `checkout.session.async_payment_succeeded` | `marcarPago` (não deve acontecer com cartão e MB WAY, mas não custa estar preparado) |
| `checkout.session.async_payment_failed` | **nunca** paga: o pedido passa a `expirado`, se ainda estiver `pendente` |
| `checkout.session.expired` | pedido a `expirado`, se ainda estiver `pendente` |
| `refund.created` / `refund.updated` / `refund.failed` | atualiza o estado do reembolso, **só para a frente**: o Stripe não garante a ordem dos eventos, e um `succeeded` antigo depois de um `failed` não faz nada. Um reembolso feito no painel do Stripe, que não pedimos, entra na mesma (ver «Em aberto», 1) |
| `charge.dispute.created` | aviso em «Precisa de atenção» no painel da gerente, que fica até ser tratado, mesmo depois do levantamento (ver «Em aberto», 7) |

A passagem a `pago` é **uma função só** (`marcarPago`), condicional e idempotente
(ver `pedidos.md`). O talão, o som e o email à loja saem dessa transição.

## Verificação periódica

⚠️ **O webhook pode não chegar** — um deploy partido, a Vercel em baixo, um
segredo trocado. De 15 em 15 minutos, uma tarefa agendada (Vercel Cron):

1. **Pergunta primeiro ao Stripe** pelas sessões pagas nos últimos 30 minutos —
   pela data do pagamento e com sobreposição, o que obriga a listar eventos e
   não sessões (ver «Em aberto», 4).
2. **Só se houver alguma**, consulta a base de dados e chama a mesma
   `marcarPago` para as que não tenham pedido `pago`.
3. Se apanhou alguma, regista-o e põe um aviso no painel — quer dizer que o
   webhook falhou e é preciso ver porquê.
4. No fim, avisa o monitor de que correu (ver `robustez.md`).

**Porquê o Stripe primeiro:** a base de dados só acorda quando há trabalho (ver
`robustez.md`). Uma verificação que a consultasse de 15 em 15 minutos mantinha-a
acordada um terço do dia, sem razão.

Isto **não** abre uma segunda porta: quem confirma continua a ser o Stripe; só
muda quem pergunta.

## Reembolsos

- Total ou parcial, pela gerente no painel; ou automático, quando o cliente
  cancela e a casa aceita (ver `pedidos.md`).
- Pedido ao Stripe com chave de idempotência. O pedido guarda cada reembolso com
  o seu estado: `pendente`, `concluido`, `falhado`.
- **O estado vem do webhook**, não da resposta ao nosso pedido.
- `reembolsadoCent` só soma reembolsos `concluido`.
- **Um *timeout* não quer dizer que o Stripe recusou.** O reembolso fica
  `pendente`, e a nova tentativa leva a mesma chave. ⚠️ A idempotência do Stripe
  não dura para sempre — as chaves podem ser apagadas ao fim de 24 horas —, por
  isso a proteção que dura é a nossa: o reembolso gravado antes de se chamar o
  Stripe (ver «Em aberto», 3).

⚠️ **Um reembolso pode falhar.** Os reembolsos saem do saldo Stripe da casa. Sem
saldo, o de cartão fica pendente e o de MB WAY **falha**. Nos primeiros dias, com
o saldo quase a zero, é exatamente o que vai acontecer. O painel mostra-o como
falhado, em «Precisa de atenção», e a gerente devolve o dinheiro por outra via.

⚠️ **O Stripe não devolve a comissão de um pagamento reembolsado.**

Reembolsos de MB WAY: até 365 dias depois do pagamento.

## Ambientes

**Uma sandbox do Stripe por ramo da Neon** (decidido a 02/11). As sandboxes são
ambientes de teste isolados dentro da conta da Damira, cada uma com as suas
chaves, eventos e definições.

| Ambiente | Neon | Stripe | Webhook |
|---|---|---|---|
| Local | `desenvolvimento` | sandbox «desenvolvimento» | Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
| Vercel Preview (ramo fixo de teste) | `desenvolvimento` | sandbox «desenvolvimento» | endpoint nessa sandbox, com o *bypass* |
| Vercel Production, até ao lançamento | `production` | sandbox «produção» | endpoint nessa sandbox, com o *bypass* |
| Vercel Production, depois do lançamento | `production` | modo real | endpoint de produção |

⚠️ **Porquê por ramo da Neon, e não por ambiente.** Os eventos de uma sandbox
chegam a todos os endpoints dela. Dois ambientes com a mesma base de dados não se
estragam um ao outro: o mesmo evento marca o mesmo pedido, e a `marcarPago` é
idempotente. Com bases de dados diferentes, cada um recebia as sessões do outro.

⚠️ **Num ensaio, um consumidor só.** A mesma base de dados não quer dizer o mesmo
código: o local e o Preview podem tratar o mesmo evento com versões diferentes, e
o primeiro a gravá-lo em `eventos_stripe` ganha. Quem ensaia no local desativa o
endpoint do Preview nessa sandbox, e vice-versa.

⚠️ **O site no ar corre em modo de teste até ao lançamento** (`LOJA_EM_TESTE=1`,
ver `AGENTS.md`): testa-se comprando com os cartões de teste, contra a base de
dados de produção. Daí a sandbox «produção». No lançamento (#55) trocam-se as
chaves da Production pelas reais, cria-se o endpoint de produção e desliga-se o
interruptor, no mesmo deploy. É a única exceção a «nunca se testa contra a base
de dados de produção», que continua a valer para o desenvolvimento e para os
testes automáticos; os pedidos que deixa lá têm de sair das contas no lançamento
(ver «Em aberto», 5).

⚠️ **A chave tem de bater com o modo da loja.** Com `LOJA_EM_TESTE=1`, só uma
chave de teste (`sk_test_`, ou `rk_test_` se for restrita); sem ele, só uma real
(`sk_live_`, `rk_live_`). Com a chave trocada **o build falha** — uma
verificação estática, sem consultar o Stripe nem a Neon —, e em execução o
checkout não abre e o webhook não aceita eventos com o `livemode` trocado. São os
dois erros mais caros do lançamento: a faixa a dizer que não se cobra nada com a
chave real ligada, e a loja aberta ao público a aceitar só cartões de teste.

O prefixo não distingue duas sandboxes. Uma chave da sandbox errada apanha-se de
outra forma: os eventos dela vão para os endpoints da outra base de dados, que
não conhece o `pedidoId` e não faz nada, e a verificação periódica — que pergunta
com a mesma chave — encontra os pagamentos que o webhook não trouxe e avisa.

⚠️ **A Vercel está protegida por login — o Preview e, até ao lançamento, a
Production —, e o Stripe não faz login.** Os dois webhooks levam o segredo de
*bypass* da Vercel no endereço: `…/api/stripe/webhook?x-vercel-protection-bypass=<segredo>`.
Sem isto, o Stripe recebe 401 e nenhum pedido de teste passa a pago. O tablet da
loja, nos testes físicos, entra da mesma forma (`x-vercel-set-bypass-cookie=true`,
uma vez).

Cada endpoint tem o seu segredo de webhook, e o `stripe listen` tem o dele;
trocá-los é a causa mais comum de «o pagamento passou mas o pedido não entrou».

**Preparar cada sandbox**, e depois o modo real. Ao criar uma sandbox, o Stripe
copia as definições do modo real (vem ligado por defeito), mas a cópia não se
mantém sincronizada: confirma-se em cada uma.

- o MB WAY ativado nos métodos de pagamento — a documentação do Stripe pede-o;
- os recibos automáticos desligados (ver «Emails»);
- a marca: logótipo, nome e cores da casa;
- o endpoint criado com a mesma versão da API que o SDK fixa;
- as chaves e o segredo do webhook diretamente nas variáveis da Vercel ou no
  `.env.local`, nunca por mensagem.

## Emails

Só os nossos — confirmação ao cliente, aviso à loja. Os recibos automáticos do
Stripe ficam desligados, para o cliente não receber dois emails diferentes sobre
o mesmo pagamento.

## Testes antes do lançamento

⚠️ **O Vitest nunca fala com o Stripe.** Três camadas: o Vitest sem rede faz o
grosso; o PGlite prova o que só a base de dados garante; as sandboxes provam o
que só o Stripe faz, e correm à mão.

### Como o código fica testável

- **Uma porta para o Stripe** (`PortaStripe`): `criarSessao`, `expirarSessao`,
  `pagamentosRecentes` e `reembolsar`. A verdadeira num ficheiro; nos testes, uma
  falsa que regista as chamadas e devolve o que o teste pedir — o mesmo padrão da
  `FonteDeDados`. Nem mock de HTTP (testava o formato do SDK, que não é nosso),
  nem `stripe-mock` (respostas fixas, sem estados, e com Docker).
- **Funções puras** para o que se calcula sem rede: os parâmetros da sessão, com
  `agora` por argumento, o sinal, e de evento a ação.
- **Os objetos do Stripe saem de construtores tipados com os tipos do SDK**, e
  nunca de JSON capturado com o `stripe trigger`: o capturado traz emails e ids
  da conta, e o repositório é público. Com tipos, uma subida do SDK que mude um
  campo rebenta no `build`.
- **O webhook testa-se com assinaturas verdadeiras**, feitas no próprio teste com
  o `generateTestHeaderString` do SDK e um segredo de teste: a rota inteira, sem
  rede. Para provar que se lê o corpo em bruto, assina-se um corpo com espaços e
  envia-se compactado: um `JSON.parse` seguido de `JSON.stringify` de um corpo já
  compacto dá os mesmos bytes, e o teste passava sem provar nada.
- **Um teste pequeno do adaptador verdadeiro**, com o cliente do SDK trocado por
  um que só regista: confere os parâmetros que lhe chegam. A porta falsa não
  prova que a verdadeira envia o que deve.

### Vitest

| Área | Casos |
|---|---|
| Sessão (#38) | métodos exatamente `card` e `mb_way`; `price_data` linha a linha, em `eur` e com os cêntimos do pedido gravado; `expires_at = criadoEm + 31 min`, e o prazo do pedido no mesmo instante; o `pedidoId` e a referência nos metadados, e a referência em `client_reference_id`; email e língua; a mesma chave de idempotência para o mesmo pedido; a resposta do Stripe perdida → a nova tentativa, com a mesma chave, recebe a mesma sessão; mais de um minuto desde o pedido → o pedido expira, e nunca se estica o prazo; a mesma chave com outro cesto ou outro levantamento → erro, nunca o pedido antigo; um pedido já terminado → nunca uma sessão nova; um cesto sob orçamento, ou com a hora só pretendida, nunca chega ao Stripe; com a chave trocada com o modo da loja, o build falha e o checkout não abre |
| Sinal (#38) | uma linha só, com `Math.round(total × % / 100)`; o arredondamento nos meios cêntimos; 100 %; um sinal abaixo do mínimo que o Stripe cobra (0,50 €) → erro claro antes do checkout; um cesto com produtos de percentagens diferentes (ver «Em aberto», 6). A soma sinal + resto não se testa: o resto é `total − sinal`, e o teste seria tautológico |
| Voltar atrás (#38) | expira no Stripe **antes** de mudar o pedido; sessão já paga → `pago`, e não `expirado`; sessão já expirada → `expirado`; o Stripe em baixo → o pedido fica `pendente` e a vaga não sai; abrir o endereço (GET) não expira nada; um token de outro pedido, ou fora de validade, é recusado |
| `marcarPago` (#42) | `pendente` → `pago`, com `pagoOnlineCent` do `amount_total`; `expirado` → `pago` + `chegouTarde`, a voltar a ocupar mesmo acima do limite; `pago`, `entregue`, `cancelado` → nada; duas chamadas → uma transição e um email de cada; `unpaid` → nada; duas linhas do mesmo produto, com escolhas diferentes → as quantidades somam-se antes de tocar no contador; a sessão encontrada pelo `pedidoId`, sem `stripe_session_id` gravado → associa-se, depois de conferida; montante ou moeda que não batem → o pagamento fica registado e há aviso |
| Webhook (#42) | sem assinatura, outro segredo, corpo assinado com espaços e enviado compactado, assinatura fora da tolerância → 400; evento repetido → 200, nada, e o painel volta a ser avisado; `completed` sem `paid` → nada; `async_payment_failed` → nunca paga; `expired` depois de `completed` → continua `pago`; `completed` depois de `expired` → `chegouTarde`; `pedidoId` que não existe aqui → 200 e nada; `livemode` trocado → nada; um tipo que tratamos, mas que o zod não lê → 5xx; um tipo que não tratamos → 200 |
| Emails (#42) | a transição grava os emails por enviar; o Resend aceita e o processo morre antes de os marcar enviados → a nova tentativa leva a mesma chave e não duplica (o Resend deduplica durante 24 horas) |
| Verificação periódica (#43) | **sem pagamentos no Stripe, a fonte de dados não é chamada** — um espião prova a regra 6; um pagamento que o webhook perdeu → `pago` + aviso; um já tratado → nada; janelas com sobreposição; pagina até ao fim; o *heartbeat* só no fim de uma execução que acabou — com o Stripe em baixo, ou um erro a meio da paginação, não, e é assim que o alarme dispara |
| Reembolsos e cancelamento (#49) | parcial → `pendente`, o reservado sobe e o `reembolsadoCent` não; dois que juntos passam o pago → o segundo recusado pelo `CHECK`; a mesma chave não pede dois; a resposta do Stripe perdida → o reservado não se liberta e não se pede outro; `succeeded` → `concluido`; `failed` → `falhado`, e o reservado devolve-o; `failed` seguido de um `succeeded` antigo → não volta atrás; um reembolso feito no painel do Stripe → entra no pedido; cancelar pela gerente com reembolso total, parcial ou nenhum; pelo cliente só com sessão, com a opção ligada e dentro do prazo; um funcionário a reembolsar → recusado no servidor; disputa → aviso, que continua lá depois do levantamento |
| Lançamento (#55) | com o interruptor desligado, os pedidos de teste não ocupam vagas nem quantidades, nem contam como vendas (ver «Em aberto», 5) |

### Base de dados (PGlite)

Quando houver as tabelas dos pedidos (#27, #41): a `marcarPago` altera 0 linhas à
segunda; um evento repetido faz cair o lote inteiro na chave primária de
`eventos_stripe`; `expirado → pago` volta a ocupar com o `GREATEST` e nunca falha
no `CHECK`; a limpeza não expira aos 30 min 59 s e expira aos 31 min 1 s;
`stripe_session_id` e `stripe_refund_id` únicos.

⚠️ **O PGlite tem uma ligação só e serializa tudo.** Um `Promise.all` corre as
duas chamadas uma depois da outra: prova a condição do `UPDATE`, mas nunca
reproduz a corrida de duas transações na Neon (ver «Em aberto», 2).

**Concorrência a sério**, antes do lançamento e depois de cada mudança nestas
escritas: duas ligações independentes, sincronizadas para disputar a mesma
linha, contra um ramo descartável da Neon. A última vaga, a limpeza contra o
pagamento, duas confirmações e dois reembolsos. O PGlite não substitui isto.

### Nas sandboxes, à mão

Números de teste da documentação do Stripe, confirmados a 02/11/2026:

| Caso | Como |
|---|---|
| cartão aceite | `4242 4242 4242 4242` |
| cartão recusado | `4000 0000 0000 0002` |
| 3D Secure | `4000 0000 0000 3220` |
| disputa | `4061 2199 4639 3810` — a disputa aparece pouco depois do pagamento |
| reembolso que demora | `4000 0000 0000 7726` — começa `pending` e passa a `succeeded`, com `refund.updated` |
| reembolso que falha | `4000 0000 0000 5126` — começa `succeeded` e passa a `failed`, com `refund.failed` |
| MB WAY aceite | qualquer número que não esteja abaixo; o `+351911111112` só aprova ao fim de ~30 s |
| MB WAY recusado | `+351911111113` (indisponível), `…114` (banco), `…115` (expirou), `…116` (cliente) |

Primeiro na sandbox «desenvolvimento»; depois, no site no ar, na «produção», e
com o tablet na loja:

- cartão aceite, recusado, e com 3D Secure — completo e abandonado;
- MB WAY aceite — o imediato e o de ~30 s, para ver «A confirmar o pagamento…» à
  espera — e os quatro recusados;
- Apple Pay num iPhone verdadeiro, Google Pay num Android;
- voltar atrás no checkout: o link antigo do Stripe passa a dizer que a sessão
  expirou;
- sessão que expira sozinha aos 31 minutos → `checkout.session.expired`;
- webhook repetido (`stripe events resend`) — um talão só, um email só;
- webhook com o segredo errado → 400 no Stripe (que, numa sandbox, tenta só três
  vezes em poucas horas), e o pedido entra pela verificação periódica, com o
  aviso;
- pagamento confirmado depois de o pedido expirar → `chegouTarde`: com **todos**
  os consumidores da sandbox parados — o `stripe listen` e o endpoint do Preview,
  desativado no Stripe durante o ensaio —, abrir o checkout e só pagar perto do
  fim dos 31 minutos; passado o prazo, criar outro pedido (é ele que corre a limpeza) e
  chamar à mão a verificação periódica, que apanha o primeiro — ela só olha para
  os pagamentos dos últimos 30 minutos, e um pagamento feito logo no início já
  lá não estava;
- MB WAY ainda a aprovar quando a sessão expira (o `+351911111112` só aprova ao
  fim de ~30 s): ver se o Stripe ainda o aceita — se aceitar, é um `chegouTarde`
  —, e registar a sequência de estados e eventos;
- uma sandbox com o MB WAY desligado: ver se a lista explícita faz a sessão
  falhar ou se o MB WAY só não aparece;
- reembolso total e parcial; o que demora (`…7726`) e o que falha (`…5126`),
  até ao aviso na gerente;
- disputa (`…3810`) → aviso;
- sinal: a linha única no Stripe e o «FALTA» no talão.

⚠️ **Em modo real não se testa.** O acordo com o Stripe proíbe testar em modo
real com meios de pagamento reais, e as falhas — o reembolso sem saldo incluído —
ensaiam-se nas sandboxes. O que há em modo real é **a primeira venda**: uma
encomenda verdadeira, de um produto que a casa vende, paga por cartão, e outra
por MB WAY, para ver o talão, o painel, o email e o que a app MB WAY mostra ao
cliente na aprovação.

### Em aberto

Para fechar antes da #42. O que mudar o contrato vai primeiro ao `pedidos.md`, e
o que mudar o esquema vai num PR só para isso.

1. **Os estados do reembolso** — proposto no #100, que muda o `pedidos.md`: os
   cinco estados do Stripe em três, a transição `concluido → falhado` (um
   reembolso que falha pode começar `succeeded`, como o cartão `…5126`), só para a
   frente, e o reembolso feito no painel do Stripe a entrar no pedido. Quando o
   #100 entrar, este ponto sai daqui. ⚠️ Não se sabe se um MB WAY sem saldo passa
   por `succeeded` antes de falhar: o `…5126` é de cartão.
2. **A `marcarPago` num lote sem leituras.** Somar à vaga se o pedido estava
   `expirado` e depois mudar o pedido, em duas instruções, tem uma corrida: duas
   chamadas ao mesmo tempo leem as duas «expirado» e somam duas vezes. Proposta,
   que a revisão confirmou para `READ COMMITTED`: uma instrução só, com um CTE que
   muda o pedido e devolve se ele estava expirado
   (`chegou_tarde = (estado = 'expirado')`). O *lock* da linha põe a segunda
   chamada à espera, e ela já não encontra nada para mudar. Os contadores saem só
   do `RETURNING` de quem ganhou, agregados por contador (a mesma linha nunca duas
   vezes na mesma instrução), e a versão do painel vai na mesma transação. O
   `INSERT` em `eventos_stripe` vai primeiro, e só a violação dessa chave quer
   dizer «repetido». ⚠️ O `ExecutarLote` (`src/db/lote.ts`) devolve `void`: ou
   passa a devolver o resultado, ou os efeitos ficam gravados na própria
   transação (3).
3. **Trabalho pendente que dura.** Os emails (por pedido, tipo e destinatário) e
   os reembolsos gravam-se **na mesma transação** que os origina, e só depois se
   enviam, com uma chave estável. Repetem-se quando a base de dados já está
   acordada por outra razão — o webhook, o painel aberto, um pedido novo, a
   verificação com trabalho —, e o que ficar parado aparece no painel. ⚠️ Sem nada
   que acorde a base de dados de propósito, não há garantia de reenvio: fica
   assumido, e é o aviso no painel que o segura.
4. **A verificação periódica pela data do pagamento.** As sessões listam-se pela
   data em que foram criadas, e uma sessão paga-se até 31 minutos depois.
   Proposta: listar os eventos `checkout.session.completed` (e
   `async_payment_succeeded`) pela data do evento, com sobreposição e paginação.
   Depois de uma paragem longa, nenhuma janela fixa chega: reconcilia-se à mão
   desde uma data, e o *heartbeat* em falta é o que avisa.
5. **Os pedidos de teste na base de dados de produção.** Proposta: marcados como
   de teste desde a criação, de forma que não se mude depois; no lançamento,
   arquivados e fora das contas — vagas, quantidades e vendas —, mas guardados.
   Esconder não chega, e repor o ramo `production` a um ponto anterior apagava o
   que a gerente fez no catálogo e nos horários.
6. **O sinal num cesto com percentagens diferentes** não está definido. Hoje o
   `criarPedido` grava sempre `total`.
7. **Os avisos de dinheiro ficam até alguém os tratar.** O `AvisoAtencao`
   (`src/lib/dados/tipos.ts`) só mostra pedidos por levantar, mas uma disputa ou
   um reembolso falhado chegam dias depois. O `reembolso-falhado`, a `disputa`, o
   `apanhado-pela-verificacao` e o montante que não bate ficam até serem tratados,
   com o levantamento já passado ou não.
8. **O montante ou a moeda que não batem.** O pagamento fica registado e há
   aviso; falta decidir se o pedido passa a `pago` na mesma — o dinheiro entrou, e
   um pedido pago nunca se perde — ou se fica à parte até a gerente ver.
9. **O MB WAY**: a aprovação que atravessa a expiração, e a lista explícita com o
   MB WAY desligado. Nem a documentação do Stripe nem a revisão os fecharam; o
   ensaio nas sandboxes regista a sequência de estados e eventos.
