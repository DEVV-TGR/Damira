# Recuperação automática dos emails

Implementação de 26/11/2026 (#149), no `main` desde 27/11. **Desligada por
defeito e ainda não ativada em produção.** A ativação é uma operação separada
(um PR com o `crons` no `vercel.json` e a flag, passo 6), com revisão do Gonçalo
na leitura interna de `src/lib/dados/bd-emails.ts` e na exceção operacional à
regra 6. Não altera o esquema. **É um bloqueador do lançamento**: sem ela, uma
falha recuperável só se repete quando outra ação chama o emissor.

Desde o #158 a proposta (`resposta-cliente`) também sai pelo emissor, e por isso
uma proposta que falhe de vez conta para o alerta como qualquer outro email; uma
proposta saltada (`saltado: proposta-substituida`, `saltado: proposta-fechada`)
não conta.

## O que faz e o que garante

O produtor grava o pedido e os emails na mesma transação, e a ação chama
`enviarDepois()` após o commit para o envio inicial (ligado desde 26/11, #157). A recuperação horária
é independente desse helper: uma morte depois do commit, mesmo antes do
agendamento, deixa os emails na BD para a execução seguinte. Não depende de
visitas e não precisa de um sinal em cache que possa faltar ou ficar antigo.

`GET /api/tarefas/emails` usa Node, sem cache, com duração máxima de 300 s.
A rota só importa o módulo dos dados depois de autenticar e conferir a
configuração. Não aceita filtros, destinatários, horários ou limites do pedido
HTTP. Reutiliza o emissor: reservas de dois minutos, ordem por pedido e
destinatário, UUID da fila como chave do Resend, cinco tentativas e janela de 24 h.

A expressão proposta, `17 * * * *`, chama-a ao minuto 17 de cada hora UTC; os
intervalos são de uma hora também na mudança de hora de Lisboa. ⚠️ **Ainda não
está no `vercel.json`**: a Vercel cria a tarefa no primeiro deploy de Production
que a declara, mesmo com a recuperação desligada — seriam 24 chamadas falhadas
por dia (401 ou 503) a habituar a equipa a ignorar o alerta que mais tarde conta.
A entrada `crons` entra no PR de ativação, junto com a flag (passo 6).
Uma falha pode esperar **cerca de uma hora** até à próxima tentativa. Os
2/4/8/16 minutos são esperas mínimas do emissor, não cadência prometida da tarefa.
Sem novas falhas da plataforma, as cinco tentativas cabem em cerca de cinco
horas após a criação; isto não é garantia sob indisponibilidade ou excesso de fila.

No máximo 12 lotes de dez por chamada. Não se inicia outro lote após 180 s,
incluindo pausas de 600 ms entre lotes. Cada lote tem ainda o orçamento do
emissor (45 s antes de outra linha, timeout de 10 s no Resend). O limite da rota
é a última proteção perante uma BD bloqueada. Morrer a meio deixa a reserva
retomável mais tarde, não apaga o pedido nem obriga a trocar a chave.

Um erro interrompe novos lotes; as restantes linhas do lote já selecionado
seguem o comportamento existente. Assim não se insiste em 401/403/429 nem numa
BD indisponível num ciclo apertado. Filas grandes podem precisar de várias
horas; atingir um limite devolve 503 para exigir atenção, não anuncia fila vazia.
O lote não é aumentado automaticamente e a chave nunca muda para contornar um erro.

## A exceção proposta à regra da Neon

Ao ativar esta recuperação, aceita-se **24 verificações diárias**, mesmo sem
emails. Numa fila vazia, cada execução faz uma seleção e uma verificação booleana
de falhas terminais: **48 consultas/dia**, concentradas em 24 momentos.
O objetivo é detetar trabalho persistido mesmo quando nenhum sinal externo
chegou a ser gravado. Não há polling ao minuto nem consultas durante as esperas.

Sem tráfego, se cada execução acordar a Neon por cinco minutos, são cerca de
duas horas de atividade por dia. É uma estimativa; confirmar no consumo real.
O resto da hora pode dormir. Esta exceção vale só para a reconciliação da fila,
não autoriza outros monitores ou tarefas a consultar a BD.

Só cache/`after()` deixam uma janela de trabalho perdido. Uma fila externa ou
despertadores duráveis introduzem outro sistema e continuam a precisar de
resolver a gravação entre dois serviços. Para o volume atual escolheu-se a
reconciliação simples. Se a demora de uma hora não for aceitável, rever a
cadência/custo ou acrescentar despertadores; a reconciliação e as reservas
continuam úteis. Não se deve reduzir o intervalo sem medir o efeito na Neon.

## Configuração e segurança

| Variável | Condição para executar |
|---|---|
| `VERCEL_ENV` | exatamente `production`; Preview/local recusados |
| `EMAILS_RECUPERACAO_ATIVA` | exatamente `1`; controlo operacional, desligado por defeito |
| `CRON_SECRET` | segredo aleatório, 32–256 caracteres alfanuméricos, `_` ou `-`, sem espaços |
| `DATABASE_URL` | ligação PostgreSQL à Neon e nome de BD preenchido |
| `RESEND_API_KEY` | preenchida |
| `EMAIL_REMETENTE` | endereço válido explícito; não usar remetente implícito |
| `EMAILS_SO_PARA` | se preenchida, válida; **obrigatória também em Production quando `LOJA_EM_TESTE=1`** |

O bearer tem de corresponder exatamente ao segredo, comparado por hashes de
tamanho fixo. Sem ele, 401. Com autenticação mas funcionalidade desligada ou
configuração inválida, erro sem consultar a BD/Resend. Todas as respostas são
`Cache-Control: no-store`. Parâmetros HTTP não escolhem ambiente nem destino.
`LOJA_EM_TESTE` continua a ser o único interruptor dos dados/avisos provisórios;
a nova variável só permite parar ou ativar este processo operacional.

Não publicar o segredo, URLs de ligação, corpos de erros ou dados de emails.
Os logs contêm códigos controlados e contagens agregadas. Não usar o cabeçalho
User-Agent ou o nome do cron como autorização. Não se substitui o controlo de
acesso a emails falhados do painel: esta tarefa só recebe um sinal booleano.

## Monitorização que tem de acompanhar a ativação

- HTTP 200: terminou sem trabalho elegível e sem falhas definitivas detetadas.
  **Não significa entrega no Gmail**, nem ausência de reservas em curso ou
  linhas ainda à espera da tentativa seguinte.
- HTTP 503: falha, bloqueio, limite de duração/lotes, `limite-de-tempo` (o
  emissor esgotou os 45 s antes de tratar linhas já selecionadas, que ficam
  contadas em `adiados`) ou `intervencao-necessaria`. O resumo indica contagens e motivo, sem dados pessoais.
- HTTP 401: segredo ausente/inválido ou bearer errado; não houve consulta.
- HTTP 404: execução fora de Production; não houve consulta.

Depois de terminar os lotes, se não havia avaria, consulta-se a existência de
emails não enviados com tentativas esgotadas. O filtro aplica-se **antes do
limite**, sem o risco de esconder terminais atrás de cem erros transitórios.
Os saltados ficam excluídos; desde o #158 a proposta (`resposta-cliente`) conta como os outros. A última
reserva em curso não é terminal; uma quinta reserva abandonada passa a exigir
atenção após os dois minutos. **Cada falha definitiva avisa uma vez**: só contam
as que tiveram a última tentativa nos últimos 65 minutos
(`JANELA_ALERTA_FALHA_MS`), o que apanha sempre uma execução horária. Contá-las
todas punha o cron a 503 a cada hora até alguém mexer na base à mão — não há
ainda ecrã de falhados e não se repõem `tentativas` —, e era esse alerta
permanente que ensinava a ignorá-lo. A linha continua falhada na fila; o
histórico é do ecrã dos falhados, não do cron.

**Condição de ativação para clientes:** configurar um monitor externo que
observe falhas HTTP e a ausência de uma execução bem-sucedida por mais de
duas horas. O monitor não pode consultar a Neon, nem chamar a rota para a
«testar» entre os horários. Usar os eventos/logs da tarefa ou heartbeat; não
criar um segundo agendador autenticado. Um `503` exige intervenção; a ausência
também, pois uma tarefa que não corre não produz logs. Este PR não cria nem
contrata esse serviço. Os logs da Vercel duram pouco e não substituem o alerta.

## Ativar, pausar e fazer rollback

1. Rever este compromisso de cadência/custo e a leitura interna com o outro
   responsável. Confirmar a integração do código e a conta/plano Vercel.
2. Confirmar na conta Neon qual é o ramo do ambiente; uma etiqueta Vercel não
   prova a BD. Não correr ensaios contra produção para validar este código.
3. Guardar `CRON_SECRET` no gestor de segredos e configurá-lo na Vercel. Não o
   colocar no chat, terminal partilhado, histórico do shell ou repositório.
4. Confirmar configuração Resend/remetente e o destino de teste. Durante o modo
   de teste, todos os envios, incluindo avisos à loja, vão para a caixa autorizada.
5. Configurar e ensaiar o alerta de erro/ausência. Sem ele, a operação não está
   validada para depender dos emails ao cliente.
6. Só então, num PR próprio, acrescentar ao `vercel.json`
   `"crons": [{ "path": "/api/tarefas/emails", "schedule": "17 * * * *" }]`,
   definir `EMAILS_RECUPERACAO_ATIVA=1` e fazer novo deploy. Uma expressão
   horária exige plano Vercel pago (o Hobby só aceita crons diários e o deploy
   falha). Validar no painel Vercel a tarefa horária e uma execução; separar esta confirmação de
   plataforma dos testes locais. Não chamar a rota manualmente contra a BD de
   produção como se fosse um ambiente de ensaio.
7. Antes de ligar a compra, ensaiar ainda o percurso que grava a fila e o helper
   após commit; filas de teste antigas exigem reconciliação, não reenvio em massa.

Para pausar: retirar o valor `1` e fazer deploy (a tarefa continua a chamar e
recebe 503 `recuperacao-desligada`; para a parar de vez, tirar também a entrada
`crons`); a rota deixa de importar os
dados. Isso não cancela uma execução já em curso. Não contar com alterações de
variáveis sem deploy: as versões publicadas têm a sua própria configuração.
Um rollback pode restaurar flags/segredos antigos; verificar qual deployment
serve Production e o estado da tarefa depois de cada rollback/promoção.

## Quando falha

1. Ver o motivo seguro do resumo, sem imprimir objetos do driver/Resend.
2. Confirmar tarefa, versão publicada, segredo e variáveis. Não fazer rajadas de
   chamadas manuais: cada reserva gasta uma tentativa e um erro de quota pode durar.
3. 401/403 do Resend: rever chave/domínio. 429: quota/limite do fornecedor.
   5xx/rede: a chamada horária seguinte tenta de novo, se ainda permitido.
4. `intervencao-necessaria`: consultar os UUIDs no acesso autorizado à BD/painel
   de falhados. Não apagar linhas/pedidos nem repor `tentativas` às cegas. O
   aviso não se repete na hora seguinte: tratá-lo quando chega, porque o cron
   volta a verde com a falha ainda na fila.
5. Falha incerta após aceitação, janela expirada ou 409 por conteúdo alterado:
   reconciliar com o fornecedor. Nunca trocar a chave para «fazer passar».
6. Limite de lotes/tempo: avaliar backlog e capacidade; não declarar que a fila
   escoou. Se a taxa de entrada superar a capacidade, não há promessa de 24 h.

As mensagens são recompostas do pedido atual. Se mudar entre tentativas, o
Resend pode responder 409; fica terminal. Uma fotografia persistida do conteúdo
seria melhoria de esquema própria, não uma alteração escondida neste trabalho.
A hora de envio não é prova de entrega; bounces e caixa de entrada continuam a
precisar de evidência própria.

## Futuro e limites do âmbito

Lembretes, expirações sem visitas, emails de propostas, gestão de falhados e
integração da compra têm regras e revisões próprias. Nenhuma cadência de
lembretes em aberto foi ativada. Quando os respetivos produtores gravarem a
mesma fila, esta recuperação funciona sem conhecer o tipo de ação; o emissor
continua a decidir que modelos suporta e quando salta um email.

Não há schema novo, transações entre fornecedores, chave de Resend nova ou
novo estado de pedido. A camada HTTP pode ser chamada por outro agendador no
futuro; regras de reserva e transporte ficam no emissor existente. A exclusão
do `resposta-cliente` saiu das consultas de seleção com o #158 e do sinal de
intervenção de `bd-emails.ts` ao juntar este PR com ele (27/11).

A regra «`EMAILS_SO_PARA` obrigatória em Production com `LOJA_EM_TESTE=1`»
desceu para o emissor (`executar.ts`) com o #157: vale para o envio imediato das
ações e para esta rota.

## Fontes verificadas

A documentação Vercel confirma bearer com `CRON_SECRET`, execução Cron só em
Production, ausência de repetição automática de uma invocação falhada e risco
de execuções repetidas/sobrepostas. Por isso esta rota é autenticada e mantém
as reservas/idempotência da BD; uma Preview não comprova o agendamento.
[Gestão de Cron Jobs](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs).
Cron é uma interface legada ainda suportada; Schedules é a alternativa atual
em beta. A orquestração foi separada da rota para permitir migrar sem mudar
as regras da fila. [Schedules](https://vercel.com/docs/schedules).

## Verificação desta implementação

`npm run lint`, `npm run build` e `npm test` passaram numa cópia sem `.env`: 54
ficheiros, 1.274 testes aprovados e 39 saltados. Depois da revisão (aviso só
das falhas da última hora) e junto ao `main` com o #139: 56 ficheiros, 1.332
aprovados e 39 saltados. Há 46 testes novos, incluindo
PGlite com emissor/adaptador reais e Resend simulado. Abrangem recuperação sem
visitas, reserva abandonada, 25 mensagens, chamadas sobrepostas, limite de
cinco tentativas, mais de 24 h, falhas terminais atrás de 101 transitórias e
recusas antes da importação dos dados. A revisão independente identificou o
falso sucesso após falha terminal; a regressão foi acrescentada e corrigida.
Uma segunda revisão, antes do PR, levou a: tirar a entrada `crons` do
`vercel.json`; o emissor contar as linhas `adiados` pelo limite de 45 s, para
que 0/0/0 por falta de tempo não passe por fila vazia; um teste com a sequência
real de quatro falhas e a quinta reserva (que limpa o erro, logo não dá falso
alarme); e o teste dos guardas conferir o corpo `recuperacao-desligada`.
Não houve ensaio real do agendamento nem envios Resend nesta implementação.
