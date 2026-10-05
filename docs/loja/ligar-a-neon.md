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

## 4. Aplicar o esquema — primeiro no desenvolvimento

- [ ] Juntar ao `package.json` o comando das migrações (`drizzle-kit migrate`,
      a ler o `DATABASE_URL_UNPOOLED`). **Ainda não existe.**
- [ ] Correr no ramo `desenvolvimento` e confirmar as 3 tabelas e as 22 regras.
- [ ] Só depois no `production`.

## 5. Importar o catálogo

- [ ] Escrever o comando que corre a importação na Neon, com o driver de
      WebSockets (a importação usa uma transação, e o driver HTTP não as faz).
      **Ainda não existe** — #28.
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

- [ ] **A entrada verdadeira** (`src/lib/sessao-painel/bd.ts`): o PIN com *hash*
      e 5 erros → 15 minutos bloqueado, por IP; o código da gerente por email,
      10 minutos, uso único, com tentativas contadas; as sessões na base de
      dados, renovadas a cada uso; sair, e «esquecer este dispositivo».
- [ ] **O comando para definir o PIN da equipa** (`npm run painel:pin`). Ainda
      não existe: até haver ecrã, é a única forma de pôr um PIN.
- [ ] **Ligá-la** no `src/lib/sessao-painel/index.ts` — é a única linha que muda.

### No contrato e no ecrã (Gonçalo) — ⚠️ ainda não existem

A `FonteSessao` (`src/lib/sessao-painel/tipos.ts`) só tem entrar e sair, e a
gestão diz «fica para a #33». O que o `painel.md` pede e falta:

- [ ] **A gerente vê as sessões abertas** — tipo de aparelho, papel, último uso
      — **e termina qualquer uma**. É o «revogar o tablet» da proposta: um
      telemóvel perdido, ou alguém que saiu da casa. Proposta para o contrato:
      `listarSessoes(ctx)` e `terminarSessao(id, ctx)`, só gerente.
- [ ] **Mudar o PIN da equipa**, que termina todas as sessões de funcionário
      ao mesmo tempo. Proposta: `mudarPin(pin, ctx)`, só gerente.

A base de dados já está preparada para as três: a sessão tem um `id` à parte
do *hash*, para o ecrã a poder mostrar e terminar sem o *hash* ir ao browser.

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
