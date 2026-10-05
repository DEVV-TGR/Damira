CREATE TABLE "codigos_gerente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"tentativas" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "codigos_gerente_datas" CHECK ("codigos_gerente"."expira_em" > "codigos_gerente"."criado_em"),
	CONSTRAINT "codigos_gerente_tentativas" CHECK ("codigos_gerente"."tentativas" >= 0)
);
--> statement-breakpoint
CREATE TABLE "limites" (
	"chave" text NOT NULL,
	"janela" timestamp with time zone NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "limites_chave_janela_pk" PRIMARY KEY("chave","janela"),
	CONSTRAINT "limites_contagem" CHECK ("limites"."contagem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessoes_painel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"papel" text NOT NULL,
	"lembrar" boolean NOT NULL,
	"dispositivo" text,
	"criada_em" timestamp with time zone NOT NULL,
	"ultimo_uso_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	CONSTRAINT "sessoes_painel_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessoes_painel_papel" CHECK ("sessoes_painel"."papel" in ('funcionario', 'gerente')),
	CONSTRAINT "sessoes_painel_datas" CHECK ("sessoes_painel"."ultimo_uso_em" >= "sessoes_painel"."criada_em" and "sessoes_painel"."expira_em" > "sessoes_painel"."criada_em")
);
