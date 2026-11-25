# Restaurar a base de dados

Para quem estiver de serviço quando algo correr mal: dados apagados por engano,
uma migração que estragou uma tabela, um produto gravado por cima. **Segue-se
este papel, não a memória.** Porquê há restauro e quanto tempo para trás está em
`robustez.md` › Backups.

## Primeiro: quanto tempo para trás dá

| Plano da Neon | Até onde se volta |
|---|---|
| Gratuito (até 25/11/2026) | 6 horas, no máximo |
| Launch (o de hoje, desde 25/11/2026) | até 7 dias, **se a janela for alargada** |

⚠️ **A janela não alarga sozinha com o plano.** A casa passou ao Launch a
25/11, mas a janela continuou nas **6 horas** do plano gratuito. Muda-se na
Neon → projeto → **Settings** → **Storage** (a consola chama-lhe *restore
window* / *history retention*). Confirmar lá quanto está antes de contar com ela.

⚠️ **O relógio conta.** Com 6 horas, um erro descoberto à noite e corrigido
na manhã seguinte já não tem volta. Se algo correu mal, **começa-se pelo passo 1
logo**: um ramo criado agora guarda o ponto do passado, e já não depende da
janela.

As horas na Neon estão na hora de Lisboa (a consola mostra `Europe/Lisbon`).

## Antes de restaurar: olhar num ramo

**Nunca se restaura o `production` às cegas.** Primeiro abre-se o passado num
ramo à parte, onde se vê sem mexer em nada:

1. Neon → projeto «Damira - Loja Online» → **Branches** → **New Branch**.
2. Nome: `restauro-AAAA-MM-DD`. Auto-delete: «After 1 day» chega, a não ser
   que seja preciso mais tempo para olhar.
3. Parent branch: `production`. Escolher **«Branch data and schema from a past
   point in time»** e a hora **antes** do erro.
4. **SQL Editor**, com o ramo novo escolhido em cima, e conferir o que se
   queria recuperar (o produto, o pedido, a tabela).

O ramo é uma cópia: nada do que se faz nele chega ao site, que continua ligado
ao `production`.

## Depois, uma de duas

### A. Recuperar só umas linhas (o caso normal)

Um produto, uma categoria, uns pedidos. **É quase sempre isto**, porque o
restauro inteiro deita fora tudo o que aconteceu depois da hora escolhida,
incluindo os pedidos que entraram entretanto.

Copia-se do ramo para o `production` só o que falta, com um `insert` ou um
`update` escrito para o caso. Quem o escreve é um dos programadores; ⚠️ é uma
escrita no `production`, e vale a mesma regra das migrações: lê-se duas vezes
antes de correr.

### B. Restaurar o `production` inteiro

Só quando o estrago é grande demais para copiar linha a linha:

1. Neon → ramo `production` → **Backup & Restore** → «Restore from history».
2. Escolher a hora. **«Preview data»** antes de **«Restore»**.
3. A Neon guarda o estado de antes num ramo de reserva. **Não o apagar** até
   se terem copiado de lá os pedidos que entraram depois da hora escolhida
   (passo A, ao contrário).

O endereço da base de dados não muda: a Vercel não precisa de nada.

⚠️ **Três coisas que o restauro não sabe:**

- **O esquema também volta atrás.** Se a hora escolhida for de antes de uma
  migração, o site parte (o código espera colunas que já não existem). Correr
  as migrações outra vez (`ligar-a-neon.md`).
- **Os emails podem sair outra vez.** Um email enviado depois da hora volta à
  `emails_por_enviar` como «por enviar».
- **As fotos não voltam.** Vivem no Vercel Blob, que não tem histórico; a casa
  tem as originais (`robustez.md`).

## O ensaio — 16/11/2026

Feito para cumprir o «um backup que nunca foi reposto não é um backup» do
`robustez.md`, com o caminho de cima:

- Ramo `ensaio-restauro-2026-11-16`, a partir do `production` às **10h00**,
  criado às 13h00 (três horas para trás, dentro da janela de 6 do plano
  gratuito), com auto-delete ao fim de um dia.
- A mesma consulta nos dois ramos, só de leitura:

  ```sql
  select (select count(*) from produtos) as produtos,
         (select md5(string_agg(p::text, '|' order by p.id)) from produtos p) as impressao_produtos,
         (select md5(string_agg(v::text, '|' order by v.id)) from variantes v) as impressao_variantes,
         (select md5(c::text) from casa c) as impressao_casa,
         (select count(*) from pedidos) as pedidos;
  ```

- **Iguais nos dois**: 107 produtos, as mesmas impressões dos produtos, das
  variantes e da casa, 0 pedidos. Ninguém tinha mexido no catálogo entre as 10h
  e as 13h, por isso iguais era o resultado certo.

⚠️ **O que o ensaio ainda não provou:** que os **pedidos** voltam, porque o
`production` ainda não tem nenhum. Repete-se no dia de teste na loja (#54), já
com pedidos de teste lá dentro, antes de os tirar das contas.
