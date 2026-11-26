# Robustez da fila de emails — PR #141

Executado a **26/11/2026, 11:10–11:13 (Lisboa/UTC)**, exclusivamente na Neon
desenvolvimento. Os seis cenários passaram no âmbito descrito abaixo; a caixa
Gmail foi inspecionada diretamente, por indicação posterior do Tomás.

## Base e método

PR #141 confirmado como integrado a 25/11/2026 às 23:45:19 UTC, merge
`79adb122a3c6aa8361332bfdfc1b3f1d88c934ef`. Branch normal
`codex/robustez-fila-emails`, criada de `origin/main` atualizado. Preservados os
ficheiros não versionados em `docs/superpowers/`; nunca se usaram worktrees.

Lidos `AGENTS.md`, os contratos `pedidos.md`, `robustez.md`, `base-de-dados.md`,
`ligar-a-neon.md`, `divisao.md`, o emissor e adaptador atuais, e o relatório e
script da branch `codex/ensaio-fila-emails-preview`. A branch antiga que envia
durante o build não foi reutilizada.

A conta Neon confirmou novamente `desenvolvimento`,
`br-morning-river-zawaue5v`, e o hostname com pooling. Preview não identifica a
BD: o script compara o hostname e a base antes da primeira consulta.
Não são publicados endereços de ligação nem credenciais. O segredo Resend
permanece na Vercel; nenhum `.env` existente é lido. A interface da Vercel
confirma variáveis Preview para BD e segredo Resend, e a caixa de desvio só em
Preview. Os valores efetivos são conferidos por asserts dentro da Vercel antes
de qualquer consulta/envio. A revelação pela interface exigia 2FA e foi cancelada.

## Preparação e execução

1. Validar recusas de produção, hostname divergente e falta de caixa de desvio,
   antes de construir o driver; testar também a recusa do emissor com uma fonte
   instrumentada que conta consultas.
2. Preparar cinco fotografias históricas terminais, com IDs exclusivos, dados
   inventados, `de_teste=true`, dinheiro inteiro e linhas validadas. Cada pedido,
   linhas e emails entram numa transação. Não ocupam vagas nem quantidades.
3. Resend real aceita; uma camada descartável lança antes da escrita da marca
   enviada. O emissor persiste a falha. Não se apaga nem repõe marca nenhuma.
4. Dois emissores concorrentes terminam a seleção antes de disputar a mesma
   linha na Neon. Conferir uma reserva, uma tentativa e uma chamada real.
5. Simular HTTP 503 antes do fetch real; comprovar erro persistido e bloqueio
   do antecessor/fila durante a espera. Reservar outro antecessor sem enviar e
   comprovar que também bloqueia o sucessor.
6. Esperar efetivamente a reserva de dois minutos, sem consultas durante a
   pausa. Retomar com a mesma chave e conteúdo; comparar SHA-256 do corpo,
   respostas HTTP e ID do Resend; conferir recuperação e ordem.
7. Enviar os modelos `criado-confirmado-cliente` e `criado-loja`, ambos desviados
   para a caixa autorizada. São recibos históricos de um pedido entretanto
   cancelado, não uma nova compra nem uma confirmação de estado por este ensaio.
8. Conferir BD final, ausência de novas chamadas após conclusão, verificar a caixa
   autorizada e retirar execução automática do build.

O script `scripts/ensaio-robustez-fila.ts` usa `executarEmissor`, `criarEmailsBd`,
driver HTTP Neon, modelos e transporte reais. Só envolve a seleção, transporte
instrumentado e falha antes da marca. A seleção real lê até 100 candidatos e só
devolve os UUIDs próprios ao emissor; não reserva nem envia outras linhas.
Uma nova execução encontra a preparação sem duplicá-la e recusa retomar
automaticamente qualquer cenário já tentado. Não há cron nem polling permanente.

## Execuções e origem da evidência

