# Robustez — regras que valem para tudo

O volume desta loja é pequeno: dezenas de pedidos por dia, umas centenas numa
semana de Natal. O que a parte não é a carga — é o caso raro: dois clientes na
última vaga, um webhook que não chega, um tablet sem rede, um serviço que atinge
o limite num sábado. As regras abaixo são para esses casos. **Não são para
«escalar»**: não se acrescentam filas, réplicas ou camadas de cache que este
volume não pede.

## A base de dados só acorda quando há trabalho

⚠️ **A Neon cobra (e, no plano gratuito, corta) pelo tempo em que a base de dados
está acordada**, e ela só adormece depois de 5 minutos sem consultas. Qualquer
coisa que a consulte de poucos em poucos minutos mantém-na acordada o dia
inteiro. As contas, por alto: com o painel aberto 14 horas por dia a consultá-la,
são 14 h × 0,25 CU × 30 dias ≈ 105 horas de computação por mês — o plano
gratuito tem 100, e quando acabam **a base de dados fica suspensa até ao mês
seguinte**, com a loja parada.

Por isso, nada que corra sozinho vai à base de dados sem necessidade:

- **O polling do painel não lê pedidos.** Pergunta por um número de versão
  servido a partir da cache da Vercel, e só vai à base de dados quando a versão
  muda (ver `painel.md`).
- **A verificação periódica de pagamentos pergunta primeiro ao Stripe** e só
  consulta a base de dados se houver pagamentos para ver (ver `pagamentos.md`).
- **O monitor de uptime não toca na base de dados** (ver «Monitorização»).

## Concorrência: a última vaga

⚠️ **«Ver se há vaga» e depois «reservar» vende a mesma vaga duas vezes.** Dois
clientes veem a última vaga livre, os dois carregam em pagar, os dois passam a
verificação. Quem decide tem de ser a base de dados, de uma só vez:

- Vagas e quantidades por dia são **contadores** com uma restrição `CHECK`
  (`ocupadas <= limite`, ou sem limite quando o interruptor está desligado).
- Criar o pedido é **uma transação**: soma aos contadores e insere o pedido. Se
  um contador passar o limite, a restrição falha, a transação inteira cai e
  ninguém fica com meia reserva. O cliente vê «esta vaga acabou de ser ocupada» e
  o calendário atualiza-se.
- Isto funciona com o driver HTTP da Neon, que só faz transações não
  interativas: não é preciso ler e depois decidir — a base de dados recusa.
- Expirar ou cancelar um pedido desconta nos contadores, na mesma transação que
  muda o estado.

Outros casos de duas pessoas ao mesmo tempo, já resolvidos noutros ficheiros:
dois toques em «entregue» (atualização condicional), o mesmo evento do Stripe
duas vezes (`pedidos.md`), a gerente a mudar um preço enquanto um cliente paga (o
pedido guarda o preço do momento; o checkout avisa se mudou).

## Envios e pagamentos duplicados

- Todos os botões que enviam ficam **desativados com indicador** até haver
  resposta.
- **Criar pedido:** o browser gera uma chave quando o cliente entra no checkout e
  envia-a com o pedido. Uma segunda chamada com a mesma chave devolve o mesmo
  pedido e a mesma sessão Stripe (índice único).
- Sessão Stripe, reembolsos: chave de idempotência (`pagamentos.md`).
- Eventos do Stripe: guardados por id, com chave primária.
- ⚠️ **Dois pedidos pagos iguais são legítimos para o sistema** — o cliente
  abriu dois separadores. Mesmo email, mesmos artigos, mesma vaga, pagos com
  menos de 10 minutos de diferença → «possível duplicado» em «Precisa de
  atenção». A gerente decide e reembolsa.

## Limites de pedidos (rate limiting)

Contadores na base de dados, numa tabela só, por chave e janela de tempo. Em
memória não servem: na Vercel cada pedido pode cair numa instância diferente.

| O quê | Limite |
|---|---|
| PIN do balcão | 5 erros → 15 min bloqueado (`painel.md`) |
| Código da gerente | envios por hora e tentativas por código (`painel.md`) |
| Criar pedido | 5 pendentes por IP e 3 por email ao mesmo tempo |
| Fotos dos bolos personalizados | por pedido e por IP |

⚠️ **Porquê limitar a criação de pedidos.** Um pedido pendente reserva vaga e
quantidades durante 30 minutos. Sem limite, um robô — ou alguém com má intenção
— esvaziava o calendário da loja sem pagar um cêntimo. O campo-armadilha que já
existe em `pedidos.ts` continua.

## Serviços externos e os seus limites

| Serviço | O limite que importa | O que fazemos |
|---|---|---|
| Neon | gratuito: 100 h de computação/mês, restauro de 6 h | plano Launch (ver «Backups») + a regra do topo |
| Resend | gratuito: 100 emails/dia, 3.000/mês, 3 domínios | ver ⚠️ abaixo |
| Stripe | pedidos por segundo — irrelevante a este volume | a verificação periódica pagina os resultados |
| Vercel Blob | dentro do crédito do Pro | — |
| Vercel (logs) | o Pro guarda só 1 dia de logs | ver «Logs» |

⚠️ **Resend.** A conta da DevPlus é partilhada por todos os clientes: os 100
emails por dia são de todos. Cada pedido gasta 2 (cliente e loja), mais os
códigos da gerente — um sábado de Natal chega lá, e a partir daí os emails
simplesmente deixam de sair. **A Damira tem a sua própria conta Resend**, com o
domínio dela. Se passar os 100 por dia, o plano pago é custo dela.

