ALTER TABLE "linhas_pedido" ADD COLUMN "preco_da_proposta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "proposta_versao" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "proposta_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "levantamento_anterior_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "linhas_pedido" ADD CONSTRAINT "linhas_pedido_preco_da_proposta" CHECK (not "linhas_pedido"."preco_da_proposta" or "linhas_pedido"."preco_unitario_cent" is not null);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_proposta" CHECK ("pedidos"."proposta_versao" >= 0
        and ("pedidos"."proposta_versao" = 0) = ("pedidos"."proposta_em" is null)
        and ("pedidos"."estado" <> 'a-aguardar-aceite' or "pedidos"."proposta_versao" > 0)
        and ("pedidos"."levantamento_anterior_em" is null or "pedidos"."proposta_versao" > 0));