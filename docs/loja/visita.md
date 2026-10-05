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

O Gonçalo envia à parte o que a cliente precisa de levar para as contas — esta
lista junta-se à dele, para a casa não receber duas.

- [ ] **Para a Stripe** (a verificação da empresa demora — é a primeira a
      abrir): os dados da empresa (NIPC, certidão permanente), o IBAN da conta
      da empresa e a identificação do representante legal. Confirmar com a
      lista do Gonçalo.
- [ ] **Para a Neon**: um email da casa para a conta, e um cartão para o plano
      Launch (pago pelo uso; previsão de 3 a 10 €/mês — `robustez.md`).
- [ ] **Para a Resend**: ⚠️ **o domínio decidido, e o acesso a quem o gere** —
      o registo do domínio, ou a pessoa que o tem. A Resend só envia depois de
      verificar o domínio no DNS, e **o domínio final ainda não está decidido**
      (`src/lib/site.ts`). Sem ele, o código da gerente não chega por email.
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
- [ ] **Resend**: a conta, e o domínio dela, com os registos do DNS
      acrescentados.
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

Nasceu do esquema da base de dados (`base-de-dados.md` › Em aberto):

- [ ] **«Só fazemos 30 por dia»: o dia é o de levantamento, ou o de produção?**
      Num bolo de três dias, os dois não são o mesmo.

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
