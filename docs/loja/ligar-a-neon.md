# Ligar a Neon — o que fazer quando a conta existir

A base de dados está a ser construída e testada **sem conta nenhuma**, num
PGlite (um Postgres dentro do Node). Este ficheiro guarda o que só se pode fazer
— ou só se pode confirmar — com a Neon a sério, para nada se perder entre a
visita à loja e o dia 14/10. É uma lista viva: marca-se `[x]` no PR que faz cada
coisa.

O desenho das tabelas está em `base-de-dados.md`; aqui está só a passagem do
PGlite para a Neon.

⚠️ **Nenhum endereço de ligação nem chave entra neste ficheiro**, nem em
mensagens: o repositório é público. Os endereços vão diretamente para a Vercel e
para o `.env.local` de cada um.

## O que já existe, e só espera pela conta

- O esquema do catálogo (`src/db/esquema.ts`) e a primeira migração
  (`src/db/migracoes/0000_catalogo.sql`), com 22 regras `CHECK` — #67.
- A importação do catálogo e a comparação campo a campo com os JSON
  (`src/db/importar-catalogo.ts`, na branch `feat/importar-catalogo`) — #28.
- As tabelas da entrada no painel — sessões, códigos da gerente, limites de
  tentativas (`src/db/migracoes/0001_sessoes.sql`) — #33.
- Tudo testado no PGlite, no `npm test`.

## 1. Na visita (#26): criar a conta

- [ ] **Conta em nome da Damira**, plano **Launch** — restauro até 7 dias; o
      gratuito só volta 6 horas atrás (`robustez.md` › Backups). Convidar a
      DevPlus.
- [ ] **Postgres 18.** É a versão do PGlite em que tudo está testado; uma
      versão diferente pode comportar-se de forma diferente justamente onde os
      testes não olham.
- [ ] **Região: Frankfurt** (AWS Europe Central). É a mais perto de Portugal, e
      os dados dos clientes ficam na União Europeia (RGPD).
- [ ] **Dois ramos:** `production` (o principal) e `desenvolvimento`, criado a
      partir dele. ⚠️ Nunca se testa no de produção (`AGENTS.md`).

## 2. A região das funções na Vercel

⚠️ **O repositório não define a região, e por defeito a Vercel corre as funções
em Washington (`iad1`).** Com a base de dados em Frankfurt, cada consulta
atravessava o Atlântico — cerca de 100 ms por ida e volta, e uma página faz
várias.

- [ ] Confirmar no painel da Vercel (Settings → Functions → Function Region) e
      pôr **Frankfurt (`fra1`)**, a mesma da Neon.

## 3. As variáveis de ambiente

| Variável | Para quê | Onde |
|---|---|---|
| `DATABASE_URL` | o site (driver HTTP), endereço **com pooling** | Vercel: Production → ramo `production`; Preview e Development → `desenvolvimento`. Local: `.env.local` → `desenvolvimento` |
| `DATABASE_URL_UNPOOLED` | migrações e importação, endereço **direto** | as mesmas, e só quando for preciso correr uma |

