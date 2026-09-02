# BRIEF — Damira, a nova página inicial

Entrevistado a 2 de setembro de 2026. **Não é auto-escrito**: as oito respostas
abaixo são escolhas do cliente, não deduções minhas.

---

## As oito respostas

### 1. Ambiente, em três a cinco palavras

> **Alegre, colorido, de bairro.**

Escolhido contra "bairro, vinte anos, sem pose", "manhã, calor, farinha no ar" e
"confeitaria fina, ouro e escuro".

⚠️ Combina com a resposta 6 (**editorial tipográfico**) e não a contradiz: o que
pediu é **cartaz**, não *minimal*. Letra grande e papel, mas com cor a sério e
alegria — não o contido do site atual.

### 2. A sequência da rolagem, nas palavras dele

> **A porta, o pão, as mãos, o raro, a festa, a morada.**

Chega-se à fachada, entra-se, vê-se o pão, descobre-se que é feito ali, depois a
carta vegan, depois as festas até setenta pessoas, e por fim onde é.

### 3. A curva de energia

Implícita na sequência escolhida: abre em cheio na porta, sobe até ao pão (o
pico), acalma nas mãos, volta a subir no raro e na festa, e assenta na morada.
Não pediu uma página alta do princípio ao fim.

### 4. O que devem sentir, e o momento que levam

> **O pão a encher o ecrã.**

O pão da aldeia em grande, o mesmo desenho que está na placa da porta. É o
negócio que dá nome à casa: pão quente.

**A frase que a pessoa diz a um amigo:** "há um site de uma pastelaria em que o
pão te toma o ecrã todo e o vapor te leva pela página abaixo."

### 5. Uma coisa que nenhum outro site faça

> **O vapor conduz a página.**

As três ondas do logótipo — que são o vapor do pão quente — são o fio condutor:
sobem, dobram, e viram sublinhado, divisória e seta ao longo de toda a rolagem.
A marca a fazer o trabalho de navegação.

### 6. Quão longe do premium-minimal

> **Editorial tipográfico.** Cartaz: letra grande, papel, o texto como imagem.

### 7. Um mundo contínuo, ou cenas distintas?

> **Cenas distintas.** Capítulos com cortes, cada secção a comportar-se de
> maneira diferente da anterior.

### 8. Que material já existe

> "tens fotografias em fotos, e podes usar placeholders"

Cinco fotografias reais da casa, **todas com a marca de água da Damira**, que é
a prova de origem:

| Ficheiro | O que é | O que serve |
|---|---|---|
| `01.webp` | vitrine, pão da aldeia, e "VINTE ANOS DE DOCES MOMENTOS" na parede | **o pico** |
| `02.webp` | mão do pasteleiro a pincelar brilho em tarteletes de morango | o fazer |
| `03.webp` | bombons dourados em travessa | a doçaria fina |
| `04.webp` | prato de peixe grelhado com couve | o almoço |
| `06.webp` | a fachada, com "HISTÓRIAS COM SABOR." pintado na montra | a porta |

Mais a marca em `public/marca/` (logótipo, logótipo assinado, ondas) como
máscaras de alfa — é dela que sai o vapor da assinatura.

⚠️ **Sem `ffmpeg` e sem chave da kie.ai nesta máquina**, portanto **zero vídeo e
zero imagem gerada**. Nenhum acto de `scrub` de vídeo. Isto não é uma limitação
lamentável: é o que o `AGENTS.md` deste projeto já mandava — o site não anuncia
o que a casa não fez.

---

## O que a casa diz por si própria

Duas frases que **não escrevi eu**: estão fotografadas, uma na montra e outra na
parede da loja. São o material tipográfico deste cartaz, e valem mais do que
qualquer coisa que eu inventasse.

- **HISTÓRIAS COM SABOR.** — pintado a itálico no vidro da montra.
- **VINTE ANOS DE DOCES MOMENTOS** — na parede, ao fundo da vitrine.

---

## Silêncio autorizado

Há **um** silêncio deliberado, e a verificação tem de o distinguir de rolagem
morta: **meia altura de ecrã quase vazia entre a porta e o pão**, com o vapor a
subir sozinho e uma linha pequena. O `feel.md` exige que o pico tenha de onde
chegar, e o pico é o pão. Escrito aqui para que a verificação saiba que aquele
ecrã quase vazio é intenção e não falha de carregamento.

