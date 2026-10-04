# Divisão do trabalho — quem faz o quê

Dois programadores, cada um com o seu Claude Code, no mesmo repositório. Este
ficheiro diz de quem é cada área — para o agente saber com quem está a trabalhar
e perceber quando uma tarefa entra na área do outro.

## Com quem estás a trabalhar

Vê pelo `git config user.email` ou pelo utilizador do GitHub:

| Pessoa | GitHub | Onde |
|---|---|---|
| Gonçalo | `@gncalo` | remoto |
| Sobral | `@tomasfsobra` | Porto — é quem vai à loja |

## O que entra e o que fica de fora

**Entra:** loja com pagamento (cartão, Apple Pay, Google Pay, MB WAY), calendário
de levantamento, painel do balcão e da gerente, impressão de talões, conta de
cliente com histórico no servidor e cancelamento (interruptor da gerente), bolos
personalizados (feitos já, escondidos da venda até a casa decidir), textos legais
e aviso de cookies.

**Fica de fora — não construir:** faturação automática (é manual), entregas ao
domicílio, relatórios de vendas (mas os dados guardam-se desde o primeiro
pedido), PIN individual por funcionário, campanhas por SMS.

**Em aberto:** cupões e campanhas por email.

**Sai:** o formulário de pedido por email — tudo passa pelo cesto.

**O aspeto da loja pública** é trabalhado com quem trata do marketing da casa.
Nós fazemos a estrutura, com cores e fontes num só sítio (`globals.css`); o
design vem deles. O painel é nosso.

## As áreas

| Gonçalo | Sobral |
|---|---|
| Todo o frontend: loja (cesto, variantes, calendário, checkout, conta), painel (as duas vistas), configurador dos bolos personalizados | Base de dados e migração do catálogo (JSON → BD, euros → cêntimos, horários do `casa.json` → BD) |
| Interface de `src/lib/dados/`: assinaturas e tipos que o frontend consome (os do pedido saem do `pedidos.md`), com implementação provisória a ler os JSON | Implementação de `src/lib/dados/` sobre a base de dados — troca o que está lá dentro sem mudar as assinaturas |
| Motor de horários (`src/lib/horarios.ts`) e os testes (Vitest) | Backend: produtos, pedidos, fotos (Vercel Blob), histórico da conta no servidor |
| Stripe: checkout, webhook, verificação periódica, reembolsos, sinal, cancelamento | Entrada no painel: PIN, código por email da gerente, sessões e dispositivos |
| Regras das combinações dos bolos personalizados | Impressão e talão |
| | Textos legais e cookies |
| | Tudo o que é presencial (ver abaixo) |

## A fronteira entre os dois: `src/lib/dados/`

O frontend lê e escreve **só** através das funções de `src/lib/dados/`. Do outro
lado dessas funções está a base de dados. Hoje leem os JSON; a migração troca o
que está lá dentro sem mexer nos componentes. O `produtos.ts` ficou por trás
dela: só o `json.ts` o lê. Os tipos partilhados são os schemas zod de `src/data/*.ts` e os que se
acrescentarem para pedidos, variantes e horários.

As funções auxiliares que não tocam em dados (formatar um preço, por exemplo)
ficam em `src/lib/`, fora da fronteira.

**Quem a constrói.** A fronteira é dos dois, mas cada lado tem dono. O Gonçalo
escreve a **interface** — as assinaturas e os tipos — com uma implementação
provisória a ler os JSON; o Sobral revê-a e escreve depois a **implementação**
sobre a base de dados. A ordem é esta porque o frontend é o primeiro a ficar
parado sem ela: o cesto e o calendário avançam com dados de exemplo enquanto a
base de dados não existe, e a migração chega a uma forma que já está decidida
em vez de a inventar. Se a implementação pedir uma assinatura diferente, muda-se
pela regra de baixo, não por dentro.

**Onde está.** As funções estão em `src/lib/dados/index.ts` e o contrato em
`tipos.ts` (a `FonteDeDados`). A implementação provisória é o `json.ts`, e é
**o único ficheiro que a migração troca**. Os valores que a casa ainda não deu
ficam `null`; os de exemplo vivem à parte, em `exemplo.ts`, e só correm no ar
com o modo de teste ligado (`LOJA_EM_TESTE=1`, ver `src/lib/modo-teste.ts`), que
mostra uma faixa a dizê-lo.

