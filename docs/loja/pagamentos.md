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
   - Referência do pedido nos metadados e em `client_reference_id`.
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

## Confirmar: o webhook

`src/app/api/stripe/webhook/route.ts`.

- Lê o corpo **em bruto** (`await req.text()`) e verifica a assinatura com o
  segredo do webhook. Um pedido sem assinatura válida é recusado.
- Guarda o id de cada evento processado; um evento repetido é ignorado.
- Responde depressa. O Stripe volta a tentar durante dias se não receber 2xx.
- **Valida com zod só os campos que lê**: o `id` e o `type` do evento, o id da
  sessão, `client_reference_id`, `metadata.referencia`, `payment_status`,
  `amount_total`, `currency` e `livemode`. Os tipos do SDK só existem na
  compilação; em execução, o corpo vem na versão da API do endpoint, e se não for
  a do SDK um campo pode faltar sem erro nenhum. O schema não copia o objeto
  inteiro do Stripe — centenas de campos que não usamos e que mudam a cada versão.
- ⚠️ **O `livemode` do evento tem de bater com o modo da loja** (ver «Ambientes»).
  Um evento de teste numa loja aberta ao público não paga nada, e vice-versa.

O que responde ao Stripe:

| Caso | Resposta |
|---|---|
| sem assinatura válida | 400 |
| evento repetido | 200, e não faz nada |
| sessão que esta base de dados não conhece (de outro ambiente) | 200, e não faz nada — senão o Stripe insiste durante dias |
| tipo de evento que não tratamos | 200, e não faz nada |
| `livemode` trocado | 200, não faz nada, e regista-o: é configuração errada, e repetir não a corrige |
| formato que o zod recusa | em aberto (ver «Testes» › Em aberto) |
| erro da base de dados | 5xx — o Stripe volta a tentar |

O que faz com cada evento:

| Evento | O que faz |
|---|---|
| `checkout.session.completed` | se `payment_status` for `paid` → passa o pedido a `pago` |
| `checkout.session.async_payment_succeeded` / `_failed` | o mesmo, para pagamentos que confirmam depois (não devem existir com cartão e MB WAY, mas não custa estar preparado) |
| `checkout.session.expired` | pedido a `expirado`, se ainda estiver `pendente` |
| `refund.created` / `refund.updated` / `refund.failed` | atualiza o estado do reembolso |
| `charge.dispute.created` | aviso em «Precisa de atenção» no painel da gerente |

A passagem a `pago` é **uma função só** (`marcarPago`), condicional e idempotente
(ver `pedidos.md`). O talão, o som e o email à loja saem dessa transição.

## Verificação periódica

⚠️ **O webhook pode não chegar** — um deploy partido, a Vercel em baixo, um
segredo trocado. De 15 em 15 minutos, uma tarefa agendada (Vercel Cron):

1. **Pergunta primeiro ao Stripe** pelas sessões pagas nos últimos 30 minutos.
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