⚠️ Na primeira versão deste ficheiro o silêncio estava entre as mãos e a carta
vegan. Mudou de sítio quando o pico ficou fixado: um silêncio que não serve o
pico é só um buraco.


---

# O PLANO

## Gramática: **editorial em capítulos** (`uniqueness.md` §2.2)

A página é uma peça impressa. O capítulo é a unidade, os cortes são secos, e
cada capítulo assenta no seu próprio fundo e fica lá.

**Porque as outras sete perderam:**

| Gramática | Porque não |
|---|---|
| Filmic one-shot | Proíbe cortes visíveis, e a resposta 7 foi **cenas distintas**. Carrega ainda ónus de prova por ser o desvio por defeito da skill. |
| Live surface | Não há produto de software nenhum para correr. |
| Continuous world | Exige `worldflight` e vídeo. Sem `ffmpeg` e sem chave, é impossível — e a resposta 7 recusou-a de qualquer forma. |
| Typographic poster | Era a candidata mais forte ("cartaz", "letra grande"). **Perdeu porque proíbe fundo fotográfico**, e o pico escolhido é uma fotografia a encher o ecrã. Uma gramática que proíbe o pico é a gramática errada. |
| Gallery / catalog | O percurso escolhido é narrativo (porta, pão, mãos, raro, festa, morada), não uma coleção percorrível. A ementa é que é a galeria, e já existe noutra página. |
| Split stage | Não há dois lados em tensão. |
| Rhythmic cutlist | Quer 12 a 20 cortes curtos e proíbe `pin` e `dwell`. O pico pedido é um plano segurado, exactamente o que esta proíbe. |

**A tensão que fica, e não escondo:** o §2.2 diz que a imagem *vive na sua
coluna com legenda* e não sangra por baixo do texto. O pico é uma fotografia a
sangrar. Resolvo como o impresso resolve há um século: o pico é uma **estampa de
página inteira**, sem uma letra por cima, com a legenda na margem. O que o §2.2
proíbe é texto deitado sobre imagem, e não existe aqui nenhum.

**Família estética:** maximalista e alegre (`uniqueness.md` §5), não
premium-minimal. Seis fundos que cortam a seco.

⚠️ **Sem inventar uma única cor.** O "colorido" sai da paleta medida dos
impressos, um fundo por capítulo, mais a cor que já está dentro das fotografias
(o morango, o dourado, a côdea). O verde entra **só** no capítulo vegan, que é a
regra do `AGENTS.md` cumprida à letra e não por acaso.

## Cromagem: **acento de duas paragens**

O `taste.md` fecha o acento num só valor, **com uma excepção**: uma página que
corta entre fundos claros e escuros não consegue 4,5:1 nos dois com uma
paragem. É exactamente este caso. Uma matiz, duas claridades:

| Fundo | Tinta | Acento |
|---|---|---|
| papel `#FAFBFB` | tinta `#1F1D1B` | tijolo `#923D38` (6,87:1) |
| tinta `#1F1D1B` | papel `#FAFBFB` | tijolo clareado |
| verde `#698842` | tinta (só títulos grandes) | papel |
| tijolo `#923D38` | papel `#FAFBFB` | papel |

⚠️ Ao reinscrever `--sc-ink` num capítulo é obrigatório reinscrever também
`color:` no mesmo bloco. O `taste.md` documenta isto como falha silenciosa: a
cor herda-se já resolvida e o capítulo invertido renderiza a 1,15:1.

## Movimento de assinatura: **o vapor**

As três ondas do logótipo — que são o vapor a sair do pão, e são o *m* de
*damira* — deixam de ser um desenho e passam a ser o fio da página.

Um SVG fixo na margem, da altura do ecrã, com os três traços de
`public/marca/ondas.svg` esticados. O `stroke-dashoffset` é conduzido pela
posição de rolagem, portanto **rolar desenha o vapor**. Em cada fronteira de
capítulo o fio carimba um marcador que fica lá, com o numeral e o título: é o
fólio que o §2.2 exige como navegação, e é clicável, portanto é navegação a
sério. No pico, os três traços **nascem do pão** e sobem. No colofão, convergem
e assentam no logótipo, em travamento exacto.

Muda de papel ao longo da página: fio, filete de capítulo, sublinhado do título,
e por fim marca. É essa mudança de papel que o torna deste site e de mais
nenhum, e não um parâmetro trocado num dispositivo do kit.

