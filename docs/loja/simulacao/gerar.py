"""A simulação do pedido: um pedido de ponta a ponta, e depois cada outro caminho.

Gera duas páginas a partir dos mesmos passos:
- `equipa.html`: com o estado de cada passo no código, o que falta e o responsável;
- `andreia.html`: só o percurso, sem o que falta, para validar com a casa.

Os emails são os do código, tal como saem (`scripts/ver-emails.ts`); o T05, o T07
e o T08 ainda não têm modelo e mostram o texto do PDF da Andreia (24/11). As
capturas em `capturas/` são do site local em modo de teste, sem base de dados.

Correr a partir da raiz do repositório, depois de mudar os modelos ou os passos:

    python3 docs/loja/simulacao/gerar.py equipa
    python3 docs/loja/simulacao/gerar.py andreia
"""
import base64
import html
import json
import os
import re
import subprocess
import sys
import tempfile

# «equipa»: com o estado no código, o que falta e o responsável. «andreia»: só o percurso, para validar com a casa.
MODO = sys.argv[1] if len(sys.argv) > 1 else "equipa"
assert MODO in ("equipa", "andreia")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))

# Os emails geram-se sempre do código, para a página nunca mostrar um texto que o site já não envia.
EMAILS = tempfile.mkdtemp(prefix="emails-damira-")
texto = subprocess.run(["npx", "tsx", "scripts/ver-emails.ts", "--html", EMAILS],
                       cwd=RAIZ, check=True, capture_output=True, text=True).stdout

logo = "data:image/png;base64," + base64.b64encode(open(os.path.join(EMAILS, "logotipo-damira.png"), "rb").read()).decode()

assuntos = {}
for m in re.finditer(r"^=== (.+?) ===\n(.+)$", texto, re.M):
    assuntos[m.group(1)] = m.group(2)


def ficheiro(chave: str) -> str:
    modelo, *resto = chave.split(":")
    variante = resto[0] if resto else None
    for nome in os.listdir(EMAILS):
        if re.match(rf"^\d+-{re.escape(modelo)}-pt" + (rf"-{variante}" if variante else "") + r"\.html$", nome):
            return nome
    raise SystemExit(f"sem ficheiro para {chave}")


def email_do_codigo(chave: str) -> dict:
    modelo, *resto = chave.split(":")
    cab = f"{modelo} · pt" + (f" · {resto[0]}" if resto else "")
    corpo = open(os.path.join(EMAILS, ficheiro(chave)), encoding="utf-8").read().replace("logotipo-damira.png", logo)
    return {"modelo": modelo, "assunto": assuntos[cab], "html": corpo}


# Os três que só existem no PDF da Andreia (24/11). Texto dela; marcados como em falta no código.
def email_do_pdf(t: str, assunto: str, linhas: list[str]) -> dict:
    corpo = "".join(
        f'<p style="margin:0 0 10px"><strong style="color:#923d38;letter-spacing:.04em">{html.escape(l[2:])}</strong></p>'
        if l.startswith("# ") else f'<p style="margin:0 0 10px">{l}</p>' for l in linhas)
    pagina = ('<!doctype html><html><body style="margin:0;background:#f4f1ee;font:15px/1.55 Arial,sans-serif;color:#1f1d1b">'
              '<div style="max-width:560px;margin:0 auto;background:#fff;padding:28px 28px 20px">'
              + (f'<p style="margin:0 0 16px;font-size:12px;color:#923d38;letter-spacing:.08em">TEXTO DO PDF DA ANDREIA — AINDA NÃO HÁ MODELO NO CÓDIGO</p>'
                 if MODO == "equipa" else
                 f'<p style="margin:0 0 16px;font-size:12px;color:#923d38;letter-spacing:.08em">TEXTO DO DIAGRAMA DE 24/11</p>')
              + f"{corpo}</div></body></html>")
    return {"modelo": t, "assunto": assunto, "html": pagina}