- [ ] Pôr as duas, vazias e comentadas, no `.env.example` — no PR que ligar a
      fonte (#29).

## Os comandos

Correm no terminal de quem está a fazer a ligação, e nunca no site. O endereço
vem do `DATABASE_URL_UNPOOLED` do `.env.local` — ⚠️ **é ele que decide em que
ramo se escreve.** Cada comando que escreve mostra o servidor e a base de dados
(nunca a palavra-passe) e só avança com um «sim».

| Comando | O que faz | Escreve? |
|---|---|---|
| `npm run bd:migrar` | as tabelas: aplica as migrações que faltam | sim |
| `npm run bd:importar` | o catálogo dos JSON, e a comparação no fim — recusa-se se já houver produtos | sim |
| `npm run bd:comparar` | a base de dados contra os JSON, campo a campo | não |
| `npm run painel:pin` | o PIN da equipa, pedido escondido e duas vezes; fecha as sessões da equipa | sim |

**Para os experimentar sem conta**, com `-- --ensaio` (por exemplo
`npm run painel:pin -- --ensaio`): correm num PGlite em memória, que desaparece
no fim. É a forma de ver um comando antes do dia em que conta.

O que cada um faz está em `src/db/comandos.ts`, testado no PGlite; a entrada
pelo terminal em `scripts/bd.ts`.

## 4. Aplicar o esquema — primeiro no desenvolvimento

- [x] O comando: `npm run bd:migrar`.
- [ ] Correr no ramo `desenvolvimento` e confirmar as tabelas e as regras.
- [ ] Só depois no `production`.

## 5. Importar o catálogo

- [x] O comando: `npm run bd:importar`, com o driver de WebSockets (a
      importação usa uma transação, e o driver HTTP não as faz).
- [ ] Correr no `desenvolvimento`: a comparação tem de dar **zero diferenças**.
- [ ] No `production`: **uma vez**, antes de a casa começar a preencher os
      produtos (14/10).

⚠️ **Depois disso, nunca mais.** A importação recusa-se a correr sobre uma base
de dados com produtos, e é de propósito: apagava o que a gerente fez no painel.
Se for preciso recomeçar, é um ramo novo e vazio.

## 6. O que só a Neon pode confirmar

O PGlite é um Postgres verdadeiro, mas tem uma ligação só e corre dentro do
nosso processo. Estas ficam por provar até haver a conta:

- [ ] **Dois clientes na última vaga ao mesmo tempo**: o `CHECK` recusa o
      segundo, com duas ligações a sério (`robustez.md` › Concorrência).
- [ ] **As escritas tudo-ou-nada pelo driver HTTP** (lotes), que o PGlite não
      imita.
- [ ] **O tempo de uma página** com o site na Vercel a ler da Neon.
- [ ] **A base de dados adormece** ao fim de 5 minutos sem consultas, com o
      painel aberto: o polling não a pode acordar (regra 6 do `AGENTS.md`).
- [ ] **Restauro**, antes do lançamento: repor um ponto do passado num ramo,
      confirmar que os dados lá estão, e escrever os passos em `restauro.md`
      (`robustez.md` › Backups).

## 7. O que tem de estar ligado a 14/10

A casa começa a preencher os produtos no painel, e o que ela grava tem de ficar.

- [ ] A fonte sobre a base de dados no `src/lib/dados/index.ts` (#29, #31).
- [ ] **O modo de teste por cima da base de dados, e não no lugar dela**: o site
      fica em modo de teste até 11/11, e é nesse modo que ela vai preencher
      (revisão do #57).
- [ ] **A entrada verdadeira da gerente** (#33): o PIN da entrada provisória
      está escrito no código, num repositório público. O que falta está no
      ponto 8.
- [ ] A conta Resend da Damira, para o código da gerente chegar por email (#26).

## 8. A entrada no painel (#33) — o que falta

Até isto estar feito, o painel no ar usa a **entrada provisória**, com o PIN
escrito no código e o código da gerente no ecrã (`painel.md`). As tabelas já
existem; o resto está aqui, por quem o faz.

### No código (Sobral)

- [x] **A entrada verdadeira** (`src/lib/sessao-painel/bd.ts`): o PIN com *hash*
      e 5 erros bloqueiam o IP até ao fim da janela de 15 minutos; o código da
      gerente por email, 10 minutos, uso único, com tentativas contadas; as
      sessões na base de dados, renovadas a cada uso; sair, e «esquecer este
      dispositivo». Testada no PGlite. **Ainda não ligada.**
- [x] **O comando para definir o PIN da equipa**: `npm run painel:pin`. Até
      haver ecrã, é a única forma de pôr ou mudar um PIN.
- [ ] **Ligá-la** no `src/lib/sessao-painel/index.ts` — é a única linha que muda.
      O `criarSessaoBd` recebe: a base de dados e o `loteNeon`; os cookies do
      `next/headers` (como hoje); os emails do `EMAILS_GERENTE`; o envio do
      código pelo Resend (como o `src/lib/email.ts`, sem nunca registar o email);
      o `user-agent` dos cabeçalhos, para a lista de sessões; e `producao` para
      os cookies `secure`.

### No contrato e no ecrã (Gonçalo)

O `painel.md` pede que a gerente veja e termine as sessões e mude o PIN. A
`FonteSessao` não o tinha; passou a ter no #74.

- [x] **No contrato**: `listarSessoes`, `terminarSessao` e `mudarPin`, só para a
      gerente — a ação confirma o papel antes de chegar à entrada (#74).
- [x] **No ecrã**: «Equipa», na gestão — os aparelhos com sessão (o aparelho, o
      papel, o último uso, «este aparelho»), terminar com confirmação, e mudar o
      PIN duas vezes (#74).
- [x] **Na base de dados** (#71): a lista mostra o `id` da sessão e nunca o
      *hash*; um id sem forma de id responde «não existe» em vez de rebentar;
      um browser que não se reconhece aparece como «Aparelho desconhecido».

### Na visita (com a Damira)

- [ ] **O PIN da equipa**: ela escolhe (4 ou 6 dígitos — #25), e define-se com o
      comando, na base de dados de produção. ⚠️ Não se escreve em lado nenhum —
      nem em mensagens, nem aqui.
- [ ] **O email da gerente** → `EMAILS_GERENTE` na Vercel.
- [ ] **A conta Resend**, com o domínio dela verificado → `RESEND_API_KEY` e o
      remetente na Vercel. É por aqui que o código da gerente chega.

### Antes de ligar no ar

- [ ] Sem Resend, a entrada da gerente diz que não está disponível — ⚠️ nunca
      mostra o código no ecrã.
- [ ] No tablet da loja: entrar com o PIN; 5 erros bloqueiam; a gerente, no
      telemóvel, termina a sessão do tablet e ele volta a pedir o PIN.
- [ ] A entrada provisória sai no lançamento (#55), e com ela o aviso.
