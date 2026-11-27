-- As famílias da gerente (pedido de 26/11): o nível de cima da `/encomendas`.
-- Cada categoria passa a viver numa família.
--
-- Reescrita à mão depois do `drizzle-kit generate`, como a `0008`: o gerador
-- punha `familia_id NOT NULL` numa tabela que já tem as categorias. Aqui a
-- coluna nasce vazia, enche-se a partir do que cada categoria já é, e só depois
-- fica obrigatória.
--
-- ⚠️ Segue as regras do catálogo do `production` (`base-de-dados.md`): **só
-- preenche o que cria**, a partir do que já está na base. Não muda o nome, a
-- posição nem nada de uma categoria. ⚠️ **O Natal não nasce aqui** (decidido a
-- 27/11): a casa pediu-o, mas uma família vazia não sai da base, e cria-a a
-- gerente no painel — a regra 1 do #159 fica sem exceções.
--
-- As famílias de partida são as secções da `/encomendas` de hoje, com as
-- âncoras de hoje (o cabeçalho e o rodapé levam a `/encomendas#da-ementa`), os
-- títulos de `messages/*.json` e a ordem da página. Uma família só nasce se
-- houver categoria para ela.
CREATE TABLE "familias" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_pt" text NOT NULL,
	"nome_en" text,
	"posicao" integer NOT NULL,
	"arquivada" boolean DEFAULT false NOT NULL,
	CONSTRAINT "familias_id_formato" CHECK ("familias"."id" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "familias_nome_pt" CHECK (btrim("familias"."nome_pt") <> '' and char_length("familias"."nome_pt") <= 60),
	CONSTRAINT "familias_nome_en" CHECK (btrim("familias"."nome_en") <> '' and char_length("familias"."nome_en") <= 60),
	CONSTRAINT "familias_posicao" CHECK ("familias"."posicao" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "familias_nome_unico" ON "familias" USING btree (lower("nome_pt")) WHERE not "familias"."arquivada";--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "familia_id" text;--> statement-breakpoint
-- A família de cada categoria: as três das encomendas são cada uma a sua; todas
-- as outras vêm da carta (a `0008` só cria essas quatro espécies). ⚠️ A mesma
-- conta está em `familiaDaCategoria` (`src/db/categorias.ts`), e o
-- `migracao-categorias.test.ts` compara as duas.
UPDATE "categorias" SET "familia_id" = CASE
	WHEN "id" IN ('festas', 'kits-bolo', 'boxes') THEN "id"
	ELSE 'da-ementa'
END;--> statement-breakpoint
INSERT INTO "familias" ("id", "nome_pt", "nome_en", "posicao")
SELECT f."id", f."nome_pt", f."nome_en", f."ordem"
FROM (VALUES
	('festas', 'Kit Festas', 'Party Kits', 0),
	('kits-bolo', 'Bolo e mesa decorada', 'Cake and decorated table', 1),
	('boxes', 'Boxes para dias especiais', 'Boxes for special days', 2),
	('da-ementa', 'Da carta', 'From the menu', 3)
) AS f("id", "nome_pt", "nome_en", "ordem")
WHERE EXISTS (SELECT 1 FROM "categorias" c WHERE c."familia_id" = f."id");--> statement-breakpoint
ALTER TABLE "categorias" ALTER COLUMN "familia_id" SET NOT NULL;--> statement-breakpoint
-- ⚠️ O `DEFAULT` é para o deploy: entre esta migração e o deploy do código
-- novo, o código antigo continua a criar categorias da carta sem família (o
-- `categoriaNova`, a cada produto gravado no painel). Sem ele, o `NOT NULL`
-- recusava-as e o painel dava erro nesses minutos. Vem depois do `UPDATE`, que
-- já deu a cada categoria a sua: não enche nada. Ver o `esquema.ts`.
ALTER TABLE "categorias" ALTER COLUMN "familia_id" SET DEFAULT 'da-ementa';--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_familia_id_familias_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."familias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Os nomes repetem-se agora entre famílias (uns «Doces» no Natal e outros na
-- carta), mas nunca dentro da mesma.
DROP INDEX "categorias_nome_unico";--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_nome_unico" ON "categorias" USING btree ("familia_id",lower("nome_pt")) WHERE not "categorias"."arquivada";