T05 = email_do_pdf("T05 (sem modelo)", "Temos uma proposta para o seu pedido #00001 🎂", [
    "Olá, Maria,",
    "Já temos uma resposta para o seu pedido! Consulte abaixo os detalhes da nossa proposta e confirme se pretende avançar com a encomenda.",
    "# RESUMO DO PEDIDO",
    "12 × Pastel de nata — 15,60 €<br>1 × Bolo por medida — 45,00 €<br>Taxa de entrega — 10,00 €<br><strong>Total:</strong> 70,60 €",
    "# ENTREGA AO DOMICÍLIO",
    "<strong>Data e hora:</strong> [Data e hora propostas]<br><strong>Morada:</strong> [Morada de entrega]",
    "<strong>Pagamento:</strong> Após a aceitação da proposta, receberá os dados necessários para efetuar o pagamento por transferência bancária.",
    "[Botão: Consultar e aceitar proposta]",
    "<strong>Importante:</strong> Para avançarmos com a sua encomenda, é necessário aceitar a proposta apresentada. A encomenda ficará confirmada após a receção do pagamento.",
    "Caso prefira não avançar com a encomenda, poderá recusar a proposta sem qualquer custo.",
    "<strong>Referência da encomenda:</strong> #00001",
    "Até breve! 😊<br>Confeitaria Damira",
])
T07 = email_do_pdf("T07 (sem modelo)", "O seu pedido #00001 aguarda pagamento 🎂", [
    "Olá, Maria,",
    "Agradecemos a sua confirmação! Para finalizarmos a sua encomenda, basta efetuar o pagamento por transferência bancária.",
    "# ENTREGA AO DOMICÍLIO",
    "<strong>Data e hora:</strong> [Data e hora acordadas]<br><strong>Morada:</strong> [Morada de entrega]",
    "# PRODUTOS ENCOMENDADOS",
    "12 × Pastel de nata — 15,60 €<br>1 × Bolo por medida — 45,00 €<br>Taxa de entrega — 10,00 €<br><strong>Total:</strong> 70,60 €",
    "# DADOS PARA PAGAMENTO",
    "<strong>Beneficiário:</strong> Confeitaria e Pão Quente Damira<br><strong>IBAN:</strong> [IBAN]<br><strong>Montante:</strong> 70,60 €<br><strong>Referência da transferência:</strong> #00001<br><strong>Prazo de pagamento:</strong> [Data e hora limite — 24 horas após a aceitação]",
    "<strong>Importante:</strong> A sua encomenda ficará confirmada após a receção do pagamento. Caso o pagamento não seja recebido dentro do prazo indicado, a encomenda poderá ser cancelada.",
    "Receberá um email assim que o pagamento for confirmado.",
    "<strong>Referência da encomenda:</strong> #00001",
    "Até breve! 😊<br>Confeitaria Damira",
])
T08 = email_do_pdf("T08 (sem modelo)", "O seu pedido #00001 está confirmado 🎂", [
    "Olá, Maria,",
    "Recebemos o seu pagamento! A sua encomenda está confirmada e será entregue na data e hora combinadas.",
    "# ENTREGA AO DOMICÍLIO",
    "<strong>Data e hora:</strong> [Data e hora acordadas]<br><strong>Morada:</strong> [Morada de entrega]",
    "# PRODUTOS ENCOMENDADOS",
    "12 × Pastel de nata — 15,60 €<br>1 × Bolo por medida — 45,00 €<br>Taxa de entrega — 10,00 €<br><strong>Total:</strong> 70,60 €",
    "<strong>Pagamento:</strong> Confirmado — 70,60 €",
    "<strong>Referência da encomenda:</strong> #00001",
    "Para alterar ou cancelar a sua encomenda, entre em contacto connosco através do +351 229 730 939.",
    "Até breve! 😊<br>Confeitaria Damira",
])
PDF = {"T05": T05, "T07": T07, "T08": T08}


def email(chave):
    return PDF[chave] if chave in PDF else email_do_codigo(chave)


# Cada passo: quem, onde, o que faz, o estado (ok/parcial/falta/proposta), nota para o Sobral,
# e opcionalmente uma captura e um email (com o T e para quem).
def passo(quem, titulo, onde, texto, estado, nota=None, captura=None, mail=None, t=None, para=None, sai=None):
    return dict(quem=quem, titulo=titulo, onde=onde, texto=texto, estado=estado, nota=nota,
                captura=captura, mail=mail, t=t, para=para, sai=sai)


