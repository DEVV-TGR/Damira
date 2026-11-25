# Emissor dos emails — plano de execução

Especificação: pedido integral entregue pelo Tomás a 25/11/2026, #119 etapa 1.
Objetivo: consumir a fila existente pelo Resend sem duplicar envios nem afetar pedidos.
Arquitetura: regras puras, FonteEmails com reserva condicional, transporte injetável,
execução server-only e helper after ainda sem chamadas das ações.
Tecnologias: TypeScript, Drizzle, Vitest/PGlite, fetch, Next after.

## Restrições

Branch feat/emissor-emails de origin/main 74c573f. Sem worktrees, migrações,
.env, Neon, cron ou envios reais nesta fase. #139 aberto: resposta-cliente
fica pendente sem tentativa. Modelos e HTML existentes não se alteram.

## Execução

- [x] Testes puros: fotografia gravada, preços desconhecidos, datas, saltados,
  resposta ainda não suportada e tentativas com janela de reserva de 2 minutos.
- [x] Implementar emissor.ts puro e transporte Resend com fetch injetável.
- [x] Testes PGlite: duas voltas concorrentes, reserva expirada, falhas HTTP/rede,
  máximo de cinco tentativas, destino seguro, erros sem dados pessoais.
- [x] Implementar FonteEmails nos tipos, BD e JSON, expor na fronteira e proteger
  a leitura dos falhados para a gerente. Reservas e conclusões condicionais com
  identificação da tentativa para um trabalhador antigo não terminar a nova.
- [x] Entrada server-only enviarEmailsPendentes e helper enviarDepois; limite
  máximo 10, timeout Resend 10 s, intervalo 600 ms. Script manual com opt-in.
- [x] Atualizar documentação, .env.example e instruções de integração.
- [ ] Lint, build sem ambiente numa cópia temporária e suite completa; rever diff,
  commits pequenos e PR com pedido de revisão ao gncalo. Sem merge.
- [ ] Atualizar os dois ficheiros locais. Pedir os elementos e autorização do
  ensaio real apenas quando o resultado estiver verificável.

## Pontos de revisão

- Falha depois do envio e antes de marcar: mesma chave; depois da janela de
  idempotência, bloquear repetição automaticamente (critério conservador: 24 h
  desde criadoEm numa linha já tentada), sem coluna nova.
- Payload diferente numa repetição: 409 fica terminal, sem mudar a chave.
- Linhas muito antigas/não suportadas não devem bloquear as suportadas.
- Uma falha individual de leitura/modelo não deve impedir o resto do lote.
- Contactos continuam no JSON como no site; a tabela casa só tem configuração.

## Registo de execução

Revisão independente: sete problemas corrigidos com testes (janela de 24 h no
fetch, ordem do recibo, hora de conclusão, reserva não suportada, remetente de
teste, aviso de teste no script, servidor confirmado no ensaio).
Decisões: contactos continuam no JSON como no site; janela conservadora desde a
criação; não há envio nem ensaio real porque a chave Resend ainda não existe
(confirmado pelo Tomás nesta sessão). Revisão pelo Claude bloqueada por OAuth
expirado; o PR só se abre após revisão ou dispensa explícita dessa regra.

Verificação final: lint verde; 1209 testes verdes/39 ignorados; build Webpack
e TypeScript verdes em cópia sem ambiente, 41 páginas. Script sem flags
executado sem consultas nem envios. PR preparado localmente, por abrir.
