-- Dias em que um produto não se encomenda para levantamento: intervalos inclusivos
-- de dias de Lisboa ({de, ate}), definidos pela gerente produto a produto.
-- Só acrescenta: a coluna nasce vazia, sem alterar qualquer valor que a gerente
-- edita nem preencher datas inventadas (regra 1 do catálogo do production).
-- O código em produção ainda não a lê: pode aplicar-se antes do PR da função.
-- Antes de aplicar no production, criar o ramo de segurança antes-0014;
-- aplicar primeiro no desenvolvimento e depois no production, sem repor catálogos.
ALTER TABLE "produtos" ADD COLUMN "dias_sem_encomenda" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_dias_sem_encomenda" CHECK (jsonb_typeof("produtos"."dias_sem_encomenda") = 'array');