PRINCIPAL = [
    passo("cliente", "Escolhe e envia o pedido", "Site · /encomendas/pedido",
          "Junta 12 pastéis de nata e um bolo por medida, escolhe o dia e a hora no calendário, deixa nome, email e telefone e carrega em «Enviar pedido». Como o bolo não tem preço, o pedido precisa da análise da loja.",
          "parcial", "A página funciona, mas o pedido não fica gravado: a ação só manda um email à casa (secção 6, ponto 1 do documento).",
          captura="01-compra"),
    passo("cliente", "Vê a confirmação de envio", "Site · mesma página",
          "Aparece «Pedido enviado.» com a referência do pedido.", "ok", captura="02-pedido-enviado"),
    passo("cliente", "Recebe «O seu pedido está em análise»", "Email do cliente",
          "Confirma que o pedido chegou e que a casa responde em cerca de 24 h.", "falta",
          "O modelo existe, mas ninguém o põe na fila e a fila não envia.",
          mail="criado-por-confirmar-cliente", t="T02", para="cliente", sai="Não sai"),
    passo("loja", "Recebe o pedido por email", "Email da loja",
          "Assunto começa por «POR CONFIRMAR até…», com a ficha completa do pedido.", "parcial",
          "Hoje sai, mas direto e com a marca «só por email». Não traz o link «Abrir o pedido» para o painel.",
          mail="criado-loja:por-confirmar", t="—", para="loja", sai="Sai hoje (direto)"),
    passo("loja", "Entra no painel", "/painel",
          "A equipa entra com o PIN; a gerente com o código que recebe por email.", "ok", captura="03-painel-entrada"),
    passo("loja", "Procura o pedido", "/painel › Pedidos › Todos os pedidos › filtro «Por confirmar»",
          "Em «Precisa de atenção» o pedido não aparece. É preciso ir a Pedidos › Todos os pedidos e escolher o filtro «Por confirmar».",
          "parcial", "Os pedidos à espera da loja (e do cliente) devem aparecer em «Precisa de atenção», com o prazo (ponto 7).",
          captura=["04-precisa-de-atencao", "05-menu-pedidos", "06-lista-por-confirmar"]),
    passo("loja", "Abre o pedido e responde", "Detalhe do pedido › «Responder ao pedido»",
          "Sem nada novo, «Confirmar o pedido». Com um preço por fixar ou outra hora, a gerente escreve o preço (45 €) e envia uma proposta.",
          "ok", "Falta o botão «Recusar» (T16) neste bloco.", captura=["07-detalhe", "08-responder", "09-preco-45"]),
    passo("loja", "Fica à espera do cliente", "Detalhe do pedido › «À espera do cliente»",
          "Mostra o prazo de 24 h para o cliente aceitar e um link para copiar e mandar à mão enquanto os emails não saem.",
          "parcial", "O link aponta para damira-demo.vercel.app (o NEXT_PUBLIC_SITE_URL por defeito), que já não existe. Em produção tem de apontar para o site certo.",
          captura="10-a-espera-do-cliente"),
    passo("cliente", "Recebe «Temos uma proposta»", "Email do cliente",
          "A proposta (bolo 45 €, hora nova), o resumo e o botão «Consultar e aceitar proposta».", "parcial",
          "A linha entra na fila, mas o emissor ainda não escreve o link nem envia (ponto 4).",
          mail="resposta-cliente", t="T04", para="cliente", sai="Na fila, não sai"),
    passo("cliente", "Abre a proposta", "/pedido/proposta/‹referência›/‹credencial›",
          "Vê o que mudou, o resumo, a data de levantamento, o prazo para responder e os botões «Aceitar a proposta» e «Recusar a proposta».",
          "ok", captura=["11-proposta-topo", "12-proposta-botoes"]),
    passo("cliente", "Aceita", "Página da proposta",
          "O pedido fica confirmado e a página diz «A sua encomenda está confirmada!».", "ok", captura="14-aceite"),
    passo("cliente", "Recebe «O seu pedido está confirmado»", "Email do cliente",
          "Agradece a confirmação, com a data de levantamento, os produtos e o total.", "parcial",
          "Na fila, mas a fila não envia (ponto 2).", mail="aceite-cliente", t="T06", para="cliente", sai="Na fila, não sai"),
    passo("loja", "Recebe «ACEITE pelo cliente»", "Email da loja",
          "Avisa que o cliente aceitou e que o talão sai no balcão.", "parcial",
          "Na fila, mas não envia; o talão ainda não imprime (#47); falta o link para o pedido.",
          mail="aceite-loja", t="—", para="loja", sai="Na fila, não sai"),
    passo("loja", "No dia, entrega ao balcão", "/painel › balcão › «Levantam hoje» › «✓ Entregue»",
          "O cliente diz a referência ao balcão e a equipa marca o pedido como entregue.", "parcial",
          "As listas do balcão e o botão «Entregue» só aceitam pedidos «pago» (do Stripe). Um pedido pago na loja, «confirmado», não aparece (ponto 6)."),
]

