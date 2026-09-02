# Fingerprints

Every site you build with **scrollcraft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| damira-inicio | Chaptered editorial | Fólio na margem, desenhado pelo vapor, clicável; desaparece no telemóvel | Folha de rosto tipográfica em tijolo, sem imagem acima da dobra, com dois atalhos | 13 secções / 10 capítulos, 19,0 alturas de ecrã, três actos presos apenas | Colofão em tinta, chamada em texto corrido, a marca a desenhar-se sozinha pelo `--sc-p` | **O vapor**: as três ondas do logótipo esticadas na margem, desenhadas pela rolagem, a mudar de papel (fio, fólio, vapor do pão no pico, marca no fecho) | Fotografia real da casa, sem nada gerado | Next.js 16 + next-intl, motor servido de `public/` |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Gramática:** editorial em capítulos.
- **Fólio na margem como navegação** — e, em particular, um fólio *desenhado
  pelo próprio movimento de assinatura*. Uma próxima build que queira fólio tem
  de o fazer de outra maneira.
- **Movimento de assinatura:** o traçado por rolagem sobre a marca da casa, com
  mudança de papel ao longo da página. O traçado por `stroke-dashoffset` sozinho
  não está tomado; **a marca a mudar de função** está.
- **Fecho em colofão** com a chamada em texto corrido e a marca a desenhar-se
  pelo progresso do acto.
- **Banda de comprimento:** 10 capítulos a 19 alturas de ecrã. É larga de mais
  para ser saudável (o tecto da skill são 14) e só existe porque o cliente pediu
  que a página inicial fizesse o trabalho todo. **Não repetir sem a mesma
  razão.**
- **Chão por capítulo, a cortar a seco**, tirado de uma paleta medida em vez de
  escolhida. Nove chãos, sem `data-sc-drift` nenhum.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scrollcraft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
