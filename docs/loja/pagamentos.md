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
dias depois, muito depois de o pedido expirar aos 30 minutos. A proposta excluiu-o
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
   - **Expira em 31 minutos** — o mínimo que o Stripe aceita é 30, e um minuto de
     folga evita uma recusa por relógios desacertados. Os nossos 30 minutos de
     `pedidos.md` continuam a ser a regra.
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
- **Voltou atrás** → o servidor expira a sessão no Stripe e o pedido passa logo a
  `expirado`.

⚠️ **Porquê expirar logo.** Um pedido `pendente` ocupa a vaga e as quantidades
durante 30 minutos. Quem volta atrás para mudar uma coisa e tenta outra vez
encontrava a última vaga ocupada… pelo seu próprio pedido abandonado.

## Confirmar: o webhook

`src/app/api/stripe/webhook/route.ts`.

- Lê o corpo **em bruto** (`await req.text()`) e verifica a assinatura com o
  segredo do webhook. Um pedido sem assinatura válida é recusado.
- Guarda o id de cada evento processado; um evento repetido é ignorado.
- Responde depressa. O Stripe volta a tentar durante dias se não receber 2xx.

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

| Ambiente | Chaves | Webhook |
|---|---|---|
| Local | teste | Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
| Teste (ramo fixo na Vercel) | teste | endpoint próprio no Stripe em modo de teste |
| Produção | reais | endpoint de produção |

⚠️ **As pré-visualizações da Vercel estão protegidas por login, e o Stripe não
faz login.** O webhook do ambiente de teste leva o segredo de *bypass* da Vercel
no endereço: `…/api/stripe/webhook?x-vercel-protection-bypass=<segredo>`. Sem
isto, o Stripe recebe 401 e nenhum pedido de teste passa a pago. O tablet da loja,
nos testes físicos, entra no ambiente de teste da mesma forma
(`x-vercel-set-bypass-cookie=true`, uma vez).

Cada ambiente tem o seu segredo de webhook; trocá-los é a causa mais comum de
«o pagamento passou mas o pedido não entrou».

## Emails

Só os nossos — confirmação ao cliente, aviso à loja. Os recibos automáticos do
Stripe ficam desligados, para o cliente não receber dois emails diferentes sobre
o mesmo pagamento.

## Testes antes do lançamento

Com o Vitest, o que não depende do Stripe: cálculo do sinal e do resto, a
transição `marcarPago` com eventos repetidos, fora de ordem e depois da expiração.

No ambiente de teste, com o Stripe CLI e na loja:

- cartão aceite, cartão recusado, cartão com 3D Secure;
- MB WAY aceite e recusado (números de teste do Stripe);
- Apple Pay num iPhone verdadeiro;
- sessão que expira; voltar atrás no checkout;
- webhook repetido (`stripe events resend`) — um talão só;
- pagamento confirmado depois de o pedido expirar → `chegouTarde`;
- reembolso total e parcial.

Já em modo real, na loja: um pagamento com cartão, um com MB WAY (e ver o que a
app MB WAY mostra ao cliente na aprovação) e um reembolso de MB WAY — este com o
saldo baixo, para vermos o painel mostrar a falha.
