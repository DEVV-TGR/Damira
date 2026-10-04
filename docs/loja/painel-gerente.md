# Painel — a vista da gerente

A gerente vê tudo o que o balcão vê (`painel-balcao.md`) e, por cima disso, a
gestão. Usa-o no tablet e no telemóvel — **tudo aqui tem de funcionar num
telemóvel**, incluindo tirar uma foto a um bolo e pô-la no site.

Ordem de construção: **Produtos primeiro.** É por lá que a casa preenche fotos,
alergénios e tempos de produção dos 95 artigos, e os testes reais só acontecem
depois disso.

## Precisa de atenção

O topo do painel da gerente é uma lista do que espera por ela, e só aparece
quando há alguma coisa:

- pedidos pagos que chegaram depois de expirar (`chegouTarde`, ver `pedidos.md`);
- possíveis pedidos duplicados (ver `robustez.md`);
- reembolsos que falharam e disputas abertas (ver `pagamentos.md`);
- pagamentos que o webhook não entregou e a verificação periódica apanhou;
- pedidos marcados para um dia que entretanto foi fechado (ver `horarios.md`);
- produtos por preencher (ver abaixo).

**Cada aviso traz as suas decisões** — um aviso que só se lê não resolve nada
(pedido do cliente a 04/10). O que ela decide tira-o da lista, e o facto fica
(`pedidos.md` › Avisos tratados):

| Aviso | Decisões |
|---|---|
| Pago depois de expirar | **aceitar o pedido** · mudar a data · cancelar e reembolsar |
| Possível duplicado | **comparar lado a lado** → «ficar com este» (o outro é cancelado e reembolsado por inteiro) · «são dois pedidos diferentes» |
| Dia que fechou | mudar a data · cancelar e reembolsar · manter neste dia |
| Reembolso falhado | «já devolvi por outra via» |

Mudar a data só deixa escolher horas em que a loja está aberta e com vaga, e o
servidor confirma ao gravar. Cancelar pergunta o reembolso — tudo, uma parte ou
nada — e diz o valor antes de confirmar. Os mesmos botões estão no detalhe de
qualquer pedido, com «reembolsar parte» para os que seguem.

## Produtos

### O que cada produto tem

| Campo | Notas |
|---|---|
| Nome, descrição, fotos | fotos tiradas no telemóvel, reduzidas no browser antes de subir |
| Carta e categoria | como hoje no `ementa.json` |
| Alergénios | lista, ou «sem alergénios» marcado expressamente |
| Vegan, sem glúten | marcados pela gerente |
| Unidade | à unidade ou ao quilo |
| Quantidade mínima e múltiplo | ex.: mínimo 6, de 6 em 6 |
| Tempo de produção | em `horas` ou `dias` (ver `horarios.md`) |
| Aparece na ementa | sim / não |
| À venda online | sim / não |
| Limitar quantidade | interruptor; ligado pede **quantos** e **por dia / no total** |
| Pede sinal | interruptor; ligado pede a percentagem (ver `pagamentos.md`) |

**«Aparece na ementa» e «à venda online» são coisas diferentes.** A ementa tem 95
artigos e nem todos se encomendam — não se encomenda um galão para sexta. Hoje
essa regra está numa tabela em `encomendavel.ts`; passa a ser este campo.

**Limitar quantidade.** Desligado (por defeito), o artigo vende sem limite e só
contam as regras de horários. Ligado: **por dia** é a capacidade da cozinha e
repõe-se sozinha todos os dias; **no total** é um stock que não se repõe (os
bolos-rei de um Natal). Se a gerente baixar o limite abaixo do que já está
vendido, o artigo deixa de estar à venda — **os pedidos já feitos nunca são
cancelados por isso**.

### Variantes e escolhas

Duas coisas diferentes, e a diferença é o preço:

- **Variantes mudam o preço** — tamanho, quilos, pessoas («Kit 20 pessoas»,
  «Kit 40 pessoas»). Cada variante tem o seu preço.
- **Escolhas não mudam o preço** — sabor, cor. É uma lista simples.

Um bolo pode ter as duas: variantes de tamanho e uma escolha de sabor. Isto evita
a explosão de combinações («Chocolate · 1 kg», «Chocolate · 2 kg», «Morango ·
1 kg»…) que ninguém consegue manter num telemóvel.

### Regras que mudam em relação ao site atual