**A frase para contar a um amigo:** "é o site da pastelaria em que o vapor do
pão te desenha a página à medida que desces, e no fim assenta no logótipo."

## Portão de impressão digital

`scrollcraft/FINGERPRINTS.md` está **vazio**: é a primeira build deste
workspace, portanto não há linha nenhuma contra a qual falhar. O portão é
cumprido por não haver nada repetido, e não por argumento. A linha fica escrita
no fim, e é ela que passa a constranger a próxima.

## A curva de sentir

Escrita antes da partitura, como manda o `feel.md` §1.

```
0  Folha de rosto   Curiosidade   a frase da própria montra, enorme, sem imagem nenhuma
I  A porta          Chegada       a fachada entra por corte, com a placa a ler-se
—  (silêncio)       Suspensão     meia altura de ecrã vazia, só o vapor a subir
II O pão            Apetite       o pão enche o ecrã inteiro, sem uma letra por cima
III As mãos         Intimidade    uma mão a pincelar morango, perto, e a escala cai
IV O raro           Surpresa      o verde entra de repente e o número conta-se: 49 de 95
V  A festa          Confiança     o tijolo, e os kits a atravessar de lado até 70 pessoas
VI A morada         Acolhimento   tudo pára, o vapor assenta na marca, e diz onde é
```

Sem dois sentires iguais seguidos. O silêncio é o único ecrã sem argumento, e
existe para o apetite ter de onde chegar.

## A partitura

| # | Batida | Dispositivo | Porquê este | Vão |
|---|---|---|---|---|
| 0 | Folha de rosto | `flow` + `kinetic` (linhas) | O §2.2 exige folha de rosto: tipografia no papel, sem imagem acima da dobra | ~1,0 |
| I | A porta | `reveal` (limpeza) + `parallax` na coluna | Uma limpeza é mudança de estado, e chegar à porta é isso | 1,6 |
| — | Silêncio | nenhum | O vazio é o dispositivo | 0,5 |
| II | O pão | `pin`, com escala conduzida por `--sc-p` | **O pico.** O maior vão da página, com folga visível | 3,4 |
| III | As mãos | `flow` + `in` com escalonamento | Depois do pico, o registo desce para documento. É o contraste que faz o pico | 1,4 |
| IV | O raro | `count` + `kinetic` | 49 de 95 é um número **verificado**, contado do `ementa.json` | 1,6 |
| V | A festa | `pan` | Travessia lateral lê-se como *amplitude*; vertical lê-se como *argumento* | 2,4 |
| VI | A morada | `pin` curto | Colofão. O fecho segura em vez de desvanecer | 1,2 |

**Contas:** 8 actos, ~12,6 alturas de ecrã. Dentro do orçamento de 8 a 14, e
**fora** da banda de 6-7 actos a 13,6-13,8 que a skill marca como impressão
digital das builds anteriores.

**Famílias distintas:** `flow`, `kinetic`, `reveal`, `parallax`, `pin`, `count`,
`pan` — sete, contra o mínimo de quatro. Nenhuma repetida em actos seguidos.
**Zero actos de `scrub`**, porque não há vídeo nenhum nesta máquina.

## Números, e só os verdadeiros

| Número | De onde vem |
|---|---|
| **1996** | `casa.json` → `desde` |
| **49 de 95** | contado do `ementa.json`: 49 artigos `vegan`, 95 no total |
| **70 pessoas** | `encomendas.json`, o maior escalão dos kits de festa |
| **07h às 21h** | `casa.json` → `horarios`, iguais nos sete dias |

⚠️ **"Vinte anos" não entra.** Está escrito na parede da loja na fotografia
`01.webp`, mas a casa abriu em 1996: são trinta. A frase da parede é verdadeira
no dia em que foi pintada e falsa hoje, e um site que a copiasse estaria a
anunciar uma idade errada. O que entra é `desde 1996`, que é o facto.

---

# O QUE MUDOU DEPOIS DO PLANO

O plano acima foi executado e verificado com seis capítulos. **A meio, o
cliente mandou três coisas novas**, e estão aqui porque um plano que se
reescreve a fingir que sempre foi assim deixa de servir para alguma coisa.

## 1. "A homepage tem de cobrir isso tudo"

> «quero mais sitios para fotos, por exemplos uma secçao com varios
> placeholders para videos que eles teem no instagram (todos reels) […] isto
> tem de ser um site atrativo, com funcionalidades de mostrar a ementa, fazer
> encomendas e mostrar fotos/videos […] de modo a que toda a gente (jovens e
> pessoas mais velhas) consigam interagir bem e facilmente»

