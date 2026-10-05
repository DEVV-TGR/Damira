# O planner da Damira, no Notion

A Andreia pediu para acompanhar o site sem ter de nos perguntar. Desde outubro de
2026 há uma página no Notion que ela vê e comenta: o que está feito, o que falta,
o que precisamos dela e imagens de cada coisa nova. **Este ficheiro diz como se
mantém**, para que os dois — e os dois Claudes — o façam da mesma maneira.

Se uma regra daqui deixar de ser verdade, corrige-se aqui no mesmo dia. É a mesma
regra do `AGENTS.md`: um guia desatualizado engana com mais autoridade do que
nenhum.

## Onde está

| O quê | Endereço |
|---|---|
| Página principal | https://app.notion.com/p/3ee9f31cdeb88123b2d2eb30da89c029 |
| ✅ Tarefas | `collection://30a8b256-6e3c-4af6-9b4d-6ec27722b4b9` |
| 📸 Progresso | `collection://d10ff5e9-0beb-492b-a6c7-1719b64fec4a` |
| 💬 Pedidos e comentários | `collection://0b6ed1e6-fad7-47a5-8fce-315acd742603` |

A página é privada: só entra quem foi convidado pelo email.

## Custo zero, e a condição que o mantém

O plano grátis do Notion chega para isto, **desde que o espaço tenha um só membro**
(o Gonçalo). Com dois ou mais membros, o plano grátis passa a ter um limite de
1000 blocos, e um planner com imagens chega lá depressa.

- **Toda a gente entra como convidado da página**, nunca como membro do espaço:
  o Sobral, a Andreia e quem vier. Partilhar → email → *Pode comentar* (cliente)
  ou *Pode editar* (nós).
- O convite vai para um email, e é **com esse email** que se entra. Entrar com
  outro dá «sem acesso».
- Até 10 convidados e ficheiros até 5 MB. As prints vão em JPG, nunca em PNG
  da página inteira.

## O que há lá dentro

**A página principal é um painel**, em duas colunas:

- À esquerda: **Ações rápidas** (deixar um pedido, abrir o site, ver o que falta
  responder) e o **Menu** com as cinco partes.
- À direita: **Esta semana**, a **próxima etapa** e a **meta** (loja aberta a
  11/11).

⚠️ **As caixas da direita são texto escrito à mão, não se atualizam sozinhas.**
Reescrevem-se em cada atualização e têm de bater certo com o «Estado» das
Tarefas. Uma caixa a dizer «feito» com a tarefa «em curso» foi exatamente o erro
que já apareceu uma vez.

| Parte | Para quê |
|---|---|
| 🙋 Precisamos de vocês | As perguntas em aberto da #25, em caixas por tema. A Andreia marca e responde em comentário |
| ✅ Tarefas | Uma linha por issue do GitHub, mais o que já estava feito antes das issues |
| 📸 Progresso | Um ponto por funcionalidade, com prints |
| 🗓️ Calendário | As três etapas (14/10, 28/10, 11/11) |
| 💬 Pedidos e comentários | Onde a Andreia deixa alterações, dúvidas, ideias e problemas |

## Como se escreve

Quem lê é a cliente, não um programador.

- **Sem jargão.** «O total do pedido é calculado no nosso servidor, para ninguém
  conseguir mudar um preço», e não «`cotarCesto` no servidor». Nomes de ficheiros,
  funções e PRs ficam só na coluna «Ref.».
- **Nunca valores do contrato, preços do nosso trabalho nem segredos.** A página é
  privada, mas pode ser reencaminhada.
- **O que depende dela diz-se como tal**, com o estado «À espera da Damira» e na
  página «Precisamos de vocês». É isso que ela vem procurar.

## ✅ Tarefas — como se mantêm

**A fonte é o GitHub.** O Notion espelha as issues; não se inventam tarefas que
não existam lá, a não ser as do lado da Damira.

| Situação no GitHub | Estado no Notion |
|---|---|
| Issue aberta, sem PR | Por fazer |
| PR aberto (em revisão) | Em curso — e no «O que é» acrescenta-se «em revisão» |
| PR fundido / issue fechada | Feito |
| Depende de uma resposta ou ação da Damira | À espera da Damira |

- **Ref.** — `#36 · PR #58`. É o que liga as duas pontas, por isso nunca fica vazia.
- **Responsável** — coluna **Pessoa** do Notion (com tag, para notificar), a partir
  do *assignee* da issue. Só se pode marcar quem já foi convidado para a página.
- **Prioridade** — *Alta* para o que trava a loja (respostas e contas da Damira,
  base de dados, calendário, compra, pagamento, lançamento), *Baixa* para o que
  pode esperar (bolos personalizados, envio de fotografias), *Média* para o resto.