- Primeira Preview, commit `564f18c`: [logs da preparação interrompida](https://vercel.com/dev-plus1/damira/GSZACGfwbQjy4TCfExsDhPw8TxiC).
  Passou os guardas mas a referência inventada continha `1`, excluído pelo
  formato Damira. A validação anterior à transação interrompeu a execução;
  nenhum marco de pedido preparado nem chamada Resend. Corrigiram-se só os
  dados do ensaio. O formato foi reproduzido localmente e as cinco fotografias
  corrigidas passaram pelo `EsquemaPedido` antes da nova Preview.
- Ensaio concluído, commit `850f75bd65606403e50cbc710720c4215b819828`:
  [deployment e logs](https://vercel.com/dev-plus1/damira/A8DHd3dRukeCQRi45fmEsA6cpQyg),
  **Ready**, 2 min 33 s. Todos os asserts passaram. Os logs abaixo foram lidos
  na interface da Vercel, incluindo as leituras finais devolvidas pela Neon.
- O resumo final, às 11:12:56 UTC, contou **9 chamadas reais**, todas HTTP 200,
  para **8 emails distintos**, e **1 resposta 503 simulada**, sem rede. A
  repetição final contou zero enviados/falhados/saltados e nenhuma nova chamada.
- O script escreveu «Gmail por confirmar» porque não lê a caixa. A verificação
  posterior no browser, autorizada expressamente pelo Tomás nesta conversa,
  acrescenta a prova de receção descrita abaixo. Não é confirmação humana.

### Identificadores e dados

Todos os UUIDs desta tabela usam o prefixo
`26112026-0141-4141-8141-` seguido do sufixo de 12 algarismos indicado. Por
exemplo, email 11 = `26112026-0141-4141-8141-000000000011`.
As chaves idempotentes de preparação dos pedidos têm sufixos 101 a 105;
a chave de idempotência **do Resend é sempre o UUID do email**, sem mudar.

| Cenário | Pedido (sufixo) | Referência | Emails (sufixos) | Modelos |
|---|---|---|---|---|
| Marca falha após aceitação | 000000000001 | DAM-2211-RAAA | 000000000011 | expirado-cliente |
| Emissores concorrentes | 000000000002 | DAM-2211-RBAA | 000000000021 | expirado-cliente |
| Falha temporária e ordem | 000000000003 | DAM-2211-RCAA | 000000000031, 000000000032 | criado-por-confirmar-cliente, expirado-cliente |
| Antecessor reservado e ordem | 000000000004 | DAM-2211-RDAA | 000000000041, 000000000042 | criado-por-confirmar-cliente, expirado-cliente |
| Cliente e loja | 000000000005 | DAM-2211-REAA | 000000000051, 000000000052 | criado-confirmado-cliente, criado-loja |

São dados inventados: pessoa fictícia, endereços `example.com`, telefone de
exemplo, uma fotografia de linha de 2 kg, 1.700 cêntimos/kg, total 3.400
cêntimos. Os primeiros quatro pedidos estão expirados, criados a 22/11 às
09:00 UTC e prazo 48 h depois; levantamento guardado a 27/11 às 10:00 UTC.
O quinto nasceu historicamente confirmado e está cancelado desde 23/11 às
09:00 UTC. Todos foram relidos pela fonte real e validados pelo contrato.
Não houve pagamento, talão, compra ou transição de produto neste ensaio.

### 1. Resend aceita e falha a marca na BD — passou

**Objetivo:** retomar sem duplicar quando a API já aceitou, mas a marca de
conclusão não foi escrita. Preparação: email 11 novo, tentativa zero, marcas
nulas. Execução: emissor/Resend reais; só `marcarEmailEnviado` é envolvido por
uma função descartável que lança **antes de chamar a escrita real**.

| Marco UTC | Evidência |
|---|---|
| 11:10:40.957 | Reserva real, tentativa 1 |
| 11:10:41.962 | Resend HTTP 200; ID `01a2178c-eee8-7df3-bcc8-3116a24c83f6` |
| Após aceitação | Falha **simulada** antes da escrita; `enviado_em=null`, `ultimo_erro=falha-interna`, tentativa 1 |
| Repetição imediata | Zero enviados e zero chamadas; reserva/espera respeitada |
| 11:12:45.382 | Nova reserva real, tentativa 2, **124,425 s** após a anterior |
| 11:12:46.319 | Resend HTTP 200, **mesmo ID**; marca enviada real, erro limpo |

Corpo serializado idêntico nas duas chamadas, SHA-256
`e59d6504c091ac9b1b8892348ec69a718a36a50d13b7de01aa1227aeb907ddc4`.
Chave igual ao UUID 11 nas duas chamadas. Janela de idempotência respeitada:
ambas ocorreram cerca de dois minutos após a criação, dentro das 24 h.
**Gmail:** uma única mensagem, inclusive após atualizar a pesquisa em todas as
pastas e abrir a conversa depois da repetição. A combinação de mesmo ID do
fornecedor, mesmo corpo, BD final e uma mensagem na caixa comprova este caso.
Limitação: é uma exceção na camada do ensaio, não uma avaria real da Neon;
não cobre conteúdo alterado nem repetição fora de 24 h.

### 2. Dois emissores sobre a mesma linha — passou

**Objetivo:** só um reservar e enviar. Os dois `executarEmissor` correram com
`Promise.all`; uma barreira aguardou que ambos tivessem lido a mesma linha 21,
antes de qualquer reserva. Cada operação SQL usa o driver HTTP real da Neon.
Resultados das duas reservas: `[false,true]`; resumos: um `enviados=0`, outro
`enviados=1`, ambos sem falhas. Não se fabricou uma resposta de reserva.

Reserva vencedora às 11:10:42.282, uma tentativa; uma única chamada Resend,
HTTP 200 às 11:10:43.247, ID `01a2178c-f3f5-7176-a38d-abf0116dbcc8`.
A BD devolveu `enviado_em=11:10:43.246`, `tentativas=1`, erro nulo.
A diferença de 1 ms é entre o relógio monotónico do emissor e o registo do
wrapper. Gmail: uma mensagem RBAA.
Limitação: dois emissores concorrentes no mesmo processo Node e pedidos HTTP
reais à Neon; não são duas instâncias Vercel independentes nem um teste de carga.

### 3. Falha temporária, espera e recuperação — passou

**Objetivo:** persistir a falha e recuperar sem antecipar a nova tentativa.
Email 31, seguido do 32 no mesmo pedido/destinatário. O wrapper devolveu
**503 simulado, antes de fazer fetch**, às 11:10:43.733. Não se atribui esta
resposta ao Resend. A reserva real de 11:10:43.486 ficou com tentativa 1,
`enviado_em=null`, `ultimo_erro=resend-503`.

Uma execução imediata devolveu zero envios. O sucessor 32 manteve tentativa
zero, sem reserva. Após uma pausa real, sem consultas, nova reserva do 31 às
11:12:46.554 (**123,068 s** após a anterior). Resend real HTTP 200 às
11:12:47.525, ID `01a2178e-d96b-785c-ad2e-13e104773e0a`; a BD marcou enviado
e limpou o erro. O corpo manteve SHA-256
`69da15c080d678e90d960ffa1e94f4ac45f69fdb14c6d9a6ecf931e76f8b2f8c`.
Gmail: recibo RCAA e posterior expiração, duas mensagens distintas.
Limitação: ensaiou-se a primeira espera real de 2 minutos, não as seguintes
4/8/16 minutos nem uma indisponibilidade real do fornecedor.

### 4. Ordem com antecessor em espera ou reservado — passou

**Objetivo:** impedir o envio do sucessor antes do antecessor do mesmo pedido
e destinatário. Com a falha do 31, o 32 não foi reservado. Após recuperação,
os HTTP 200 foram, por ordem, 31 às 11:12:47.525 e 32 às 11:12:49.168
(ID do segundo: `01a2178e-dfd1-7781-9ba6-b31f9834318c`).

No segundo par, reservou-se 41 diretamente com o adaptador real às
11:10:44.130, sem fazer envio, representando um trabalhador que parou após a
reserva. O emissor para `[41,42]` não enviou nada; 42 continuou em tentativa
zero. A espera delimitada terminou a partir de 11:12:45.130. Nova reserva do
41 às 11:12:49.325 (**125,195 s** após a primeira). Enviaram-se 41 às
11:12:50.295, ID `01a2178e-e436-7267-b65b-82c96ee361f5`, e só depois 42 às
11:12:51.965, ID `01a2178e-eaa2-7135-8caa-c8b40daa7bfa`, ambos HTTP 200.
Gmail: duas mensagens RDAA distintas.

Limitações: ordem de envio/aceitação, não garantia de ordem de entrega na
caixa. A reserva abandonada é preparada explicitamente pelo ensaio; não se
matou um processo real. Os recibos iniciais já precediam os sucessores em
`criado_em`; não se ensaiou aqui a prioridade especial com timestamps invertidos.

### 5. Modelos de confirmação e aviso à loja pela fila — passou

Emails 51 e 52 preparados na mesma transação do pedido 5 e das suas linhas;
destinatários originais distintos e fictícios. Os guardas junto do fetch
conferiram que ambos tinham exclusivamente a caixa autorizada em `to`, sem
`cc` ou `bcc`. O destino original foi escrito no assunto pelo produto.

- `criado-confirmado-cliente`: HTTP 200 às 11:12:53.119, ID
  `01a2178e-ef21-7651-91dc-4e2039130102`, uma tentativa e marca enviada na BD.
- `criado-loja`: HTTP 200 às 11:12:54.764, ID
  `01a2178e-f5ad-7597-b720-0991543b78c4`, uma tentativa e marca enviada na BD.

Ambos foram abertos individualmente no Gmail: logótipo, aviso de teste,
referência REAA, levantamento 27/11 10h00, 34 € **indicativos** e os dados
inventados. O cliente diz pagamento na loja, sem adiantamento, e fila habitual;
o aviso à loja contém as observações para não produzir/contactar ninguém.
Limitação: prova os modelos e transporte pela fila; não prova o fluxo da compra,
a criação da fila por uma transição nem a impressão. São recibos históricos
numa fotografia terminal, deliberadamente sem reserva de capacidade.

### 6. Proteções do ensaio — passou

Antes da construção do driver, `validarEnsaioDaFila` recebeu cópias em memória
da configuração, alterando uma condição de cada vez:

| Condição simulada | Recusa | BD / Resend |
|---|---|---|
| `VERCEL_ENV=production` | `ensaio-so-no-desenvolvimento` | zero consultas/envios |
| URL com hostname diferente do confirmado | `servidor-diferente-do-desenvolvimento-confirmado` | zero consultas/envios |
| `EMAILS_SO_PARA` vazia | `sem-destino-seguro` | zero consultas/envios |

Também se chamou o emissor real sem caixa de desvio, com uma fonte que conta
qualquer seleção: `bloqueado=sem-destino-seguro`, contador **zero**, sem
chamada Resend. Estes guardas são testes automáticos **na Preview real com
configurações inválidas simuladas**; nunca se executou um teste em produção.
O hostname corresponde ao desenvolvimento confirmado na conta; os valores
reais de desvio/remetente foram conferidos por asserts antes da primeira query.

## Evidência final da BD

Todas as datas abaixo são **26/11/2026, UTC/Lisboa**. As leituras finais reais
da Neon têm `ultimo_erro=null` e `enviado_em` não nulo em todas as oito linhas.
Nenhuma marca enviada foi apagada ou reposta. Os cinco pedidos e oito emails
permanecem no desenvolvimento; nada foi apagado para limpar.

| Email (sufixo curto) | Tentativas | Última reserva | Enviado em |
|---|---:|---|---|
| 11 | 2 | 11:12:45.382 | 11:12:46.319 |
| 21 | 1 | 11:10:42.282 | 11:10:43.246 |
| 31 | 2 | 11:12:46.554 | 11:12:47.525 |
| 32 | 1 | 11:12:47.603 | 11:12:49.168 |
| 41 | 2 | 11:12:49.325 | 11:12:50.295 |
| 42 | 1 | 11:12:50.373 | 11:12:51.965 |
| 51 | 1 | 11:12:52.122 | 11:12:53.119 |
| 52 | 1 | 11:12:53.197 | 11:12:54.764 |

## Receção efetiva no Gmail

A pedido posterior do Tomás («podes ver tu isso»), verificou-se diretamente a
caixa no browser, após a repetição, cerca das **11:13–11:14 UTC**. Pesquisa:
`in:anywhere {subject:RAAA subject:RBAA subject:RCAA subject:RDAA subject:REAA}`.
Resultado: **8 conversas**, todas com etiqueta **Caixa de entrada**, sem
indicador de várias mensagens por conversa. Para RAAA, pesquisa individual
`in:anywhere subject:RAAA`, atualização dos resultados e abertura: **uma
conversa com um único cabeçalho/corpo de mensagem**, datada de 11:10. Os dois
emails REAA foram também abertos individualmente.

| Referência | Mensagens observadas | Conteúdo |
|---|---:|---|
| RAAA | 1 | Expiração, sem duplicado após a repetição |
| RBAA | 1 | Expiração, sem duplicado na corrida |
| RCAA | 2 | Recibo por confirmar e expiração |
| RDAA | 2 | Recibo por confirmar e expiração |
| REAA | 2 | Confirmação ao cliente e aviso à loja |

Isto comprova receção na caixa observada naquele instante, além da aceitação
API e BD. Não é uma observação infinita nem exclui uma anomalia futura.
Não se publicam capturas integrais da caixa nem dados de outros emails.

## Verificações e estado final

Cópia dos ficheiros versionados em `/private/tmp/damira-robustez-141`, sem
`.env`, com dependências copiadas e variáveis de BD/Resend removidas dos
comandos locais. Não existia `_local/boas-praticas/` neste checkout.

- `npm run lint`: passou.
- `npm run build` normal com **Turbopack**: passou localmente, 41 páginas.
- `npm test`: **48 ficheiros, 1.228 testes passaram, 39 saltados**.
- `tsc --noEmit`: passou; repetido após corrigir os dados fictícios.
- ESLint do script: passou novamente após a correção.
- Validação das cinco fotografias pelo `EsquemaPedido`: passou localmente.
- Preview real: todos os asserts do ensaio e o `npm run build` passaram.
- `git diff --check`: sem erros na preparação; conferir também no fecho.

O produto não foi alterado; não surgiu defeito de produto nestes cenários.
Não se mexeu em esquema, compra, produção, automações nem configuração de
segredos. Mantêm-se as limitações já documentadas no produto, incluindo a
necessidade de tentativas automáticas dentro de 24 h antes de ligar a compra.

Fecho: execução automática removida de `vercel.json`; o comando `build` do
`package.json` continua `next build`. A confirmar o commit/Preview final sem
ensaios e o estado final do checkout antes de fechar a conversa.