O `AGENTS.md` tem três regras escritas para um site em que **nós** púnhamos os
dados. Com a gerente a editar, mudam — e o código que as impõe tem de mudar com
elas, no mesmo PR, ou o painel rebenta ao gravar:

1. **Vegan.** Hoje o `superRefine` só aceita `vegan: true` na carta vegan, porque
   o site não podia afirmar o que a casa não afirmava. Agora quem marca é a casa:
   a regra sai.
2. **Mínimos por categoria.** Hoje o mínimo vive em `encomendavel.ts`, por
   categoria. Passa a ser **do produto** — é o que a gerente percebe quando abre um
   artigo. A migração preenche cada produto a partir da tabela atual, para
   ninguém ter de escrever 70 mínimos.
3. **Alergénios vazios.** Continuam a não se deduzir. Ver o ⚠️ abaixo.

### ⚠️ Sem alergénios respondidos, não vai à venda online

Um produto só pode ter «à venda online» ligado se os alergénios estiverem
**respondidos**: uma lista, ou «sem alergénios» marcado de propósito. Um campo
vazio não conta como «não tem».

Na venda à distância, a informação obrigatória dos alimentos — alergénios
incluídos — tem de estar disponível antes da compra. Vender um bolo com o campo em
branco é o site a não cumprir isso. A advogada confirma; até lá, a regra fica.

### Por preencher

Um filtro com contadores — «62 sem foto · 95 sem alergénios · 40 sem tempo de
produção» — e a lista do que falta. É a lista de tarefas da casa antes do
lançamento, e é o que nos diz quando podemos fazer os testes reais.

### ⚠️ Mudar um preço tem efeito imediato — mas em três sítios

1. **O site.** As páginas são estáticas; gravar um produto revalida as páginas
   onde ele aparece. Sem isto, o site mostra o preço antigo durante horas.
2. **O checkout.** Lê sempre da base de dados (ver `pedidos.md`), por isso já
   cobra o preço novo.
3. **O cesto de quem já lá tinha o artigo.** O cesto guarda o preço que viu. No
   checkout, se o preço mudou, o cliente vê «o preço deste artigo mudou» antes
   de pagar — nunca descobre no extrato.

### ⚠️ Apagar é arquivar

«Apagar» tira o produto de todo o lado, mas não o apaga da base de dados: os
pedidos antigos continuam a apontar para ele. Um produto apagado a sério deixava
pedidos pagos a referir uma coisa que não existe.

### Fotos

- Reduzidas **no browser** (WebP, ~1600 px), enviadas diretamente para o Vercel
  Blob. Uma foto de telemóvel tem 3–8 MB e as funções da Vercel recusam pedidos
  acima de ~4,5 MB: se a foto passar pelo nosso servidor, o envio falha.
- Trocar uma foto apaga a antiga do Blob.
- As fotos que já existem em `public/` passam para o Blob na migração, para
  haver um sítio só de onde vêm as fotos.

## Pedidos

- Lista com filtros: dia, estado, referência, nome. Paginada (ver `robustez.md`).
- Detalhe do pedido, com tudo o que o balcão vê e mais o histórico (quando foi
  pago, impresso, entregue, cancelado, reembolsado).
- **Reembolsar**, total ou parcial (ver `pagamentos.md`).
- **Cancelar** (ver `pedidos.md`).
- **Reimprimir** o talão.
- **Desfazer «entregue»** depois dos 5 minutos do balcão.

## Horários

Tudo o que o `horarios.md` diz que é configurável: horário da cozinha e da loja
por dia da semana, dias fechados, tamanho da vaga, limite por vaga (interruptor),
até quantos dias à frente.

## Equipa e dispositivos

- Mudar o PIN da equipa — termina todas as sessões de funcionário.
- Lista de dispositivos com sessão aberta; terminar qualquer um.

(Ver `painel.md`.)

## Definições da loja

- **Aceitar cancelamentos pelo site** e **devolver o sinal ao cancelar** (ver
  `pedidos.md`).
- **Valor mínimo das encomendas online**, se a casa o quiser (pergunta feita à
  Damira).

## O que não está aqui

Relatórios de vendas (ficam para depois — os dados guardam-se desde o primeiro
pedido) · editar os textos das outras páginas do site · cupões e campanhas (em
aberto) · as opções dos bolos personalizados (ver `bolos-personalizados.md`).