⚠️ **Um email que falha nunca faz falhar um pedido.** O email sai depois de o
pedido estar gravado; se falhar, fica registado e volta a tentar-se. Quem manda é
o painel, não a caixa de correio.

## Erros

- As acções do servidor devolvem um resultado (`{ ok: true, … }` ou
  `{ ok: false, erro: "codigo" }`) e não lançam exceções para o browser. Os
  textos vêm das mensagens (`next-intl`), em PT e EN, como já faz o `pedidos.ts`.
- `error.tsx` na loja, na conta e no painel: nunca uma página em branco.
- ⚠️ **Um erro nunca esvazia o cesto nem apaga o que o cliente escreveu.**
- **Pedidos que falham por rede:** as leituras repetem sozinhas (o polling); as
  escritas **não se repetem às escondidas** — mostram o erro e «Tentar outra
  vez», com a mesma chave de idempotência. No painel, «Entregue» sem rede falha à
  vista, nunca em silêncio.

## Carregamento

- Cada botão que envia: desativado e com indicador até à resposta.
- Listas e painel: esqueletos com a forma do conteúdo, nunca ecrã branco.
- Página de sucesso do pagamento: «A confirmar o pagamento…» (`pagamentos.md`).

## Estados vazios

Cada um com uma frase e, quando faz sentido, uma saída:

- Cesto vazio → caminho para a loja.
- Calendário sem vagas → «Sem vagas nos próximos dias — ligue-nos: …».
- Categoria sem produtos à venda → a categoria não aparece.
- Histórico da conta vazio → frase simples.
- «Precisa de atenção» vazio → não aparece.

⚠️ **Painel vazio não é o mesmo que painel sem ligação.** «Sem pedidos para hoje»
leva sempre «atualizado às 10:42». Uma lista vazia sem hora não distingue um dia
calmo de um tablet desligado.

## Consultas, índices e paginação

- **Driver HTTP da Neon** (`@neondatabase/serverless`), nunca um cliente com
  ligação persistente — na Vercel cada função abria a sua e um pico esgotava-as.
- **Sem N+1:** a lista do painel traz pedidos e linhas numa consulta, ou em duas
  em lote — nunca uma por pedido.
- **Índices** — os que as consultas usam, e mais nenhum:
  - `pedidos(referencia)` único · `pedidos(stripe_session_id)` único ·
    `pedidos(chave_idempotencia)` único
  - `pedidos(estado, levantamento_em)` — listas do balcão
  - `pedidos(email)` — histórico e possíveis duplicados
  - `linhas_pedido(pedido_id)`
  - `eventos_stripe(id)` chave primária
  - `sessoes(token)` único · `limites(chave, janela)` único
  - `produtos(slug)` único
  - contadores: `(dia, hora)` e `(produto, dia)` únicos

  Os índices únicos são também a última barreira contra duplicados.
- **Paginação por cursor** (`criado_em`, `id`) no arquivo do balcão, nos pedidos
  da gerente e no histórico do cliente. As listas de hoje não paginam — o dia já
  as limita.

## Cache

- **Em cache:** as páginas públicas (ementa, produtos), revalidadas quando a
  gerente grava (`painel-gerente.md`); o número de versão do painel.
- ⚠️ **Nunca em cache:** vagas, quantidades, o estado de um pedido, o checkout e
  tudo o que está em `/painel`. Uma vaga em cache é uma vaga vendida duas vezes,
  ou recusada a quem a viu livre.

## Monitorização

- **Monitor de uptime externo** (plano gratuito) à página inicial e a
  `/api/saude`, com aviso por email à DevPlus. O `/api/saude` responde só se a
  aplicação está de pé — ⚠️ **não consulta a base de dados**, ou um monitor de 5
  em 5 minutos mantinha-a acordada para sempre.
- **Heartbeat da verificação de pagamentos:** no fim de cada execução, a tarefa
  agendada avisa um serviço de heartbeat externo (ex.: Healthchecks.io, plano
  gratuito). Se o aviso não chegar durante uma hora, o serviço avisa a DevPlus. É
  a única forma de saber que uma tarefa que devia correr *deixou* de correr.
- Os erros da base de dados aparecem no Sentry (ver «Logs»), não no monitor.

## Logs

- ⚠️ **A Vercel (Pro) guarda os logs só 1 dia.** Um erro de sexta à noite já não
  existe quando alguém olha no domingo. Os erros vão para o Sentry (plano
  gratuito), com aviso por email.
- **Nunca nos logs:** email, telefone, NIF, moradas, dados do Stripe para além
  dos ids. Regista-se a referência `DAM-…`, que chega para encontrar tudo.

## Backups e restauro

⚠️ **A proposta promete cópias diárias com 7 dias de histórico. O plano gratuito
da Neon só permite voltar 6 horas atrás.** A base de dados de produção fica no
plano **Launch** (pago pelo uso, sem mínimo): restauro até 7 dias. Com a regra do
topo a deixá-la dormir, o custo cabe nos 3–10 €/mês previstos. A conta Neon fica
em nome da Damira.

⚠️ **Um backup que nunca foi reposto não é um backup.** Antes do lançamento,
restaura-se a base de dados para um ponto no passado num ramo da Neon, confirma-se
que os pedidos estão lá, e escrevem-se os passos em `docs/loja/restauro.md`.
Quem estiver de serviço num sábado segue esse papel, não a memória.

As fotos (Vercel Blob) não têm histórico: uma foto trocada desaparece. É
aceitável — a casa tem as originais.
