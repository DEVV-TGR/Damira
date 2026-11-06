CREATE TABLE "avisos_dinheiro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"stripe_id" text NOT NULL,
	"detalhe" text,
	"criado_em" timestamp with time zone NOT NULL,
	"tratado_em" timestamp with time zone,
	CONSTRAINT "avisos_dinheiro_facto" UNIQUE("tipo","stripe_id"),
	CONSTRAINT "avisos_dinheiro_tipo" CHECK ("avisos_dinheiro"."tipo" in ('disputa', 'apanhado-pela-verificacao', 'pagamento-nao-bate')),
	CONSTRAINT "avisos_dinheiro_stripe_id" CHECK ("avisos_dinheiro"."stripe_id" <> ''),
	CONSTRAINT "avisos_dinheiro_tratado" CHECK ("avisos_dinheiro"."tratado_em" is null or "avisos_dinheiro"."tratado_em" >= "avisos_dinheiro"."criado_em")
);
--> statement-breakpoint
ALTER TABLE "avisos_dinheiro" ADD CONSTRAINT "avisos_dinheiro_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avisos_dinheiro_por_tratar" ON "avisos_dinheiro" USING btree ("criado_em") WHERE "avisos_dinheiro"."tratado_em" is null;--> statement-breakpoint
CREATE INDEX "avisos_dinheiro_pedido" ON "avisos_dinheiro" USING btree ("pedido_id");