CREATE TABLE "emails_por_enviar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"modelo" text NOT NULL,
	"destinatario" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"ultima_tentativa_em" timestamp with time zone,
	"ultimo_erro" text,
	"enviado_em" timestamp with time zone,
	CONSTRAINT "emails_por_enviar_modelo" CHECK ("emails_por_enviar"."modelo" <> '' and "emails_por_enviar"."destinatario" <> ''),
	CONSTRAINT "emails_por_enviar_tentativas" CHECK ("emails_por_enviar"."tentativas" >= 0),
	CONSTRAINT "emails_por_enviar_datas" CHECK ("emails_por_enviar"."enviado_em" is null or "emails_por_enviar"."enviado_em" >= "emails_por_enviar"."criado_em")
);
--> statement-breakpoint
CREATE TABLE "eventos_stripe" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"api_version" text,
	"recebido_em" timestamp with time zone NOT NULL,
	CONSTRAINT "eventos_stripe_id" CHECK ("eventos_stripe"."id" like 'evt\_%')
);
--> statement-breakpoint
CREATE TABLE "linhas_pedido" (
	"pedido_id" uuid NOT NULL,
	"posicao" integer NOT NULL,
	"produto_id" text NOT NULL,
	"variante_id" text NOT NULL,
	"nome" text NOT NULL,
	"variante" text,
	"escolhas" text[] DEFAULT '{}' NOT NULL,
	"unidade" text NOT NULL,
	"quantidade" numeric NOT NULL,
	"preco_unitario_cent" integer NOT NULL,
	"total_cent" integer NOT NULL,
	"notas" text,
	CONSTRAINT "linhas_pedido_pedido_id_posicao_pk" PRIMARY KEY("pedido_id","posicao"),
	CONSTRAINT "linhas_pedido_posicao" CHECK ("linhas_pedido"."posicao" >= 0),
	CONSTRAINT "linhas_pedido_unidade" CHECK ("linhas_pedido"."unidade" in ('un', 'kg')),
	CONSTRAINT "linhas_pedido_quantidade" CHECK ("linhas_pedido"."quantidade" > 0),
	CONSTRAINT "linhas_pedido_precos" CHECK ("linhas_pedido"."preco_unitario_cent" >= 0 and "linhas_pedido"."total_cent" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referencia" text NOT NULL,
	"estado" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"levantamento_em" timestamp with time zone NOT NULL,
	"pago_em" timestamp with time zone,
	"impresso_em" timestamp with time zone,
	"entregue_em" timestamp with time zone,
	"cancelado_em" timestamp with time zone,
	"reagendado_em" timestamp with time zone,
	"cliente_nome" text NOT NULL,
	"cliente_email" text NOT NULL,
	"cliente_telefone" text NOT NULL,
	"cliente_nif" text,
	"conta_id" text,
	"observacoes" text,
	"total_cent" integer NOT NULL,
	"modo_pagamento" text NOT NULL,
	"pago_online_cent" integer DEFAULT 0 NOT NULL,
	"chegou_tarde" boolean DEFAULT false NOT NULL,
	"cancelado_por" text,
	"avisos_tratados" text[] DEFAULT '{}' NOT NULL,
	"chave_idempotencia" uuid NOT NULL,
	"ip" text,
	"stripe_session_id" text,
	"procura" text NOT NULL,
	"reembolso_reservado_cent" integer DEFAULT 0 NOT NULL,
	"de_teste" boolean NOT NULL,
	CONSTRAINT "pedidos_referencia_unique" UNIQUE("referencia"),
	CONSTRAINT "pedidos_chave_idempotencia_unique" UNIQUE("chave_idempotencia"),
	CONSTRAINT "pedidos_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "pedidos_estado" CHECK ("pedidos"."estado" in ('pendente', 'pago', 'entregue', 'expirado', 'cancelado')),
	CONSTRAINT "pedidos_referencia" CHECK ("pedidos"."referencia" ~ '^DAM-[0-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
	CONSTRAINT "pedidos_telefone" CHECK ("pedidos"."cliente_telefone" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "pedidos_nif" CHECK ("pedidos"."cliente_nif" ~ '^[0-9]{9}$'),
	CONSTRAINT "pedidos_modo_pagamento" CHECK ("pedidos"."modo_pagamento" in ('total', 'sinal')),
	CONSTRAINT "pedidos_valores" CHECK ("pedidos"."total_cent" >= 0 and "pedidos"."pago_online_cent" >= 0),
	CONSTRAINT "pedidos_reembolso_reservado" CHECK ("pedidos"."reembolso_reservado_cent" >= 0 and "pedidos"."reembolso_reservado_cent" <= "pedidos"."pago_online_cent"),
	CONSTRAINT "pedidos_pago_em" CHECK (("pedidos"."pago_em" is not null) = ("pedidos"."estado" in ('pago', 'entregue', 'cancelado'))),
	CONSTRAINT "pedidos_entregue_em" CHECK ("pedidos"."estado" <> 'entregue' or "pedidos"."entregue_em" is not null),
	CONSTRAINT "pedidos_cancelado" CHECK (("pedidos"."estado" = 'cancelado') = ("pedidos"."cancelado_em" is not null) and ("pedidos"."cancelado_em" is null) = ("pedidos"."cancelado_por" is null)),
	CONSTRAINT "pedidos_cancelado_por" CHECK ("pedidos"."cancelado_por" in ('cliente', 'gerente')),
	CONSTRAINT "pedidos_chegou_tarde" CHECK (not "pedidos"."chegou_tarde" or "pedidos"."pago_em" is not null),
	CONSTRAINT "pedidos_avisos_tratados" CHECK ("pedidos"."avisos_tratados" <@ array['chegou-tarde', 'possivel-duplicado', 'dia-fechado', 'reembolso-falhado']::text[])
);
--> statement-breakpoint
CREATE TABLE "quantidades_dia" (
	"produto_id" text NOT NULL,
	"dia" date NOT NULL,
	"ocupadas" numeric DEFAULT 0 NOT NULL,
	"limite" integer,
	CONSTRAINT "quantidades_dia_produto_id_dia_pk" PRIMARY KEY("produto_id","dia"),
	CONSTRAINT "quantidades_dia_ocupadas" CHECK ("quantidades_dia"."ocupadas" >= 0),
	CONSTRAINT "quantidades_dia_limite" CHECK ("quantidades_dia"."limite" >= 0),
	CONSTRAINT "quantidades_dia_no_limite" CHECK ("quantidades_dia"."limite" is null or "quantidades_dia"."ocupadas" <= "quantidades_dia"."limite")
);
--> statement-breakpoint
CREATE TABLE "quantidades_total" (
	"produto_id" text PRIMARY KEY NOT NULL,
	"ocupadas" numeric DEFAULT 0 NOT NULL,
	"limite" integer,
	CONSTRAINT "quantidades_total_ocupadas" CHECK ("quantidades_total"."ocupadas" >= 0),
	CONSTRAINT "quantidades_total_limite" CHECK ("quantidades_total"."limite" >= 0),
	CONSTRAINT "quantidades_total_no_limite" CHECK ("quantidades_total"."limite" is null or "quantidades_total"."ocupadas" <= "quantidades_total"."limite")
);
--> statement-breakpoint
CREATE TABLE "reembolsos" (
	"id" text PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"valor_cent" integer NOT NULL,
	"estado" text NOT NULL,
	"pedido_em" timestamp with time zone NOT NULL,
	"stripe_refund_id" text,
	"estado_stripe" text,
	"motivo" text,
	"falha_tratada_em" timestamp with time zone,
	CONSTRAINT "reembolsos_stripe_refund_id_unique" UNIQUE("stripe_refund_id"),
	CONSTRAINT "reembolsos_valor" CHECK ("reembolsos"."valor_cent" > 0),
	CONSTRAINT "reembolsos_estado" CHECK ("reembolsos"."estado" in ('pendente', 'concluido', 'falhado')),
	CONSTRAINT "reembolsos_estado_stripe" CHECK ("reembolsos"."estado_stripe" is null or ("reembolsos"."estado" = 'pendente' and "reembolsos"."estado_stripe" in ('pending', 'requires_action')) or ("reembolsos"."estado" = 'concluido' and "reembolsos"."estado_stripe" in ('succeeded')) or ("reembolsos"."estado" = 'falhado' and "reembolsos"."estado_stripe" in ('failed', 'canceled'))),
	CONSTRAINT "reembolsos_falha_tratada" CHECK ("reembolsos"."falha_tratada_em" is null or "reembolsos"."estado" = 'falhado')
);
--> statement-breakpoint
CREATE TABLE "vagas" (
	"inicio" timestamp with time zone PRIMARY KEY NOT NULL,
	"ocupadas" integer DEFAULT 0 NOT NULL,
	"limite" integer,
	CONSTRAINT "vagas_ocupadas" CHECK ("vagas"."ocupadas" >= 0),
	CONSTRAINT "vagas_limite" CHECK ("vagas"."limite" >= 0),
	CONSTRAINT "vagas_no_limite" CHECK ("vagas"."limite" is null or "vagas"."ocupadas" <= "vagas"."limite")
);
--> statement-breakpoint
ALTER TABLE "emails_por_enviar" ADD CONSTRAINT "emails_por_enviar_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linhas_pedido" ADD CONSTRAINT "linhas_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linhas_pedido" ADD CONSTRAINT "linhas_pedido_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantidades_dia" ADD CONSTRAINT "quantidades_dia_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantidades_total" ADD CONSTRAINT "quantidades_total_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_por_enviar_pendentes" ON "emails_por_enviar" USING btree ("criado_em") WHERE "emails_por_enviar"."enviado_em" is null;--> statement-breakpoint
CREATE INDEX "pedidos_estado_levantamento" ON "pedidos" USING btree ("estado","levantamento_em");--> statement-breakpoint
CREATE INDEX "pedidos_criado_em_id" ON "pedidos" USING btree ("criado_em","id");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_email" ON "pedidos" USING btree ("cliente_email");--> statement-breakpoint
CREATE INDEX "pedidos_pendentes_por_ip" ON "pedidos" USING btree ("ip") WHERE "pedidos"."estado" = 'pendente';--> statement-breakpoint
CREATE INDEX "pedidos_pendentes_por_email" ON "pedidos" USING btree ("cliente_email") WHERE "pedidos"."estado" = 'pendente';--> statement-breakpoint
CREATE INDEX "reembolsos_pedido" ON "reembolsos" USING btree ("pedido_id");