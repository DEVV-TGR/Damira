ALTER TABLE "produtos" ADD COLUMN "pede_confirmacao" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- O valor de partida dos produtos que já existem: ligado só nos que não têm
-- preço nenhum — nenhuma variante com `preco_cent`, que `NULL` é «sob
-- orçamento» e nunca zero. É a conta do `pedeConfirmacaoInicial`
-- (`src/lib/dados/regras.ts`), a mesma que os JSON fazem; daí para a frente é
-- da gerente. Numa base de dados vazia não muda nada.
--
-- O `drizzle-kit` gera a coluna e não os dados: esta instrução foi escrita à
-- mão, depois do `drizzle-kit generate`.
UPDATE "produtos" SET "pede_confirmacao" = true
WHERE NOT EXISTS (
	SELECT 1 FROM "variantes"
	WHERE "variantes"."produto_id" = "produtos"."id" AND "variantes"."preco_cent" IS NOT NULL
);