O contrato tem duas metades: a **loja** (`FonteLoja`) e o **painel**
(`FontePainel`, #30) — produtos, esgotados, horários, definições, pausa e os
pedidos (listar, entregar, desfazer, precisa de atenção, versão do polling). A
metade do painel está em memória em `json-painel.ts`, sobre o mesmo estado da
loja, e não persiste. ⚠️ **O papel verifica-se em `papeis.ts`**, antes de a fonte
ser chamada: a implementação sobre a base de dados recebe só as chamadas que já
passaram, e não tem de o repetir — com uma exceção, escrita no contrato: os 5
minutos do balcão para desfazer um «entregue» dependem do pedido, e verifica-os a
fonte. As contas que não precisam de dados (os separadores do balcão, os avisos
dos pedidos, o «por preencher», o fim da pausa, o dia de Lisboa) estão em
`src/lib/painel.ts`, fora da fronteira: a base de dados só tem de devolver os
pedidos certos.

- Mudar uma função de `src/lib/dados/`, um schema ou o esquema da base de dados
  → **PR próprio, revisto pelo outro** (o `CODEOWNERS` pede-o automaticamente).
- O pedido é o que está em `pedidos.md`. Ninguém acrescenta um estado ou um
  campo sem o mudar lá primeiro.

## Quando a tarefa é da área do outro

Não se recusa — os dois podem mexer em tudo. Mas **o agente avisa antes de
começar**: «isto é da área do Sobral». A seguir:

- **Pequeno e urgente** (um erro, uma linha): faz-se num ramo, e o PR pede a
  revisão ao dono da área.
- **Maior do que isso:** não se começa. Deixa-se uma issue ao dono da área com o
  que é preciso e porquê.
- **Nunca** se muda a fronteira (`src/lib/dados/`, schemas, esquema da BD,
  `pedidos.md`) do lado do outro sem ele rever.

## Revisão

**Obrigatória do outro** só em três áreas — pagamentos, base de dados e a
fronteira `src/lib/dados/` — e o GitHub impõe-na pelo `CODEOWNERS`. Tudo o resto:
merge pelo próprio, depois de `lint`, `build` e `test`.

Antes de abrir qualquer PR, revê o diff com o Claude. Não substitui a revisão do
outro onde ela é obrigatória; apanha o básico onde não é.

## Tarefas presenciais (Sobral)

1. **Impressoras** — modelo exato (foto da etiqueta), qual liga ao computador e
   qual ao tablet, em qual sai o talão; fixar o IP no router.
2. **Rede e tablet** — que tablet é, WiFi, acesso ao router; volume alto, «não
   incomodar» desligado, carregador sempre ligado.
3. **Conteúdo dos produtos** — a casa preenche fotos, alergénios e tempos de
   produção no painel. Os testes reais só acontecem depois disso; acompanhar.
4. **Contas em nome da Damira** — Stripe (com verificação da empresa), Neon
   (plano Launch), Resend. A verificação do Stripe demora: começar cedo.
5. **Marketing** — fazer a ponte com quem trata do marketing da casa.
6. **Advogada** — levar os textos legais e trazer a aprovação.
7. **Testes na loja e formação** — incluindo um reembolso de MB WAY com o saldo
   baixo (ver `pagamentos.md`).

## Etapas

| Até | O quê | Critério |
|---|---|---|
| 14/10 | Base partilhada (interface: Gonçalo; implementação na BD: Sobral), frontend com dados de exemplo, motor de horários, Stripe em modo de teste, migração para a BD, **edição de produtos no painel da gerente** | a casa pode começar a preencher produtos |
| 28/10 | Painel ligado à BD, impressão | **testes físicos**: um pedido pago em modo de teste imprime o talão na loja e aparece no painel |
| 11/11 | Bolos personalizados, cancelamento, textos legais aprovados, formação | **loja no ar** com pagamentos reais |

25/10 é dia de mudança de hora — testar o calendário nesse fim de semana.

## Em espera

- **Impressoras** → `impressao.md`
- **Respostas da Damira** (cozinha, bolos personalizados, cancelamentos,
  cupões, valor mínimo) → `horarios.md`, `bolos-personalizados.md`

## Como trabalhamos

- Um ramo por funcionalidade (`feat/…`, `fix/…`), PR. Nunca no `main`, nunca
  worktrees.
- Antes de abrir o PR: `npm run lint`, `npm run build`, `npm test`.
- Uma chamada por semana, curta: o que fiz, o que vou fazer, o que me bloqueia.