- **Prazo** — é uma fórmula a partir da «Etapa». Não se escreve à mão: muda-se a
  etapa e o prazo vem atrás.
- **Vistas** — *Por etapa* (a predefinida, agrupada), *Quadro* (por estado) e
  *Tabela*.

## 📸 Progresso — um ponto por funcionalidade

Cada funcionalidade que fica **visível** ganha um ponto próprio — «Carrinho de
compras», «Página de compra com calendário (sem pagamento)», «Pagamento em modo de
teste» — e não um resumo da semana. A Andreia percebe mais com uma imagem do que
a coisa faz do que com um parágrafo sobre ela.

O que **não tem nada para ver** (base de dados, webhooks, cópias de segurança) não
ganha ponto: entra no texto do resumo da semana.

Cada ponto leva:

1. **Título** — o nome da coisa, como a cliente lhe chamaria.
2. **Estado** — *Em revisão* (PR aberto) → *No site de teste* → *No ar*.
   *Resumo* é só para os resumos da semana.
3. **Tarefas** — a relação às linhas das Tarefas que o ponto aborda. O
   **Responsável** do Progresso vem daí sozinho (é um *rollup*).
4. **No topo do conteúdo, uma caixa 🔗 cinzenta** com links para cada tarefa e a
   tag do responsável. Os dois aparecem também na galeria, mas dentro da página é
   onde se clica.
5. **O que faz** — 3 a 5 pontos, na linguagem dela. Se estiver em modo de teste,
   uma caixa amarela a dizê-lo e porquê.
6. **Prints** — computador **e** telemóvel. Uma delas também como **capa**, na
   coluna «Imagens», que é o que aparece na vista *Galeria*.

### As prints

- Tiram-se **do ramo do PR**, compilado (`npm run build`), com o servidor em
  `npx next start -p 4500`. Com `LOJA_EM_TESTE=1` no build **e** no start, para
  aparecerem a faixa e os prazos de exemplo, que é o que ela vai ver no ar.
- Playwright com o Chromium em cache (ver o fim do `AGENTS.md`), 1440×900 e
  390×844, `deviceScaleFactor: 2`, JPG a ~78 %, `timezoneId: 'Europe/Lisbon'`.
- **Ver as prints antes de as enviar.** A primeira do carrinho saiu sem o cartão
  aberto, e só se deu por isso a olhar para ela.
- Não trocar o ramo de quem está a trabalhar só para tirar prints. Se o ramo do PR
  não for o atual, usar `git archive` para uma pasta temporária e compilar lá —
  nunca `git worktree` (ver o `AGENTS.md`).

## 💬 Pedidos e comentários

- Ler em **cada** atualização. Um pedido novo passa a *Visto* quando é lido e a
  *Feito* quando está no site, sempre com uma resposta em comentário.
- O que der trabalho a sério vira **issue no GitHub**, e o pedido ganha a
  referência no comentário. O Notion é a conversa; o GitHub é onde se trabalha.
- Comentários soltos da Andreia nas páginas também se respondem, no mesmo sítio.

## Atualizar com o Claude

O conector do Notion já vem com o plugin de engenharia. A primeira vez:
`/mcp` → **notion** → autorizar com a conta convidada para a página.

Depois basta pedir: **«atualiza o planner da Damira»**. O Claude deve:

1. Ver as issues e os PRs (`gh issue list`, `gh pr list`) e o que mudou desde a
   última vez.
2. Atualizar Estado, Ref. e «O que é» nas Tarefas, pela tabela de cima.
3. Criar um ponto no Progresso por cada funcionalidade nova visível, com prints.
4. Reescrever as caixas da direita da página principal.
5. Ler os Pedidos e comentários e dizer o que a Andreia pediu.

## As armadilhas do conector

Todas apareceram na primeira montagem. Nenhuma dá erro: o resultado fica só
diferente do que se pediu.

- **`RENAME COLUMN` e `ADD COLUMN` com o mesmo nome, na mesma chamada, apagam a
  coluna antiga** em vez de a renomear. Foi assim que se perdeu o texto dos
  responsáveis. Uma mudança por chamada, e confirmar entre elas.
- Uma **relação** pede o id da base **sem** o prefixo `collection://`.
- A coluna de **ficheiros** (a capa) não aceita o upload na criação da página: cria-se
  a página e junta-se depois, com `update_properties` e
  `{"type": "file_upload", "file_upload": {"id": …}}`. E cada upload só serve uma
  vez: a capa precisa de um upload próprio, à parte das imagens do texto.
- **Não acrescenta perguntas a formulários** nem **põe ícones em bases de dados**.
  Isso faz-se à mão no Notion.
- Antes de substituir o conteúdo de uma página (`replace_content`), as bases e
  subpáginas têm de constar do texto novo, senão são apagadas.
