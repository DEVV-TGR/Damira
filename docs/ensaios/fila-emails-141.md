# Ensaio real da fila de emails — PR #141

Executado a **25/11/2026, 23:34 (Lisboa/UTC)**; resultados consultados a 26/11.

## Âmbito e isolamento

- PR #141 aberto, sem conflitos, no commit `15dba60335f7cf36100d4ae576f7806a48a75c60`; CI e Preview verdes na confirmação inicial.
- Branch normal e descartável: `codex/ensaio-fila-emails-preview`, criada desse commit. Não integrar a preparação no `main` nem no PR #141.
- [Deployment do ensaio e logs](https://vercel.com/dev-plus1/damira/E2myZ7axqe3KvGvLzGRv8wVEwwSi), commit `009f63a9c35a7df3c3268bc6a3bfea97aa9e2342`.
- Neon: ramo **desenvolvimento**, ID `br-morning-river-zawaue5v`, projeto Damira - Loja Online. O endpoint foi confirmado na página Computes e na ligação com password ocultada; o hostname e a base do ambiente foram comparados antes de qualquer consulta do script. Preview, por si só, não serviu como prova.
- Chave Resend usada exclusivamente dentro da Vercel; nenhum `.env` existente foi lido. As variáveis foram verificadas sem revelar segredos.
- `EMAILS_SO_PARA=developerplusteam@gmail.com`, remetente `encomendas@damira.pt`, modo de teste e ramo Git conferidos antes de consultar a BD. O transporte conferiu ainda `to`, ausência de `cc`/`bcc` e o endpoint do Resend junto do `fetch`.

## Dados inventados e percurso

Pedido `5ed1de4c-9894-4821-9b39-3e6cba7c7141`, referência **DAM-2211-7Y8T**, `de_teste=true`, estado `expirado`, pagamento na loja, causa `sem-resposta-da-casa`. Prazo de resposta de 48 horas corridas; valores inteiros em cêntimos. Pessoa fictícia, endereço original `ensaio-fila-141@example.com`, sem dados de clientes.

Pedido, fotografia da linha e email foram inseridos na mesma transação, sem alterações de esquema. É uma preparação histórica terminal: não ocupou vagas nem quantidades, não fez uma compra, não confirmou pagamentos e não imprimiu talões. O pedido foi depois validado pelo leitor real, incluindo `EsquemaPedido`.

Uma única linha da fila: `de71fb7d-61eb-4441-b589-67c670107141`, modelo `expirado-cliente`. IDs fixos evitam nova preparação num redeploy. Só a seleção ficou limitada a este UUID; o script usou `criarEmailsBd` e `executarEmissor` do #141 para seleção de pendentes, reserva condicional, leitura do pedido, modelos, transporte, chave de idempotência e conclusão. O script genérico `enviar-fila-emails.ts` foi lido, mas não foi executado para evitar escoar outras linhas.

## Evidência dos logs

| Momento | Resultado |
|---|---|
| Antes | `tentativas=0`, `ultima_tentativa_em=null`, `enviado_em=null`, `ultimo_erro=null` |
| Criação da linha | `2026-11-25T23:34:16.686Z` |
| Reserva | `ultima_tentativa_em=2026-11-25T23:34:17.220Z` |
| Resend | HTTP **200**, uma única chamada real |
| Primeira execução | `enviados=1`, `falhados=0`, `saltados=0` |
| Leitura posterior na BD | `tentativas=1`, `enviado_em=2026-11-25T23:34:17.566Z`, `ultimo_erro=null` |
| Segunda execução | `enviados=0`, `falhados=0`, `saltados=0`; zero chamadas ao Resend |
| Leitura final na BD | Linha exatamente igual à leitura posterior; uma única linha para este pedido/destinatário |

Os asserts terminaram sem falhas e o deployment ficou Ready. O comando de ensaio foi depois retirado do `vercel.json` desta branch. O pedido e o email permanecem na Neon desenvolvimento; nada foi apagado para limpar o ensaio.

## O que ficou comprovado e limitações

Comprovado: uma linha válida e persistida foi reservada e enviada pelo emissor do #141, aceite pela API do Resend e marcada enviada na BD. Ao repetir o emissor depois dessa marca, não houve nova tentativa nem nova chamada à API.

**Receção no Gmail confirmada pelo Tomás a 26/11/2026, com captura às 10:56:** chegou à **caixa de entrada** de `developerplusteam@gmail.com`. A captura mostra a referência `DAM-2211-7Y8T`, o assunto com `[TESTE]` e destino original fictício, o remetente «Confeitaria Damira <encomendas@damira.pt>», o logótipo e o aviso de modo de teste. A imagem ficou na conversa, sem ser publicada no repositório. Esta confirmação humana comprova a receção na caixa, para além da aceitação HTTP 200 e da marca `enviado_em`. A ausência de novo envio na segunda execução foi comprovada pela instrumentação (zero chamadas) e pela linha da BD inalterada; não se fez uma pesquisa completa por duplicados no Gmail.

Não foi ensaiada aqui uma corrida entre emissores, uma falha depois da aceitação pelo Resend mas antes da marca na BD, nem a deduplicação do fornecedor nessa situação. A repetição comprovada é a de uma linha já marcada enviada. Não se testaram os restantes modelos nem o percurso da compra. O editor SQL da Neon ficou em Connecting sem devolver resultado; as leituras de evidência foram feitas pelo driver real na Preview e registadas nos logs.

Produção, compra, cron e polling não foram ativados nem alterados. O PR #141 e a branch anterior `codex/ensaio-resend-preview` ficaram intactos pelo ensaio. Na consulta de 26/11, o GitHub já indicava o #141 como integrado, mantendo o mesmo head `15dba60`; essa integração ocorreu fora deste ensaio.

## Verificações

Verificações numa cópia dos ficheiros versionados, sem `.env` e com dependências locais:

- `npm run lint`: passou.
- `npm test`: 47 ficheiros, 1218 testes passaram e 39 saltados.
- `tsc --noEmit`: passou.
- Build local com Turbopack: limitado pelo ambiente (primeiro resolução de dependências fora da cópia, depois rede das fontes e abertura de porta). Com dependências dentro da cópia e rede autorizada, `npm run build -- --webpack` passou.
- O `npm run build` habitual, com Turbopack, passou na Vercel antes do envio.
- `git diff --check`: sem erros.

O ensaio não acrescentou testes de produto nem alterou o código do emissor.