CAMINHOS = [
    ("sem-analise", "Pedido sem análise", "Todos os produtos têm preço: o pedido nasce confirmado.", [
        passo("cliente", "Envia o pedido", "Site · /encomendas/pedido", "12 pastéis de nata, com preço: não precisa de análise.", "parcial",
              "O pedido não fica gravado (ponto 1).", captura="01-compra"),
        passo("cliente", "Recebe «O seu pedido está confirmado»", "Email do cliente", "Confirmado logo, com levantamento, produtos e total.", "falta",
              "Ninguém o põe na fila.", mail="criado-confirmado-cliente", t="T01", para="cliente", sai="Não sai"),
        passo("loja", "Recebe «CONFIRMADO»", "Email da loja", "Ficha do pedido já confirmado.", "parcial",
              "Hoje sai direto, sem link para o painel.", mail="criado-loja:confirmado", t="—", para="loja", sai="Sai hoje (direto)"),
        passo("loja", "Entrega no dia", "Balcão", "Igual ao último passo do pedido acima.", "parcial", "O balcão só mostra «pago» (ponto 6)."),
    ]),
    ("loja-confirma", "A loja confirma sem proposta", "Pedido com análise; a casa aceita como está.", [
        passo("loja", "Confirma", "Detalhe › «Responder» › «Confirmar o pedido»", "Balcão ou gerente.", "ok", captura="08-responder"),
        passo("cliente", "Recebe «Boas notícias!… está confirmado»", "Email do cliente", "A equipa analisou e confirmou.", "parcial",
              "Na fila, não sai.", mail="confirmado-cliente", t="T03", para="cliente", sai="Na fila, não sai"),
    ]),
    ("cliente-recusa", "O cliente recusa a proposta", "Na página da proposta.", [
        passo("cliente", "Carrega em «Recusar a proposta»", "Página da proposta", "Pede uma segunda confirmação: «Sim, recusar» ou «Voltar».", "ok",
              captura="13-recusar-confirmacao"),
        passo("cliente", "Recebe «encerrámos o pedido»", "Email do cliente", "Pedido cancelado, sem custos; a vaga fica livre.", "parcial",
              "Na fila, não sai.", mail="proposta-recusada-cliente", t="T13", para="cliente", sai="Na fila, não sai"),
    ]),
    ("proposta-expira", "A proposta expira", "O cliente não responde em 24 h (ou até ao levantamento, se for antes).", [
        passo("sistema", "Expira o pedido", "Automático", "O pedido passa a expirado e a vaga fica livre.", "parcial",
              "Só acontece quando alguém visita o site; falta a tarefa horária (ponto 3)."),
        passo("cliente", "Recebe «A proposta expirou»", "Email do cliente", "Sem custos; pode fazer novo pedido.", "parcial",
              "Na fila, não sai.", mail="proposta-expirada-cliente", t="T14", para="cliente", sai="Na fila, não sai"),
    ]),
    ("loja-nao-responde", "A loja não responde", "Pedido em análise sem resposta.", [
        passo("loja", "Recebe o lembrete", "Email da loja", "«⏰ ainda sem resposta — expira…»", "falta",
              "Ninguém grava o lembrete (ponto 3).", mail="lembrete-loja", t="—", para="loja", sai="Não sai"),
        passo("sistema", "Expira às 48 h", "Automático", "O pedido passa a expirado.", "parcial", "Só com visitas ao site (ponto 3)."),
        passo("cliente", "Recebe «Lamentamos não ter conseguido dar resposta»", "Email do cliente", "Nada a pagar; pode fazer novo pedido.", "parcial",
              "Na fila, não sai.", mail="expirado-cliente", t="T10", para="cliente", sai="Na fila, não sai"),
    ]),
    ("loja-recusa", "A loja recusa o pedido", "Antes de confirmar: não é possível fazer o pedido nas condições pedidas.", [
        passo("loja", "Recusa", "Detalhe › «Responder» › «Recusar»", "", "falta",
              "Não há botão nem operação; a fonte grava sempre «gerente» e não grava email (pontos 5 e 7)."),
        passo("cliente", "Recebe «não conseguimos dar resposta… nas condições solicitadas»", "Email do cliente", "", "falta",
              "O modelo existe; ninguém o grava.", mail="recusado-cliente", t="T16", para="cliente", sai="Não sai"),
    ]),
    ("entrega", "Entrega ao domicílio, com IBAN", "Pedido para 29/11. Nada disto existe no código; os emails abaixo são o texto do PDF da Andreia.", [
        passo("cliente", "Pede entrega e escreve a morada", "Site · /encomendas/pedido", "", "falta", "Não há opção de entrega nem morada (ponto 8)."),
        passo("loja", "Propõe preço, taxa de entrega e hora", "Detalhe › «Responder»", "", "falta", "O «Responder» não tem taxa nem morada."),
        passo("cliente", "Recebe a proposta com entrega", "Email do cliente", "", "falta", "Sem modelo no código.", mail="T05", t="T05", para="cliente", sai="Não existe"),
        passo("cliente", "Aceita e recebe os dados para pagamento", "Página da proposta → email", "Beneficiário, IBAN, montante, referência, prazo de 24 h.", "falta",
              "Sem modelo, sem estado «aguarda transferência», sem IBAN na configuração (nunca no repositório).", mail="T07", t="T07", para="cliente", sai="Não existe"),
        passo("loja", "Confere o banco e marca «Transferência recebida»", "Detalhe do pedido", "", "falta", "Não há botão, nem registo de quem marcou e quando."),
        passo("cliente", "Recebe «Recebemos o seu pagamento»", "Email do cliente", "", "falta", "Sem modelo.", mail="T08", t="T08", para="cliente", sai="Não existe"),
        passo("cliente", "Ou, sem pagamento no prazo, recebe «foi cancelado»", "Email do cliente", "", "falta",
              "O modelo existe; falta quem o dispare.", mail="cancelado-sem-pagamento-cliente", t="T15", para="cliente", sai="Não sai"),
    ]),
    ("reagendar", "Mudar a data depois de confirmado", "O cliente liga e combina outra hora.", [
        passo("loja", "Muda a data", "Detalhe › «Decisões» › «Mudar a data»", "", "parcial",
              "A fonte aceita «confirmado», mas o botão só aparece em «pago»; não grava emails (ponto 5)."),
        passo("cliente", "Recebe «nova data de levantamento»", "Email do cliente", "", "falta", "Ninguém o grava; o emissor não tem a hora anterior.",
              mail="reagendado-cliente", t="T09", para="cliente", sai="Não sai"),
        passo("loja", "Recebe «REAGENDADO»", "Email da loja", "", "falta", "Ninguém o grava.", mail="reagendado-loja", t="—", para="loja", sai="Não sai"),
    ]),
    ("alterar", "Alterar produtos depois de confirmado", "Por decidir (Em aberto 6): editar o pedido ou criar um relacionado.", [
        passo("loja", "Altera as linhas", "Detalhe do pedido", "", "falta", "Não há operação nem interface (ponto 9)."),
        passo("cliente", "Recebe «foi atualizado»", "Email do cliente", "", "falta", "O texto existe; nada o dispara.",
              mail="alterado-cliente", t="T17", para="cliente", sai="Não sai"),
    ]),
    ("cancelar", "Cancelar depois de confirmado", "A pedido do cliente (por contacto) ou pela loja.", [
        passo("loja", "Cancela, a pedido do cliente", "Detalhe › «Decisões» › «Cancelar»", "", "falta",
              "O botão só aparece em «pago» e a fonte não sabe de quem foi a iniciativa (ponto 5)."),
        passo("cliente", "Recebe «Conforme solicitado… foi cancelada»", "Email do cliente", "", "falta", "Ninguém o grava.",
              mail="cancelado-cliente:cliente", t="T11", para="cliente", sai="Não sai"),
        passo("loja", "Cancela, por decisão da loja", "Detalhe › «Decisões» › «Cancelar»", "", "parcial", "Mesmas limitações."),
        passo("cliente", "Recebe «excecionalmente não nos será possível»", "Email do cliente", "", "falta", "Ninguém o grava.",
              mail="cancelado-cliente:gerente", t="T12", para="cliente", sai="Não sai"),
    ]),
    ("propostas", "💡 Pedir alteração e pedido relacionado", "Não estão no diagrama da Andreia; por decidir (Em aberto 6 e 9).", [
        passo("cliente", "Carrega em «Pedir alteração» e escreve o que quer mudar", "Página da proposta", "", "proposta",
              "Botão novo ao lado de Aceitar/Recusar; o pedido volta à análise da loja com a nota do cliente."),
        passo("loja", "Revê a proposta", "Detalhe › «Responder»", "Já existe: uma proposta revista invalida o link antigo.", "ok"),
        passo("loja", "Cria um pedido relacionado", "Detalhe › «Criar pedido a partir deste»", "", "proposta",
              "Copia cliente e linhas, guarda a ligação ao original (coluna nova, PR só de esquema) e cancela o original."),
    ]),
]

