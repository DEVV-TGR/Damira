# A visita à loja — o que levar, o que fazer, o que perguntar

A visita à Damira, prevista para 7, 8 ou 9 de outubro de 2026 (Sobral). É a que
abre as contas em nome da casa e traz as respostas que travam a loja. Junta as
tarefas presenciais de `divisao.md` e as issues #25, #26 e #46 numa lista só,
para levar na mão. Marca-se `[x]` no que ficar feito, e o que ficar por fazer
passa para a visita seguinte.

⚠️ **Nada de chaves, palavras-passe nem do PIN aqui, nem em mensagens.** O
repositório é público. As chaves vão diretamente para a Vercel; o PIN escreve-o
a casa, e não fica escrito em lado nenhum.

## Antes da visita: o que a Damira deve ter à mão

A lista junta a do Gonçalo (#73) à nossa, para a casa receber uma só.

- [ ] **Para a Stripe** (a verificação da empresa demora — é a primeira a
      abrir): o NIF/NIPC e o **código da certidão permanente**; o IBAN da
      conta da empresa; o cartão de cidadão do responsável legal; um telemóvel;
      a morada da empresa; e uma descrição curta do negócio.
- [ ] **Para a Neon**: um email da casa para a conta, e um cartão para a
      faturação do plano Launch (pago pelo uso; previsão de 3 a 10 €/mês —
      `robustez.md`).
- [ ] **Para o domínio e a Resend**: ⚠️ **a casa não tem domínio**, e a Resend
      só envia com um domínio verificado. Decide-se na visita (ver o ponto 1);
      para o registo, um email e um cartão.
- [ ] **O acesso ao router** (a palavra-passe de administração), ou quem a
      tenha.
- [ ] **O tablet e as impressoras** ligados, com o carregador.

## Na visita

### 1. As contas (#26), por esta ordem

- [ ] **Stripe**: abrir a conta e começar logo a verificação. Convidar a
      DevPlus com o papel de programador (`pagamentos.md` › A conta).
- [ ] **Neon**: plano **Launch**, **Postgres 18**, região **Frankfurt**, dois
      ramos — `production` e `desenvolvimento`. Convidar a DevPlus. O porquê de
      cada escolha está em `ligar-a-neon.md` › 1.
- [ ] **O domínio**: escolhê-lo (`damira.pt`? `confeitariadamira.pt`?) e
      registá-lo **em nome da casa**, como as outras contas, com a DevPlus a
      gerir o DNS. É ele que o site vai ter, e o remetente dos emails.
- [ ] **Resend**: ⚠️ **criar a conta com o email da gerente.** Enquanto o
      domínio não estiver verificado, o Resend só entrega ao email de quem
      criou a conta — e é por email que chega o código para ela entrar no
      painel. Assim, o código chega-lhe mesmo que o domínio demore, e a casa
      pode começar a preencher os produtos a 14/10.
- [ ] **Resend, depois**: verificar o domínio (os registos no DNS). Só então o
      código chega a qualquer gerente da lista, e os emails saem com o nome da
      casa.
- [ ] Em cada conta, a DevPlus entra como membro com o papel de programador.
- [ ] ⚠️ As chaves vão **diretamente para a Vercel** — nunca por mensagem, nem
      por papel.

### 2. O painel

- [ ] **O PIN da equipa**: 4 ou 6 dígitos. Escolhe-o e escreve-o a casa. Se a
      Neon de produção já estiver pronta nesse dia, corre-se ali
      `npm run painel:pin` (`ligar-a-neon.md` › Os comandos); se não, combina-se
      como o pedir depois — nunca por escrito.
- [ ] **Os emails com acesso de gerente** (`EMAILS_GERENTE`): só a Ana, ou a Ana
      e a Andreia?

### 3. As perguntas (#25)

Enviadas à Andreia a 03/10, ainda sem resposta:

- [ ] O horário da **cozinha**, por dia da semana; os dias de fecho e as férias
      já previstos.
- [ ] O limite de pedidos por meia hora (existe? quantos?), e até quantos dias
      à frente se encomenda (proposta: 30).
- [ ] Os cancelamentos pelo site, o sinal, o valor mínimo, os cupões.
- [ ] Os bolos personalizados: as opções, as combinações que fazem, o preço.

Ficaram por mandar:

- [ ] **Os tempos de produção** de cada tipo de produto — kits, bolos, boxes,
      artigos da carta. Sem eles, o calendário só oferece horas «a confirmar».
- [ ] Um bolo de «3 dias» pedido na segunda levanta-se na quinta **à abertura
      da loja**, antes de a cozinha abrir nesse dia — é assim que contam?
- [ ] O sinal noutros produtos além dos bolos personalizados (os kits de festa
      grandes, por exemplo).

Da revisão do contrato, a 05/10 (Gonçalo e Sobral):

- [ ] **O limite por dia**: nos produtos que levam vários dias (bolos, kits),
      «só fazemos 30 por dia» conta pelo **dia de levantamento**, ou pelo dia em
      que se **começa a fazer**? Hoje conta pelo de levantamento; na pastelaria
      do dia os dois são o mesmo.
- [ ] **Sabores à dúzia**: nos salgados fritos e nos folhados vegan, é **uma
      dúzia por sabor** (12 de alheira + 12 de legumes), sem misturar sabores na
      mesma dúzia?
- [ ] **O «croissant recheado»** da carta da casa: que recheios há? Separam-se
      em produtos, como na carta vegan (chocolate / creme)?
- [ ] **Sabor obrigatório**: num produto com sabores, o cliente tem sempre de
      escolher um? (O site vai pedir o sabor ao juntar ao cesto.)
- [ ] **Reembolsar depois de cancelar**: depois de cancelarem um pedido sem
      reembolso (o bolo já estava feito), querem poder devolver uma parte mais
      tarde?
- [ ] **Números estrangeiros**: há muitos clientes com telefone de fora? (A
      página aceita qualquer país, com o indicativo, mas convém saber.)

E um aviso a dar, não uma pergunta:

- [ ] **Os alergénios têm de ser preenchidos no painel.** É informação
      obrigatória antes da venda online, e o painel não deixa gravar um produto
      à venda sem eles respondidos (`painel-gerente.md`).

### 4. A loja física (#46)

- [ ] **As impressoras**: uma fotografia da etiqueta de cada uma. TM-m30III ou
      TM-m30II? Se for a II, que variante — `-H`, `-NT`, `-SL`? É isso que
      decide se o talão vem do servidor ou do tablet (`impressao.md`).
- [ ] **Qual liga ao computador, qual ao tablet, e em qual sai o talão** (ou se
      nas duas).
- [ ] **O IP fixo** da impressora, no router.
- [ ] **O tablet**: o modelo e o browser; o WiFi a chegar bem ao balcão; volume
      alto e fixo; «não incomodar» desligado; sempre a carregar.

### 5. Contactos para depois

- [ ] **A advogada** (#52): os textos legais ainda não estão escritos, mas
      convém saber a quem os entregar, e quando.
- [ ] **Quem trata do marketing** da casa (`divisao.md`, tarefa 5).

## Depois da visita

- [ ] Cada resposta entra no ficheiro de `docs/loja/` de onde saiu a pergunta,
      num PR (é o critério da #25).
- [ ] As chaves na Vercel, e **a região das funções em Frankfurt** — esta não
      precisa da visita (`ligar-a-neon.md` › 2).
- [ ] Os comandos, pela ordem de `ligar-a-neon.md`: o ramo `desenvolvimento`
      primeiro, depois o `production`.
- [ ] O `impressao.md` deixa de dizer que está incompleto, com o modelo e a
      ligação das impressoras (é o critério da #46).
