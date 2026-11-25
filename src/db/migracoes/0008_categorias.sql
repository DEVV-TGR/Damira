-- As categorias da gerente e os dois tipos de produto (#124).
--
-- O `drizzle-kit` gera as colunas `NOT NULL` logo à nascença, e isso só serve
-- numa tabela vazia: a Neon já tem os 107 produtos. Por isso esta migração foi
-- reescrita à mão, depois do `drizzle-kit generate`: as colunas nascem vazias,
-- enchem-se a partir do que cada produto já é, e só depois ficam obrigatórias.
-- O fim é o mesmo esquema que o `esquema.ts` descreve.
--
-- ⚠️ A conta é a do `src/db/categorias.ts` (`categoriaDoProduto`,
-- `tipoDoProduto`, `categoriasDoCatalogo`), que a importação e o painel usam. As
-- duas têm de dar o mesmo, e o `migracao-categorias.test.ts` compara-as sobre o
-- catálogo inteiro. Numa base de dados vazia esta parte não muda nada.
CREATE TABLE "categorias" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_pt" text NOT NULL,
	"nome_en" text,
	"posicao" integer NOT NULL,
	"arquivada" boolean DEFAULT false NOT NULL,
	CONSTRAINT "categorias_id_formato" CHECK ("categorias"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "categorias_nome_pt" CHECK (btrim("categorias"."nome_pt") <> '' and char_length("categorias"."nome_pt") <= 60),
	CONSTRAINT "categorias_nome_en" CHECK (btrim("categorias"."nome_en") <> '' and char_length("categorias"."nome_en") <= 60),
	CONSTRAINT "categorias_posicao" CHECK ("categorias"."posicao" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_nome_unico" ON "categorias" USING btree (lower("nome_pt")) WHERE not "categorias"."arquivada";--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "categoria_id" text;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "tipo" text;--> statement-breakpoint
-- A categoria de cada produto: as secções da `/encomendas` para os kits e as
-- boxes (o bolo por medida já vive com os kits de bolo), e o `{carta}-{categoria}`
-- de hoje para os artigos da carta — que é a âncora que já existe. Composto é o
-- que se descreve pelo que leva: uma variante com composição.
UPDATE "produtos" SET
	"categoria_id" = CASE "familia"
		WHEN 'festa' THEN 'festas'
		WHEN 'bolo' THEN 'kits-bolo'
		WHEN 'medida' THEN 'kits-bolo'
		WHEN 'box' THEN 'boxes'
		ELSE "carta" || '-' || "categoria"
	END,
	"tipo" = CASE WHEN EXISTS (
		SELECT 1 FROM "variantes"
		WHERE "variantes"."produto_id" = "produtos"."id" AND "variantes"."composicao" <> '[]'::jsonb
	) THEN 'composto' ELSE 'simples' END;--> statement-breakpoint
-- Uma categoria por cada uma que os produtos usam, com o nome das páginas de
-- hoje (`messages/*.json`) e a ordem da `/encomendas`: as encomendas primeiro,
-- depois a carta, pela ordem das cartas e, dentro de cada uma, pela ordem que a
-- gerente gravou (#87). O que a carta junta ao nome é o que evita dois «Doces».
INSERT INTO "categorias" ("id", "nome_pt", "nome_en", "posicao")
SELECT "id", "nome_pt", "nome_en", (row_number() OVER (ORDER BY "grupo", "ordem_1" NULLS LAST, "ordem_2" NULLS LAST, "id" COLLATE "C") - 1)::integer
FROM (
	SELECT DISTINCT ON (p."categoria_id")
		p."categoria_id" AS "id",
		CASE
			WHEN p."familia" = 'festa' THEN 'Kit Festas'
			WHEN p."familia" IN ('bolo', 'medida') THEN 'Bolo e mesa decorada'
			WHEN p."familia" = 'box' THEN 'Boxes para dias especiais'
			WHEN p."categoria_id" = 'chocolate-formatos' THEN 'Chocolate do Dubai'
			ELSE coalesce(r."pt", p."categoria") || coalesce(c."pt", ' (' || p."carta" || ')')
		END AS "nome_pt",
		CASE
			WHEN p."familia" = 'festa' THEN 'Party Kits'
			WHEN p."familia" IN ('bolo', 'medida') THEN 'Cake and decorated table'
			WHEN p."familia" = 'box' THEN 'Boxes for special days'
			WHEN p."categoria_id" = 'chocolate-formatos' THEN 'Dubai Chocolate'
			WHEN coalesce(c."en", p."carta" || ' ') = '' THEN coalesce(r."en", p."categoria")
			ELSE coalesce(c."en", p."carta" || ' ') || lower(coalesce(r."en", p."categoria"))
		END AS "nome_en",
		CASE WHEN p."familia" = 'ementa' THEN 1 ELSE 0 END AS "grupo",
		CASE WHEN p."familia" = 'ementa'
			THEN coalesce(
				(SELECT e."i" - 1 FROM jsonb_array_elements_text(o."ordem_ementa" -> 'cartas') WITH ORDINALITY AS e("v", "i") WHERE e."v" = p."carta"),
				jsonb_array_length(o."ordem_ementa" -> 'cartas'))
			ELSE array_position(ARRAY['festas', 'kits-bolo', 'boxes'], p."categoria_id") - 1
		END AS "ordem_1",
		CASE WHEN p."familia" = 'ementa'
			THEN coalesce(
				(SELECT e."i" - 1 FROM jsonb_array_elements_text(o."ordem_ementa" -> 'categorias') WITH ORDINALITY AS e("v", "i") WHERE e."v" = p."categoria"),
				jsonb_array_length(o."ordem_ementa" -> 'categorias'))
			ELSE 0
		END AS "ordem_2"
	FROM "produtos" p
	LEFT JOIN "casa" o ON o."id" = 1
	LEFT JOIN (VALUES
		('pausa', 'Para uma pausa', 'Light bites'),
		('salgados', 'Salgados', 'Savouries'),
		('pratos', 'Pratos', 'Plates'),
		('doces', 'Doces', 'Pastries'),
		('bebidas', 'Bebidas', 'Drinks'),
		('bolos-inteiros', 'Bolos inteiros', 'Whole cakes'),
		('formatos', 'Formatos', 'Sizes')
	) AS r("chave", "pt", "en") ON r."chave" = p."categoria"
	LEFT JOIN (VALUES
		('casa', '', ''),
		('fim-de-semana', ' de fim de semana', 'Weekend '),
		('vegan', ' vegan', 'Vegan '),
		('chocolate', ' de chocolate', 'Chocolate ')
	) AS c("chave", "pt", "en") ON c."chave" = p."carta"
	ORDER BY p."categoria_id", p."posicao"
) AS "usadas";--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "categoria_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "tipo" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tipo" CHECK ("produtos"."tipo" in ('simples', 'composto'));