emails_usados = {}

# Quem faz o que falta em cada passo (secção 6 de docs/loja/fluxo-do-pedido.md). Chave: título|T.
S, G, A = "Sobral", "Gonçalo", "Andreia (decide)"
RESP = {
    "Escolhe e envia o pedido|": [S],
    "Recebe «O seu pedido está em análise»|T02": [S],
    "Recebe o pedido por email|—": [S, G],
    "Procura o pedido|": [G],
    "Abre o pedido e responde|": [G, S],
    "Fica à espera do cliente|": [S],
    "Recebe «Temos uma proposta»|T04": [S],
    "Recebe «O seu pedido está confirmado»|T06": [S],
    "Recebe «ACEITE pelo cliente»|—": [S, G],
    "No dia, entrega ao balcão|": [G],
    "Envia o pedido|": [S],
    "Recebe «O seu pedido está confirmado»|T01": [S],
    "Recebe «CONFIRMADO»|—": [S, G],
    "Entrega no dia|": [G],
    "Recebe «Boas notícias!… está confirmado»|T03": [S],
    "Recebe «encerrámos o pedido»|T13": [S],
    "Expira o pedido|": [S],
    "Recebe «A proposta expirou»|T14": [S],
    "Recebe o lembrete|—": [S],
    "Expira às 48 h|": [S],
    "Recebe «Lamentamos não ter conseguido dar resposta»|T10": [S],
    "Recusa|": [G, S],
    "Recebe «não conseguimos dar resposta… nas condições solicitadas»|T16": [S],
    "Pede entrega e escreve a morada|": [G, A],
    "Propõe preço, taxa de entrega e hora|": [G, A],
    "Recebe a proposta com entrega|T05": [G],
    "Aceita e recebe os dados para pagamento|T07": [G, S, A],
    "Confere o banco e marca «Transferência recebida»|": [G, S],
    "Recebe «Recebemos o seu pagamento»|T08": [G],
    "Ou, sem pagamento no prazo, recebe «foi cancelado»|T15": [S],
    "Muda a data|": [G, S],
    "Recebe «nova data de levantamento»|T09": [S],
    "Recebe «REAGENDADO»|—": [S],
    "Altera as linhas|": ["Gonçalo (decide)", A],
    "Recebe «foi atualizado»|T17": [S],
    "Cancela, a pedido do cliente|": [G, S],
    "Recebe «Conforme solicitado… foi cancelada»|T11": [S],
    "Cancela, por decisão da loja|": [G, S],
    "Recebe «excecionalmente não nos será possível»|T12": [S],
    "Carrega em «Pedir alteração» e escreve o que quer mudar|": ["Gonçalo (decide)", A],
    "Cria um pedido relacionado|": ["Gonçalo (decide)", A],
}

