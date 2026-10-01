# Painel — uma página, dois papéis

O painel é **uma página só**, em `/painel`. Quem entra como funcionário vê o
balcão; quem entra como gerente vê o balcão e a gestão. O que cada vista tem está
em `painel-balcao.md` e `painel-gerente.md`. Este ficheiro trata do que é comum:
quem entra, como entra, e como a página se aguenta aberta o dia inteiro.

## Onde vive

- `src/app/painel/`, **fora de `[locale]`**. O painel é para a equipa e é só em
  português; não passa pelo `next-intl`.
- `noindex` e fora do `sitemap.xml`.
- Pensado primeiro para o **tablet do balcão**: alvos de toque grandes, nada que
  dependa de *hover*. A gerente também o usa no telemóvel.

## Os dois papéis

| Papel | Entra com | Vê |
|---|---|---|
| `funcionario` | PIN fixo, o mesmo para toda a equipa | o balcão |
| `gerente` | email + código enviado para esse email | o balcão e a gestão |

Não há PIN individual (ficou para depois): o painel não sabe *que* funcionário
fez cada coisa, só que foi alguém da equipa.

⚠️ **Esconder um botão não é proteger.** A gestão não é só escondida ao
funcionário: não é gerada no servidor para ele, e **cada acção de gestão verifica
o papel no servidor** antes de fazer o que quer que seja. Um funcionário que
chegue a uma acção de reembolso tem de receber uma recusa, não um reembolso.

## Entrar como funcionário: o PIN

- 6 dígitos, definido e mudado pela gerente. Guarda-se com *hash*, nunca em
  claro.
- ⚠️ **Tentativas limitadas, na base de dados.** Cinco erros seguidos bloqueiam
  esse dispositivo durante 15 minutos. O contador vive na base de dados e não em
  memória: na Vercel cada pedido pode cair numa instância diferente, e um limite
  em memória não limita nada.
- **Mudar o PIN termina todas as sessões de funcionário**, em todos os
  dispositivos. É assim que se tira o acesso a quem saiu da casa.

## Entrar como gerente: o código por email

O mesmo desenho do painel da Taskuinha:

- Só entram os emails de uma lista fixa (`EMAILS_GERENTE`). Um email fora da
  lista recebe a mesma resposta que um da lista — «se o email tiver acesso,
  enviámos um código» — para o formulário não confirmar quem tem acesso. Mudar a
  lista obriga a um deploy; é raro, e evita um ecrã só para isto.
- Código de 6 dígitos, válido 10 minutos, de uso único, guardado com *hash*.
- Envios e tentativas limitados na base de dados.
- Enviado pelo Resend.

## Lembrar o dispositivo

- Depois de entrar, o dispositivo fica lembrado **30 dias**, e o prazo renova-se
  a cada uso: o tablet do balcão, usado todos os dias, nunca volta a pedir o
  PIN; um dispositivo parado 30 dias volta a pedir entrada.
- **«Esquecer este dispositivo»** está sempre à vista, nas duas vistas.
- ⚠️ **A gerente no tablet do balcão.** Se o dispositivo já tem sessão de
  funcionário, a opção «lembrar» do login da gerente aparece **desligada**. Ela
  pode ligá-la, mas tem de o decidir. Sem isto, uma entrada da gerente no tablet
  deixava reembolsos e preços ao alcance da equipa durante 30 dias.
- A gerente vê a lista de dispositivos com sessão (tipo de aparelho, papel,
  último uso) e pode terminar qualquer um. É o «revogar o tablet» da proposta.

## As sessões vivem na base de dados

⚠️ **Não é um JWT.** Terminar a sessão de um dispositivo — ou todas, quando o PIN
muda — só é possível se a sessão existir do lado do servidor. O cookie guarda um
identificador aleatório; a base de dados guarda a sessão (papel, dispositivo,
criação, último uso), e cada pedido ao painel confirma que ela ainda existe.
Cookie `httpOnly`, `secure`, `sameSite: strict`.

⚠️ **O painel e a conta de cliente não se misturam.** A conta de cliente é
`next-auth` com Google/Facebook (ver `AGENTS.md`); o painel tem sessão e cookie
próprios. Entrar com o Google no site nunca dá acesso ao painel, nem que o email
seja o da gerente.

## Aguentar-se aberto o dia inteiro

O tablet fica com o painel aberto do abrir ao fechar da loja.

1. **Pedidos novos sem recarregar — e sem acordar a base de dados.** O painel
   pergunta de 10 em 10 segundos (e sempre que volta a ficar visível) por um
   **número de versão**, servido a partir da cache da Vercel. Cada alteração a um
   pedido invalida essa cache (`revalidateTag`). O painel só vai buscar a lista à
   base de dados quando a versão muda. A versão não diz nada sobre os pedidos, por
   isso pode ser pública e estar em cache. Porquê: uma consulta à base de dados a
   cada 10 segundos mantinha-a acordada o dia inteiro — ver `robustez.md`.
   Polling e não websockets: a Vercel não mantém ligações abertas, e numa
   pastelaria dez segundos não se notam.
2. ⚠️ **Sem ligação tem de se ver.** Se o tablet perder a rede, o painel mostra
   um aviso vermelho no topo — «Sem ligação desde as 10:42 — os pedidos novos não
   estão a aparecer». Um painel desligado com ar normal é pior do que nenhum: a
   equipa confia nele e os pedidos acumulam-se sem ninguém ver.
3. ⚠️ **Uma versão nova do site parte o painel aberto.** Depois de um *deploy*,
   as acções do servidor da versão antiga deixam de existir, e o tablet — aberto
   desde manhã — começa a falhar ao marcar «entregue». A resposta do polling leva
   também o identificador da versão do site; quando muda, o painel recarrega-se
   sozinho no primeiro momento em que não houver nada a meio.
4. O ecrã não se apaga e o som tem de estar desbloqueado — ver
   `painel-balcao.md`.

## Em aberto

1. PIN de 6 dígitos — ou 4, se a equipa preferir? Com o limite de tentativas,
   4 também aguenta.
2. Emails com acesso de gerente: só a Ana, ou a Ana e a Andreia?
