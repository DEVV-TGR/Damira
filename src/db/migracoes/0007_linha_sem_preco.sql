ALTER TABLE "linhas_pedido" DROP CONSTRAINT "linhas_pedido_precos";--> statement-breakpoint
ALTER TABLE "linhas_pedido" ALTER COLUMN "preco_unitario_cent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "linhas_pedido" ALTER COLUMN "total_cent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "linhas_pedido" ADD CONSTRAINT "linhas_pedido_precos" CHECK (("linhas_pedido"."preco_unitario_cent" is null) = ("linhas_pedido"."total_cent" is null)
        and ("linhas_pedido"."preco_unitario_cent" is null or ("linhas_pedido"."preco_unitario_cent" >= 0 and "linhas_pedido"."total_cent" >= 0)));