# Na versão da Andreia, os textos que explicavam uma falta passam a descrever só o passo.
PARA_ANDREIA = {
    "Procura o pedido": {"texto": "Abre Pedidos › Todos os pedidos e escolhe «Por confirmar»: aparecem os pedidos à espera de resposta da loja.",
                         "captura": ["05-menu-pedidos", "06-lista-por-confirmar"], "onde": "Painel › Pedidos › Todos os pedidos › «Por confirmar»"},
    "Fica à espera do cliente": {"texto": "O pedido fica «À espera do cliente», com o prazo de 24 h para aceitar e o link da proposta."},
    "Escolhe e envia o pedido": {"texto": "Junta 12 pastéis de nata e um bolo por medida, escolhe o dia e a hora no calendário, deixa nome, email e telefone e carrega em «Enviar pedido». Como o bolo não tem preço, o pedido precisa da análise da loja."},
    "Expira o pedido": {"texto": "Passadas as 24 h sem resposta, o pedido expira e a vaga fica livre."},
    "Expira às 48 h": {"texto": "Sem resposta da loja no prazo, o pedido expira e a vaga fica livre."},
    "Recusa": {"texto": "A loja não consegue fazer o pedido nas condições pedidas e recusa-o."},
    "Pede entrega e escreve a morada": {"texto": "Escolhe entrega ao domicílio e escreve a morada."},
    "Propõe preço, taxa de entrega e hora": {"texto": "A loja responde com o preço, a taxa de entrega e a data e hora da entrega."},
    "Confere o banco e marca «Transferência recebida»": {"texto": "Quando a transferência chega, a loja marca o pagamento como recebido."},
    "Muda a data": {"texto": "Depois de combinar com o cliente, a loja muda a data ou a hora do levantamento."},
    "Altera as linhas": {"texto": "Depois de combinar com o cliente, a loja altera os produtos do pedido."},
    "Cancela, a pedido do cliente": {"texto": "O cliente liga a pedir o cancelamento e a loja cancela o pedido."},
    "Cancela, por decisão da loja": {"texto": "A loja não consegue fazer o pedido e cancela-o."},
    "Carrega em «Pedir alteração» e escreve o que quer mudar": {"texto": "Ideia nova: na página da proposta, além de aceitar ou recusar, o cliente pode pedir uma alteração, e o pedido volta à loja."},
    "Cria um pedido relacionado": {"texto": "Ideia nova: em vez de editar um pedido confirmado, a loja cria um pedido novo a partir dele, e o original é cancelado."},
    "Abre a proposta": {"onde": "Página da proposta, aberta pelo botão do email"},
    "Recebe o lembrete": {"texto": "A loja recebe um aviso antes de o prazo de resposta acabar."},
    "No dia, entrega ao balcão": {"texto": "O cliente diz a referência ao balcão e a equipa marca o pedido como entregue."},
}
SUB_ANDREIA = {
    "entrega": "Entrega em casa, com pagamento por transferência bancária.",
    "alterar": "Depois de confirmado, a loja altera os produtos combinados com o cliente.",
    "propostas": "Duas ideias que não estão no diagrama, para decidir na reunião.",
}


