# Impressão — o talão

> ⚠️ **Ficheiro incompleto.** Falta a casa escolher o caminho (tablet ou trocar
> a impressora) e fixar o IP. O que está abaixo já está decidido; a forma de
> ligar à impressora não.

## O que já se sabe

- A proposta foi escrita para a **Epson TM-m30III**, que vai buscar os talões ao
  nosso servidor (Server Direct Print) — e aí a mudança de IP não importa.
- **A impressora da loja é uma TM-m30II base** (visita, #46, 15/11), e **não faz
  Server Direct Print**. As variantes `-H`, `-NT`, `-SL` e `-S` fazem.
- Por isso há dois caminhos, e **a escolha é da casa** (o Gonçalo leva-lha):
  - **o tablet imprime**, com a impressora que existe: o aparelho do balcão
    manda o talão para o IP da impressora na rede da loja. Sem esse aparelho
    aberto não há talão (os que chegam ficam numa fila), e o IP tem de ficar
    fixo no router;
  - **trocar a impressora** por uma com Server Direct Print, que vem buscar os
    talões ao servidor.
- **Um servidor na Vercel não chega à impressora.** O IP dela é da rede da
  loja. Só um aparelho dentro dessa rede lhe fala — ou ela, se souber ir
  buscar.
- Está **na rede, mas o IP não está fixo**. O site na loja vai estar no iPad e
  no computador da loja (falta decidir se nos dois). Há uma segunda impressora,
  por Bluetooth: falta saber o modelo e se é precisa.

## Decidido

**O talão leva:** referência, dia da semana e data de levantamento, hora,
cliente e telefone, artigos (variante, escolhas, quantidade, notas), observações,
total e **`A PAGAR NA LOJA`** com o valor (`pedidos.md` › Dinheiro), NIF se o
cliente o deu, e «documento sem valor fiscal». ⚠️ **Nunca `PAGO`**: desde
04/11 paga-se na loja, e um talão a dizer «pago» manda o balcão entregar sem
cobrar. `PAGO` e `SINAL PAGO` só voltam com o pagamento online (#38).

**Pedidos para hoje:** um bloco **invertido** no topo (fundo preto, texto branco)
— `HOJE · QUINTA 14:30`. O talão inteiro a preto foi pedido na reunião; o
Sobral testa as duas versões na impressora verdadeira (um fundo todo preto
imprime mais devagar e pode manchar) e decide-se aí.

**Bolos personalizados:** as fotos **não** saem no talão — uma térmica a preto e
branco imprime-as ilegíveis. O talão anuncia cada tipo na sua linha, porque não
são a mesma coisa (`bolos-personalizados.md`):

- `FOTO PARA IMPRIMIR NO BOLO — ver no painel`, destacada, porque é um passo da
  produção: se passar despercebida, o bolo sai sem ela;
- `2 fotos de referência — ver no painel`.

O talão de um bolo personalizado só sai depois de o cliente aceitar o preço
que a gerente fixou (`bolos-personalizados.md`), por isso leva o preço final,
como qualquer outra linha — nunca «sob orçamento».

**Talão de cancelamento:** sai quando um pedido é cancelado, com
`CANCELADO` em bloco invertido, a referência e o levantamento previsto (ver
`pedidos.md`).

**Falhas:** se a impressora não responder, o balcão mostra o aviso vermelho e o
alarme repete-se até alguém reimprimir ou dar por tratado (ver
`painel-balcao.md`). Reimprimir é sempre possível, no balcão e na gerente.

**Quando imprime:** uma vez, quando o pedido fica **`confirmado`** (ver
`pedidos.md` › Estados) — ao nascer, se não tinha nada a confirmar, ou quando a
casa confirma. Um `por-confirmar` não imprime: ainda não é uma ordem para a
cozinha.

`impressoEm` guarda-se quando a impressora confirma, não quando se manda.

## O talão no código

- `src/lib/talao.ts` compõe o talão em linhas de **46 colunas** (papel de
  80 mm, letra normal, menos a margem; 23 na letra grande). Puro: `agora` entra
  como argumento, e o «HOJE» é o dia de Lisboa.
- `src/lib/talao-epos.ts` traduz as linhas para **ePOS-Print XML**, a língua
  das TM pela rede. É a mesma nos dois caminhos — do tablet para o IP, ou do
  servidor pelo Server Direct Print —, por isso o talão não depende do modelo.
- **O texto vai como texto** e é a impressora que o converte. Havia um segundo
  modo (`cp858`, os bytes já convertidos); na visita os dois acentuaram bem, e
  ficou o mais simples.
- **Margem de 1,5 mm de cada lado** (`GS L` e `GS W`, 12 pontos): na visita, o
  talão a preto chegava às bordas do papel. No fim do talão a margem volta à de
  origem, porque a impressora guarda-a e pode imprimir outras coisas. ⚠️ **Ainda
  não foi impressa**: ver no papel na próxima ida à loja.
- O endereço da impressora segue o **protocolo da página**: https no site no
  ar, http no portátil.
- O fundo preto contínuo pede o espaçamento entre linhas igual à altura da
  letra (24 pontos); com o de origem fica às riscas.

## A página de teste

A página **`/painel/talao`** imprime talões de exemplo, com dados inventados e
como os de agora (`confirmado`, a pagar na loja): o pedido para hoje (bloco
«HOJE · QUINTA 14:30»), um para amanhã com NIF, o cancelamento e uma folha com
os acentos e o «€». Cada um em **só o bloco** ou **talão inteiro a preto**.

Pode correr de duas formas:

- **No site publicado** (um preview da Vercel, em https) — é o **ensaio do
  caminho do tablet a sério**: o browser fala com a impressora em https. Antes
  do primeiro talão, no aparelho: o https ligado na configuração da impressora,
  o certificado dela aceite uma vez (abrir `https://<IP>` e aceitar o aviso), e
  a autorização de rede local no Chrome, quando a pedir. Só «pelo browser»
  funciona aqui.
- **No portátil**, na rede da loja, em http — para ver o talão no papel sem
  depender do browser. É o que se fez na visita de outubro e na de novembro.

```bash
LOJA_EM_TESTE=1 npm run build      # o interruptor lê-se no build
LOJA_EM_TESTE=1 npx next start -H 0.0.0.0 -p 4500
```

No portátil abre-se `http://localhost:4500/painel`; no tablet,
`http://<IP do portátil>:4500/painel`. O `next start` escreve `0.0.0.0` em
«Network», que não serve: o IP do portátil sai de `ipconfig getifaddr en0`.
Entra-se com o PIN provisório, e depois vai-se a `/painel/talao` — a página
não tem link no painel, escreve-se o endereço.

⚠️ **No portátil, sem o `LOJA_EM_TESTE=1` no build, não há botões.** Sem base
de dados o painel diz que a entrada ainda não está ligada, e a página do talão
volta para lá. O terminal do `next start` tem de ficar aberto: fechá-lo desliga
o site. (Num preview da Vercel, com base de dados, entra-se como no painel.)

Dois botões, dois caminhos:

- **Pelo browser** — o aparelho fala direto com a impressora, no protocolo da
  página. É o caminho da TM-m30II base, e a prova de que o tablet o consegue
  fazer.
- **Pelo portátil** — quem manda é o servidor do portátil, em http. Não depende
  do browser. Só aceita IPs da rede local, não segue redirecionamentos, e na
  Vercel recusa.

Na próxima ida à loja, por ordem:

1. **A folha de estado**: desligar, segurar o FEED e ligar. Traz o IP.
2. No router, **fixar o IP** da impressora (reserva por endereço MAC).
3. **A margem nova**: o pedido para hoje, inteiro a preto, pelo portátil. Ver
   se ficou afastado das bordas.
4. Na configuração da impressora, **ligar o https**.
5. **O caminho do tablet**: no tablet, abrir o preview em https, aceitar o
   certificado da impressora e a autorização do Chrome, e imprimir «pelo
   browser». É o que ainda nunca se testou.
6. A segunda impressora (a do Bluetooth): modelo, e se é precisa.
7. Guardar os talões — fotografados, ou trazê-los.

## O que os testes já mostraram

**Na visita de 15/11 (#46):** a TM-m30II base imprimiu pelo portátil; os dois
modos de carateres acentuaram bem; o fundo preto saiu legível, mas colado às
bordas (daí a margem).

**Antes da loja:**

⚠️ **O caminho do tablet é mais difícil do que parecia.** Numa impressora
simulada, o browser só conseguiu imprimir depois de se abrir o CSP da página
(`connect-src`, em `next.config.ts`) — e isso foi em `http://localhost`. No
site a sério, com o painel em https, imprimir do tablet pede ainda:

- a impressora em **https** (certificado da própria impressora, aceite uma vez
  no tablet), porque uma página https não fala com http;
- o **IP da impressora no CSP** do painel;
- e, no Chrome, a **autorização de rede local**, que se dá uma vez no tablet.

Nada disto é preciso com o **Server Direct Print**: é a impressora que vem
buscar os talões ao servidor. Se a loja tiver a TM-m30II base, a decisão
entre viver com o caminho do tablet ou trocar a impressora é da casa e do
Gonçalo, e convém tomá-la com os números do teste.
