CREATE TABLE "extras" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_pt" text NOT NULL,
	"nome_en" text,
	"preco_cent" integer NOT NULL,
	"maximo" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "extras_id_formato" CHECK ("extras"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "extras_nome_pt" CHECK (btrim("extras"."nome_pt") <> ''),
	CONSTRAINT "extras_preco" CHECK ("extras"."preco_cent" >= 0),
	CONSTRAINT "extras_maximo" CHECK ("extras"."maximo" >= 1)
);
--> statement-breakpoint
CREATE TABLE "produtos_extras" (
	"produto_id" text NOT NULL,
	"extra_id" text NOT NULL,
	"posicao" integer NOT NULL,
	CONSTRAINT "produtos_extras_produto_id_extra_id_pk" PRIMARY KEY("produto_id","extra_id"),
	CONSTRAINT "produtos_extras_posicao" CHECK ("produtos_extras"."posicao" >= 0)
);
--> statement-breakpoint
CREATE TABLE "produtos_variancias" (
	"produto_id" text NOT NULL,
	"variancia_id" text NOT NULL,
	"posicao" integer NOT NULL,
	CONSTRAINT "produtos_variancias_produto_id_variancia_id_pk" PRIMARY KEY("produto_id","variancia_id"),
	CONSTRAINT "produtos_variancias_posicao" CHECK ("produtos_variancias"."posicao" >= 0)
);
--> statement-breakpoint
CREATE TABLE "variancias" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_pt" text NOT NULL,
	"nome_en" text,
	"escolhas" jsonb NOT NULL,
	CONSTRAINT "variancias_id_formato" CHECK ("variancias"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "variancias_nome_pt" CHECK (btrim("variancias"."nome_pt") <> ''),
	CONSTRAINT "variancias_escolhas" CHECK (jsonb_typeof("variancias"."escolhas") = 'array' and jsonb_array_length("variancias"."escolhas") > 0)
);
--> statement-breakpoint
CREATE TABLE "variantes_leva" (
	"produto_id" text NOT NULL,
	"variante_id" text NOT NULL,
	"posicao" integer NOT NULL,
	"simples_id" text NOT NULL,
	"quantidade" numeric,
	CONSTRAINT "variantes_leva_produto_id_variante_id_posicao_pk" PRIMARY KEY("produto_id","variante_id","posicao"),
	CONSTRAINT "variantes_leva_posicao" CHECK ("variantes_leva"."posicao" >= 0),
	CONSTRAINT "variantes_leva_quantidade" CHECK ("variantes_leva"."quantidade" > 0),
	CONSTRAINT "variantes_leva_nao_a_si" CHECK ("variantes_leva"."simples_id" <> "variantes_leva"."produto_id")
);
--> statement-breakpoint
ALTER TABLE "linhas_pedido" ADD COLUMN "personalizacao" jsonb;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "opcoes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "variantes" ADD COLUMN "ativa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos_extras" ADD CONSTRAINT "produtos_extras_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos_extras" ADD CONSTRAINT "produtos_extras_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos_variancias" ADD CONSTRAINT "produtos_variancias_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos_variancias" ADD CONSTRAINT "produtos_variancias_variancia_id_variancias_id_fk" FOREIGN KEY ("variancia_id") REFERENCES "public"."variancias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variantes_leva" ADD CONSTRAINT "variantes_leva_simples_id_produtos_id_fk" FOREIGN KEY ("simples_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variantes_leva" ADD CONSTRAINT "variantes_leva_variante_fk" FOREIGN KEY ("produto_id","variante_id") REFERENCES "public"."variantes"("produto_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "variantes_leva_unico" ON "variantes_leva" USING btree ("produto_id","variante_id","simples_id");--> statement-breakpoint
/* As `escolhas` de hoje (os sabores de seis artigos da carta) passam a uma
   variância a 0 €, com o mesmo comportamento: escolhe-se uma
   (`painel-gerente.md` › Simples e compostos). Os ids são os mesmos que a
   fonte dos JSON dá (`<produto>-sabor`, `s1`, `s2`…), para um cesto não mudar
   de sentido ao trocar de fonte. A coluna `escolhas` fica, sem ninguém a ler,
   para o código de antes continuar a correr enquanto o deploy não chega; sai
   numa migração à parte. */
INSERT INTO "variancias" ("id", "nome_pt", "nome_en", "escolhas")
SELECT p."id" || '-sabor', 'Sabor', 'Flavour',
  (SELECT jsonb_agg(jsonb_build_object(
      'id', 's' || u.o,
      'nome', jsonb_build_object('pt', u.s, 'en', null),
      'acrescimoCent', 0,
      'ativa', true) ORDER BY u.o)
   FROM unnest(p."escolhas") WITH ORDINALITY AS u(s, o))
FROM "produtos" p
WHERE cardinality(p."escolhas") > 0;--> statement-breakpoint
INSERT INTO "produtos_variancias" ("produto_id", "variancia_id", "posicao")
SELECT p."id", p."id" || '-sabor', 0
FROM "produtos" p
WHERE cardinality(p."escolhas") > 0;