def render_passo(p, n):
    chips = {"ok": "✅ existe", "parcial": "🟡 em parte", "falta": "❌ falta", "proposta": "💡 proposta"}
    quem = {"cliente": "Cliente", "loja": "Loja", "sistema": "Automático"}[p["quem"]]
    if MODO == "andreia":
        p = {**p, **PARA_ANDREIA.get(p["titulo"], {})}
    h = [f'<li class="passo {p["quem"]}"><div class="marca"><span class="num">{n}</span></div><div class="conteudo">']
    cab = f'<span class="quem {p["quem"]}">{quem}</span>'
    if MODO == "equipa":
        cab += f'<span class="chip {p["estado"]}">{chips[p["estado"]]}</span>'
    elif p["estado"] == "proposta":
        cab += '<span class="chip proposta">💡 ideia para decidir</span>'
    h.append(f'<div class="cab">{cab}</div>')
    h.append(f'<h4>{html.escape(p["titulo"])}</h4><p class="onde">{html.escape(p["onde"])}</p>')
    if p["texto"]:
        h.append(f'<p>{html.escape(p["texto"])}</p>')
    if MODO == "equipa" and p["nota"]:
        resp = RESP.get(f'{p["titulo"]}|{p["t"] or ""}', [])
        donos = "".join(f'<span class="dono{" decide" if "decide" in r else ""}">{html.escape(r)}</span>' for r in resp)
        h.append(f'<div class="nota"><p><strong>Falta:</strong> {html.escape(p["nota"])}</p>'
                 + (f'<p class="donos"><strong>Responsável:</strong> {donos}</p>' if donos else "") + "</div>")
    caps = p["captura"] if isinstance(p["captura"], list) else ([p["captura"]] if p["captura"] else [])
    if caps:
        h.append('<div class="capturas">' + "".join(
            f'<a href="capturas/{c}.jpg" target="_blank" rel="noopener"><img src="capturas/{c}.jpg" alt="{html.escape(p["titulo"])}" loading="lazy"></a>'
            for c in caps) + "</div>")
    if p["mail"]:
        e = email(p["mail"])
        ident = "m-" + re.sub(r"[^a-z0-9]", "-", p["mail"].lower())
        emails_usados[ident] = e["html"]
        h.append(f'<details class="email" data-email="{ident}"><summary>'
                 f'<span class="t">{html.escape(p["t"])}</span>'
                 f'<span class="assunto">{html.escape(e["assunto"])}</span>'
                 + (f'<span class="meta">Para: {"o cliente" if p["para"] == "cliente" else "a loja"} · <code>{html.escape(e["modelo"])}</code> · {html.escape(p["sai"])}</span>'
                    if MODO == "equipa" else f'<span class="meta">Para: {"o cliente" if p["para"] == "cliente" else "a loja"}</span>')
                 + '</summary><iframe title="Email" loading="lazy"></iframe></details>')
    h.append("</div></li>")
    return "".join(h)


