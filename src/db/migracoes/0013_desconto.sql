-- O desconto da loja (decidido a 27/11): 10 % em toda a loja, para todos, até a
-- casa dizer que acabou. O `total_cent` continua a ser o que o cliente paga — já
-- com o desconto —, e o subtotal é `total_cent + desconto_cent`.
--
-- A percentagem fica no pedido porque o preço de uma linha sob orçamento só se
-- fixa na resposta da casa, e a proposta tem de reaplicar a percentagem com que o
-- pedido nasceu. O CHECK obriga o desconto a ser sempre essa conta (meio cêntimo
-- para cima), a mesma de `src/lib/desconto.ts`.
--
-- Só acrescenta: duas colunas com `0` por defeito, e os pedidos que já existem
-- ficam sem desconto e cumprem o CHECK. O código de antes não as lê nem as escreve,
-- por isso a migração pode entrar no `production` antes do merge.
ALTER TABLE "pedidos" ADD COLUMN "desconto_percentagem" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "desconto_cent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_desconto" CHECK ("pedidos"."desconto_percentagem" between 0 and 100 and "pedidos"."desconto_cent" >= 0
        and "pedidos"."desconto_cent" = (("pedidos"."total_cent" + "pedidos"."desconto_cent")::bigint * "pedidos"."desconto_percentagem" + 50) / 100);