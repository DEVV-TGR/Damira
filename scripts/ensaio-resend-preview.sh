#!/bin/sh
# Só esta branch temporária executa o ensaio: nunca integrar no main.
set -eu
test "${VERCEL_ENV:-}" = preview
test "${LOJA_EM_TESTE:-}" = 1
test "${EMAILS_SO_PARA:-}" = developerplusteam@gmail.com
npm run emails:enviar -- --para "$EMAILS_SO_PARA" --modelo criado-confirmado-cliente --lingua pt --responder-para "$EMAILS_SO_PARA" --enviar
