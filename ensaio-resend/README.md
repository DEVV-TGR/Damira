# Ensaio isolado do Resend

Esta branch é um ensaio operacional temporário; **não se integra no main**.
O `vercel.json` serve apenas esta página estática, em vez da aplicação Next.
Não consulta a base de dados nem executa migrações.

O build só avança em Preview, com `LOJA_EM_TESTE=1` e o destino do ensaio
explicitamente confirmado. Usa o script existente, com um único exemplo PT de
pedido confirmado. O destinatário e o endereço de resposta são a caixa de
testes; nenhuma mensagem é dirigida à casa ou a um cliente.

Cada nova execução deste build envia um novo email. Não há idempotência neste
script de modelos: não o voltar a lançar apenas para consultar os resultados.
O ensaio da fila e da sua idempotência é separado.

Uma falha do Resend interrompe o build. A página publicada só significa que a
API aceitou o email; a receção na caixa ou no spam confirma-se à parte.
Não registar chaves ou outros segredos nos logs.
