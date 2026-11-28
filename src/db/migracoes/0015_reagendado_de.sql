-- A hora de levantamento antes do último reagendamento (ponto 5 do fluxo do pedido):
-- o «inicialmente previsto» do email reagendado-cliente e o «Antes» do reagendado-loja.
-- Não é o levantamento_anterior_em, que é a hora pedida antes de uma proposta.
--
-- Recusar não precisa de esquema: uma recusa é um cancelado pela casa que nunca chegou
-- a confirmado (cancelado_por = 'gerente' e confirmado_em nulo), e o cancelado_por já
-- aceita 'cliente' desde a 0002.
--
-- Só acrescenta: a coluna nasce nula, e o CHECK vai num sentido só (só um reagendamento
-- guarda a hora de antes), por isso os pedidos reagendados antes desta migração ficam
-- válidos. O código de antes não a lê nem a escreve: pode aplicar-se no production antes
-- do merge. Antes de aplicar no production, criar o ramo de segurança antes-0015;
-- aplicar primeiro no desenvolvimento e depois no production.
ALTER TABLE "pedidos" ADD COLUMN "reagendado_de" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_reagendado_de" CHECK ("pedidos"."reagendado_de" is null or "pedidos"."reagendado_em" is not null);