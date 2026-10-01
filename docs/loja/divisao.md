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
| Motor de horários (`src/lib/horarios.ts`) e os testes (Vitest) | Backend: produtos, pedidos, fotos (Vercel Blob), histórico da conta no servidor |
| Stripe: checkout, webhook, verificação periódica, reembolsos, sinal, cancelamento | Entrada no painel: PIN, código por email da gerente, sessões e dispositivos |
| Regras das combinações dos bolos personalizados | Impressão e talão |
| | Textos legais e cookies |
| | Tudo o que é presencial (ver abaixo) |

## A fronteira entre os dois: `src/lib/dados/`

O frontend lê e escreve **só** através das funções de `src/lib/dados/`. Do outro
lado dessas funções está a base de dados. Hoje leem os JSON; a migração troca o
que está lá dentro sem mexer nos componentes. O `produtos.ts` atual muda-se para
lá. Os tipos partilhados são os schemas zod de `src/data/*.ts` e os que se
acrescentarem para pedidos, variantes e horários.

As funções auxiliares que não tocam em dados (formatar um preço, por exemplo)
ficam em `src/lib/`, fora da fronteira.

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
| 14/10 | Base partilhada, frontend com dados de exemplo, motor de horários, Stripe em modo de teste, migração para a BD, **edição de produtos no painel da gerente** | a casa pode começar a preencher produtos |
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