⚠️ **O site no ar corre em modo de teste até ao lançamento** (`LOJA_EM_TESTE=1`,
ver `AGENTS.md`): testa-se comprando com os cartões de teste, contra a base de
dados de produção. Daí a sandbox «produção». No lançamento (#55) trocam-se as
chaves da Production pelas reais, cria-se o endpoint de produção e desliga-se o
interruptor, no mesmo deploy.

⚠️ **A chave tem de bater com o modo da loja.** Com `LOJA_EM_TESTE=1`, só uma
chave de teste; sem ele, só uma real. Com a chave trocada o checkout não abre
(erro à vista, e registado), e o webhook não aceita eventos com o `livemode`
trocado. São os dois erros mais caros do lançamento: a faixa a dizer que não se
cobra nada com a chave real ligada, e a loja aberta ao público a aceitar só
cartões de teste.

⚠️ **A Vercel está protegida por login — o Preview e, até ao lançamento, a
Production —, e o Stripe não faz login.** Os dois webhooks levam o segredo de
*bypass* da Vercel no endereço: `…/api/stripe/webhook?x-vercel-protection-bypass=<segredo>`.
Sem isto, o Stripe recebe 401 e nenhum pedido de teste passa a pago. O tablet da
loja, nos testes físicos, entra da mesma forma (`x-vercel-set-bypass-cookie=true`,
uma vez).

Cada endpoint tem o seu segredo de webhook, e o `stripe listen` tem o dele;
trocá-los é a causa mais comum de «o pagamento passou mas o pedido não entrou».

**Preparar cada sandbox**, e depois o modo real:

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
  rede.

### Vitest

| Área | Casos |
|---|---|
| Sessão (#38) | métodos exatamente `card` e `mb_way`; `price_data` linha a linha, em `eur` e com os cêntimos do pedido gravado; `expires_at = criadoEm + 31 min`, e o prazo do pedido no mesmo instante; a referência nos metadados e em `client_reference_id`; email e língua; a mesma chave de idempotência para o mesmo pedido; um cesto sob orçamento, ou com a hora só pretendida, nunca chega ao Stripe; com a chave trocada com o modo da loja, o checkout não abre |
| Sinal (#38) | uma linha só, com `Math.round(total × % / 100)`; **sinal + resto = total para todos os totais de 1 a 10 000 cêntimos e todas as percentagens de 1 a 100** |
| Voltar atrás (#38) | expira no Stripe **antes** de mudar o pedido; sessão já paga → `pago`, e não `expirado`; sessão já expirada → `expirado`; o Stripe em baixo → o pedido fica `pendente` e a vaga não sai |
| `marcarPago` (#42) | `pendente` → `pago`, com `pagoOnlineCent` do `amount_total`; `expirado` → `pago` + `chegouTarde`, a voltar a ocupar mesmo acima do limite; `pago`, `entregue`, `cancelado` → nada; duas chamadas → uma transição e um email de cada; `unpaid` → nada |
| Webhook (#42) | sem assinatura, outro segredo, corpo re-serializado, assinatura fora da tolerância → 400; evento repetido → 200 e nada; `expired` depois de `completed` → continua `pago`; `completed` depois de `expired` → `chegouTarde`; sessão de outro ambiente → 200 e nada; `livemode` trocado → nada; tipo que não tratamos → 200 |
| Verificação periódica (#43) | **sem pagamentos no Stripe, a fonte de dados não é chamada** — um espião prova a regra 6; um pagamento que o webhook perdeu → `pago` + aviso; um já tratado → nada; pagina até ao fim; o *heartbeat* só no fim de uma execução que correu — com o Stripe em baixo não, e é assim que o alarme dispara |
| Reembolsos e cancelamento (#49) | parcial → `pendente`, o reservado sobe e o `reembolsadoCent` não; dois que juntos passam o pago → o segundo recusado pelo `CHECK`; a mesma chave não pede dois; `succeeded` → `concluido`; `failed` → `falhado`, e o reservado devolve-o; cancelar pela gerente com reembolso total, parcial ou nenhum; pelo cliente só com sessão, com a opção ligada e dentro do prazo; um funcionário a reembolsar → recusado no servidor; disputa → aviso |

### Base de dados (PGlite)

Quando houver as tabelas dos pedidos (#27, #41): a `marcarPago` altera 0 linhas à
segunda; um evento repetido faz cair o lote inteiro na chave primária de
`eventos_stripe`; `expirado → pago` volta a ocupar com o `GREATEST` e nunca falha
no `CHECK`; a limpeza não expira aos 30 min 59 s e expira aos 31 min 1 s;
`stripe_session_id` e `stripe_refund_id` únicos.

⚠️ **O PGlite tem uma ligação só e serializa tudo.** Um `Promise.all` corre as
duas chamadas uma depois da outra: prova a condição do `UPDATE`, mas nunca
reproduz a corrida de duas transações na Neon (ver «Em aberto», 2).

### Nas sandboxes, à mão

Números de teste da documentação do Stripe, confirmados a 02/11/2026:

| Caso | Como |
|---|---|
| cartão aceite | `4242 4242 4242 4242` |
| cartão recusado | `4000 0000 0000 0002` |
| 3D Secure | `4000 0000 0000 3220` |
| disputa | `4061 2199 4639 3810` — a disputa aparece pouco depois do pagamento |
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
- webhook com o segredo errado → 400 no Stripe, e o pedido entra pela
  verificação periódica, com o aviso;
- pagamento confirmado depois de o pedido expirar → `chegouTarde`: com o
  `stripe listen` parado, abrir o checkout e só pagar perto do fim dos 31
  minutos; passado o prazo, criar outro pedido (é ele que corre a limpeza) e
  chamar à mão a verificação periódica, que apanha o primeiro — ela só olha para
  os pagamentos dos últimos 30 minutos, e um pagamento feito logo no início já
  lá não estava;
- MB WAY ainda a aprovar quando a sessão expira (o `+351911111112` só aprova ao
  fim de ~30 s): ver se o Stripe ainda o aceita — se aceitar, é um `chegouTarde`;
- reembolso total e parcial; o que falha (`…5126`), até ao aviso na gerente;
- disputa (`…3810`) → aviso;
- sinal: a linha única no Stripe e o «FALTA» no talão.

Já em modo real, na loja: um pagamento com cartão, um com MB WAY (e ver o que a
app MB WAY mostra ao cliente na aprovação) e um reembolso de MB WAY — este com o
saldo baixo, para vermos o painel mostrar a falha.

### Em aberto

Para fechar antes da #42. O que mudar o contrato vai primeiro ao `pedidos.md`,
num PR só para isso.

1. **Um reembolso que falha começa `succeeded`** (o cartão `…5126`). Na nossa
   máquina isso é `concluido → falhado`, que o `pedidos.md` não prevê: o
   `reembolsadoCent` desce e o reservado volta. E o Stripe tem mais estados de
   reembolso (`requires_action`, `canceled`) do que os nossos três.
2. **A `marcarPago` num lote sem leituras.** Duas instruções — somar à vaga se o
   pedido estava `expirado`, e depois mudar o pedido — têm uma corrida: duas
   chamadas ao mesmo tempo leem as duas «expirado» e somam duas vezes. Proposta:
   uma instrução só, com um CTE que muda o pedido e devolve se ele estava
   expirado (`chegou_tarde = (estado = 'expirado')`), e os contadores a partir
   dele. O *lock* da linha do pedido põe a segunda chamada à espera, e ela já não
   encontra nada para mudar.
3. **O email que falha depois da transição perde-se**: o evento seguinte já não
   faz nada. O `robustez.md` diz que «volta a tentar-se», mas não diz quem, sem
   tarefa a acordar a base de dados.
4. **A verificação periódica pela data certa.** As sessões listam-se pela data em
   que foram criadas, e uma sessão paga-se até 31 minutos depois. Proposta:
   listar os eventos `checkout.session.completed` pela data do evento.
5. **Um evento que o zod recusa**: 5xx, para o Stripe voltar a tentar depois de
   corrigirmos, ou 200 e registo?
6. **Os pedidos de teste na base de dados de produção.** Até ao lançamento, o
   site no ar grava pedidos pagos com cartões de teste no ramo `production`. O que
   lhes acontece no dia #55, e se o painel os distingue, está por decidir.
