# Robustez da fila de emails — PR #141

Ensaio de 26/11/2026. Estado inicial: preparação, ainda sem resultados reais.

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

## Plano de execução

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
8. Conferir BD final, ausência de novas chamadas após conclusão, pedir verificação
   humana da caixa e retirar execução automática do build.

O script `scripts/ensaio-robustez-fila.ts` usa `executarEmissor`, `criarEmailsBd`,
driver HTTP Neon, modelos e transporte reais. Só envolve a seleção, transporte
instrumentado e falha antes da marca. A seleção real lê até 100 candidatos e só
devolve os UUIDs próprios ao emissor; não reserva nem envia outras linhas.
Uma nova execução encontra a preparação sem duplicá-la e recusa retomar
automaticamente qualquer cenário já tentado. Não há cron nem polling permanente.

## Resultados

A preencher com os logs seguros da execução. Aceitação pela API e marca na BD
não significam receção efetiva, nem ausência de duplicados no Gmail.