Entraram quatro capítulos: **IV a vitrine**, **V os reels**, **VII a ementa** e
**IX encomendar**. A página passou de 8 para 13 secções e de 6 para 10
capítulos numerados.

⚠️ **Isto rompe o tecto de 8 a 14 alturas de ecrã que a skill fixa.** A página
mede **19,0** no computador e **18,5** no telemóvel. Não é descuido: as três
funções pedidas não cabiam em ligações, e o tecto existe para proteger o pico.
A defesa é a que o `feel.md` §5 receita — **comprimir o administrativo**: as
quatro secções novas são `flow` com escalonamento curto, não actos presos. Os
actos presos continuam a ser três, os mesmos de antes.

O risco que fica, e que não escondo: **o pico está agora aos 11% da página** em
vez dos 25%, e há oito capítulos depois dele. Pela regra do pico-e-fim, quem
rolar a página toda leva o pão e o colofão; quem desistir a meio leva o pão. Os
dois casos guardam o pico, mas a página é mais longa do que a skill considera
saudável, e se algum dia se quiser encurtar é a vitrine e os reels que se
juntam num capítulo só.

## 2. "Otimiza para o telemóvel"

> «sendo que maior parte das pessoas vao ver no tele»

O telemóvel passou a ser o alvo primeiro e não a passagem final. O que mudou
está em `cartaz.css`, no bloco do telemóvel, com a razão ao lado de cada
regra. Em resumo: **o fólio desaparece** (dez pastilhas de 24 px na berma de um
ecrã de 390 são dez alvos acidentais, não navegação), a capa deixa de gastar
meio ecrã em ar, os atalhos passam a largura inteira, o corpo não desce abaixo
de 1 rem em lado nenhum, e o carril da festa passa a um item por ecrã.

## 3. "Dá cor ao herói"

A folha de rosto era tipografia preta sobre papel, como a gramática pede. O
cliente viu e disse que precisava de cor, e tem razão: a página abria num ecrã
branco onde o único sinal de marca era um logótipo de 28 px no cabeçalho.

Passou a **tijolo com papel por cima** — 6,87:1, e é o que as capas dos
impressos da casa fazem. ⚠️ Sobre tijolo escreve-se a papel: tinta sobre tijolo
dá 2,36:1 e é a armadilha desta paleta.

## 4. A fotografia com clientes

Levantei que a `09.webp` mostra dois clientes de frente e reconhecíveis, e que
isso é consentimento por tratar. O cliente respondeu que se pode usar. É do
álbum publicado pela própria casa e quem sabe se aquelas pessoas autorizaram é
ele. **Está incluída**, e a decisão está registada no `Vitrine.tsx` para quem
vier a seguir saber que a pergunta foi feita.

---

# A PARTITURA COMO FICOU

| # | Capítulo | Dispositivo | Chão |
|---|---|---|---|
| — | Folha de rosto | `flow` + `in` | tijolo |
| I | A porta | `reveal` + `parallax` | papel-fundo |
| — | Silêncio | vazio | tinta |
| II | **O pão (pico)** | `pin`, escala por `--sc-p` | estampa |
| — | Legenda da estampa | `in` | papel |
| III | As mãos | `reveal` | papel-fundo |
| IV | A vitrine | `in`, escalonado | papel |
| V | Os reels | `reveal` por cela | tinta |
| VI | O raro | `pin` + `count` + `kinetic` | verde-forte |
| VII | A ementa | `in` | papel-fundo |
| VIII | A festa | `pan` | tijolo |
| IX | Encomendar | `in` | papel |
| X | O colofão | `pin` | tinta |

**Sete famílias de dispositivos**, contra o mínimo de quatro. **Nenhuma
repetida em capítulos seguidos** — foi por isso que os reels entram por limpeza
e não por escalonamento, tendo a vitrine mesmo por cima. **Nove chãos que
cortam a seco**, todos da paleta medida, sem uma cor nova. O verde continua a
aparecer uma vez só.

---

# A VERIFICAÇÃO

Quatro passagens do arnês, todas verdes:

| Passagem | Rolagem morta | Contraste no pior quadro |
|---|---|---|
| computador 1440×900 | nenhuma | tudo ≥ 4,5:1 |
| telemóvel 390×844 | nenhuma | tudo ≥ 4,5:1 |
| movimento reduzido | nenhuma | tudo ≥ 4,5:1 |
| inglês, telemóvel | nenhuma | tudo ≥ 4,5:1 |

