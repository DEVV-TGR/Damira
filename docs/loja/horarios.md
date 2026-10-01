# Horários — quando se pode levantar um pedido

Este ficheiro decide **que dias e que horas aparecem no calendário** e **até
quando um pedido pode ser cancelado**. As duas coisas saem do mesmo cálculo e
vivem no mesmo módulo, `src/lib/horarios.ts`.

## As três regras

1. **O tempo de produção** de cada artigo, definido pela gerente.
2. **O horário da cozinha** — quando se produz.
3. **O horário da loja** — quando se levanta.

Um pedido só se levanta numa hora em que **a loja está aberta** e **a cozinha já
teve tempo** de o fazer. Os dois horários são diferentes e nunca se confundem.

## O tempo de produção, em duas unidades

A gerente escolhe uma por artigo:

| Unidade | Para quê | Como se conta |
|---|---|---|
| `horas` | o que se faz no dia (pastéis, salgados) | horas **de cozinha aberta**, a partir do pedido |
| `dias` | o que precisa de antecedência (bolos, kits) | levantamento a partir do N-ésimo dia **de cozinha aberta** depois do dia do pedido |

**Porquê duas.** «Este bolo precisa de 3 dias» não quer dizer 72 horas nem três
vezes o horário da cozinha — quer dizer «não se encomenda para antes de quinta».
Obrigar a gerente a converter dias em horas de cozinha é pô-la a fazer uma conta
que o sistema devia fazer, e a primeira vez que errar desaparece-lhe um bolo do
calendário.

**Horas — exemplo.** Artigo de 6 h pedido às 15h00; a cozinha fecha às 18h00 e
abre às 8h00. Faz 3 h hoje e 3 h amanhã: **primeiro levantamento amanhã às
11h00**, se a loja estiver aberta. Um pedido feito com a cozinha fechada começa a
contar quando ela abre.

**Dias — exemplo.** Bolo de 3 dias pedido na segunda: terça, quarta e quinta são
dias de cozinha aberta, **primeiro levantamento na quinta**, à abertura da loja.
Se a cozinha fechar à quarta, passa para sexta. Se a casa contar de outra forma,
muda-se o número no artigo, não a regra.

**Cesto com vários artigos:** calcula-se o primeiro levantamento de cada artigo
e fica o mais tardio. Funciona com unidades misturadas.

## Vagas

O calendário mostra vagas de 30 minutos dentro do horário da loja. O tamanho é
configurável.

**Limitar pedidos por vaga** é um interruptor da gerente, desligado por defeito.
Ligado, pede o número máximo. Um pedido `pendente` ocupa a vaga enquanto espera
pelo pagamento (ver `pedidos.md`). Quem decide a última vaga é a base de dados,
não o código (ver `robustez.md`).

## Até quando se pode encomendar

A gerente define até quantos dias à frente o calendário vai (proposta: 30).

## Dias fechados

Feriados e férias: a gerente marca datas como fechadas — para a cozinha, para a
loja ou para as duas. Um dia de cozinha fechada não conta para produção; um dia
de loja fechada não tem vagas.

⚠️ **Fechar um dia não cancela os pedidos que já existem para ele.** O painel
avisa a gerente, que fala com os clientes. Cancelar pedidos pagos às escondidas
por causa de uma alteração de configuração é a pior maneira de descobrir que ela
existia.

## A loja em pausa e os esgotados

São do `painel-balcao.md`, mas tocam aqui: com a loja em pausa não se criam
pedidos — o calendário não muda, o checkout fecha e diz a que horas volta.
«Esgotado hoje» tira o artigo das vagas de hoje.

## Até quando se pode cancelar

A produção começa em:

- `horas` — o levantamento **menos** N horas de cozinha, contadas para trás;
- `dias` — a abertura da cozinha no **primeiro** dos N dias.

O cliente pode cancelar enquanto `agora` for anterior ao início da produção. Num
pedido com vários artigos conta o que começa mais cedo. (As outras regras do
cancelamento estão em `pedidos.md`.)

O mesmo cálculo alimenta o separador «Produzir hoje» do balcão.

## Um módulo, sem efeitos laterais

`src/lib/horarios.ts` recebe a configuração (horários, dias fechados, vagas
ocupadas) **e o instante `agora` como argumento**, e devolve vagas e inícios de
produção. Não lê a base de dados nem chama `new Date()` lá dentro.

É por isso que se testa, e é por isso que **a mesma função corre no browser (o
calendário) e no servidor (a validação do pedido)** — duas implementações iam
discordar no primeiro caso difícil, e o cliente escolhia uma vaga que o servidor
recusava.

⚠️ **O servidor da Vercel está em UTC, e no inverno Lisboa também.** Um
`getHours()` esquecido dá a hora certa de novembro a março e erra uma hora a
partir de **28 de março de 2027** — com a loja no ar há meses e ninguém a olhar
para isto. Tudo se calcula em `Europe/Lisbon` com uma biblioteca de fusos
horários; nunca se somam milissegundos a uma data. Mudanças de hora a testar:
25/10/2026 e 28/03/2027.

⚠️ **O calendário mostra sempre a hora de Lisboa**, também na versão inglesa. Um
cliente em Londres que vê «10:00» na hora dele levanta o bolo uma hora antes de
estar pronto.

⚠️ **Os testes deixam de ser opcionais aqui.** Entra o Vitest, e os casos mínimos
são os exemplos deste ficheiro, um dia fechado, as duas mudanças de hora, um
cesto com unidades misturadas, um pedido feito à hora de fecho e outro com a
cozinha fechada.

## Um só sítio para os horários

O horário da loja vive hoje em `casa.json` e aparece no rodapé e nos dados
estruturados. Se a gerente mudar o horário no painel e o site continuar a ler o
`casa.json`, o site diz «aberto» e o calendário diz «fechado». **Os horários
passam para a base de dados com o catálogo**, e o site lê da mesma fonte.

## À espera da Damira

- Horário da cozinha, por dia da semana
- Limite de pedidos por vaga (e se existe)
- Até quantos dias à frente se pode encomendar
- Dias de fecho e férias já previstos