principal = "".join(render_passo(p, i + 1) for i, p in enumerate(PRINCIPAL))
abas, paineis = [], []
for i, (ident, titulo, sub, passos) in enumerate(CAMINHOS):
    abas.append(f'<button type="button" role="tab" id="aba-{ident}" aria-controls="caminho-{ident}" aria-selected="{"true" if i == 0 else "false"}">{html.escape(titulo)}</button>')
    corpo = "".join(render_passo(p, j + 1) for j, p in enumerate(passos))
    paineis.append(f'<section class="caminho" role="tabpanel" id="caminho-{ident}" aria-labelledby="aba-{ident}"{"" if i == 0 else " hidden"}>'
                   f'<h3>{html.escape(titulo)}</h3><p class="sub">{html.escape(SUB_ANDREIA.get(ident, sub) if MODO == "andreia" else sub)}</p><ol class="passos">{corpo}</ol></section>')

molde = open(os.path.join(AQUI, f"molde-{MODO}.html"), encoding="utf-8").read()
pagina = (molde.replace("{{PRINCIPAL}}", principal)
          .replace("{{ABAS}}", "".join(abas))
          .replace("{{CAMINHOS}}", "".join(paineis))
          .replace("{{EMAILS}}", json.dumps(emails_usados, ensure_ascii=False).replace("</", "<\\/")))
open(os.path.join(AQUI, f"{MODO}.html"), "w", encoding="utf-8").write(pagina)
print(len(PRINCIPAL), "passos no pedido principal,", len(CAMINHOS), "caminhos,", len(emails_usados), "emails,", len(pagina) // 1024, "KB")