## O que o arnês não apanhou, e a medição apanhou

⚠️ **O carril da festa estava morto num monitor largo.** O arnês deu «sem
rolagem morta» em todas as passagens, e estava certo: o palco mexe-se. Mas o
carril percorria 1349 px num telemóvel, 834 num portátil e **376 num monitor de
1920** — contra os 960 que meio ecrã exige ali. Correcto no telemóvel e morto no
computador ao mesmo tempo, que é como esta armadilha sobrevive a uma revisão.

Só se vê medindo `scrollWidth - innerWidth` a várias larguras. Corrigido com
`min-width: 165vw`, que amarra o curso ao ecrã: 1349 / 936 / 1248 / 1664 px a
390, 1440, 1920 e 2560, todos acima do exigido.

⚠️ **Dez alvos de toque a 40 px**, quatro abaixo do mínimo. Eram os botões do
fólio. Corrigido por enchimento, sem mexer no desenho da pastilha. As três
ligações que continuam abaixo de 44 px estão **dentro de texto corrido** e
estão isentas: engordá-las partia o parágrafo.

## O que só se apanhou a olhar

O arnês deu verde nas quatro e mesmo assim havia seis defeitos. Todos foram
encontrados a ler as capturas:

1. **«Ermesinde» duas vezes** na folha de rosto e outra vez no colofão. O
   `moradaCompleta()` já traz a localidade.
2. **O fio lia-se como três barras direitas**, não como vapor: o SVG estica-se
   com `preserveAspectRatio="none"` e achatava a onda da marca.
3. **E depois como trança**, quando lhe dei amplitude a mais: os traços estão a
   30 unidades e cruzavam-se acima de 15.
4. **Os marcadores do fólio saíam como blocos cinzentos sem numeral.** O
   `background: currentColor` resolvia para a cor do próprio elemento, que
   estava a `transparent`.
5. **O bloco de fecho do carril ficava cortado**: o enchimento à direita de um
   contentor flex não entra no `scrollWidth`.
6. **A célula larga da vitrine duplicava de altura** e passava a ser a maior
   imagem da página, à frente do pico.

## A verificação de sentir

⚠️ **Não a fiz a frio, e o `feel.md` §6 diz que a frio é o ponto.** Construí a
página, portanto não consigo chegar-lhe sem saber o que vem a seguir. O que se
segue é a leitura das folhas de contacto, que é o que resta, e vale menos.

| Acto | Curva pretendida | O que a folha mostra | Bate? |
|---|---|---|---|
| Folha de rosto | Curiosidade | Tijolo, a frase enorme, dois botões | **Mudou**: agora é chegada, não curiosidade. O tijolo diz «marca» antes de a frase dizer o que quer que seja |
| I A porta | Chegada | A fachada, na sua coluna | Repete o sentir da capa. **É a fraqueza que fica** |
| — Silêncio | Suspensão | Ecrã escuro, uma linha | Bate |
| II O pão | Apetite | O pão a encher o ecrã | Bate, e é o maior salto visual da folha |
| III As mãos | Intimidade | A mão, escala pequena | Bate |
| IV A vitrine | — | Abundância | Sentir novo, não estava na curva |
| V Os reels | — | Espera | Lugares vazios leem-se como promessa |
| VI O raro | Surpresa | O verde de repente, e o 49 | Bate |
| VII A ementa | — | Utilidade | Sentir novo |
| VIII A festa | Confiança | Tijolo, os kits a passar | Bate |
| IX Encomendar | — | Facilidade | Sentir novo |
| X A morada | Acolhimento | Tudo pára, a marca desenha-se | Bate |

**A divergência a sério é a primeira**: dar cor ao herói mudou o que ele faz
sentir, e a capa e o capítulo I passaram a produzir a mesma coisa. Pelo §1 do
`feel.md`, dois actos seguidos com o mesmo sentir significam que um é enchimento.
Não cortei nenhum — a capa é obrigatória na gramática e a porta é a primeira
batida que o cliente ditou — mas **fica registado como o defeito conhecido
desta página**, e é por aí que uma próxima versão deve pegar.

O pico continua a ser o pão: é o maior salto visual da folha e tem o maior vão.
O fecho segura em vez de desvanecer.
