ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_estado";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_modo_pagamento";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_pago_em";--> statement-breakpoint
DROP INDEX "pedidos_pendentes_por_ip";--> statement-breakpoint
DROP INDEX "pedidos_pendentes_por_email";--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "confirmado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "aceite_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "causa_expiracao" text;--> statement-breakpoint
-- Os pedidos do Stripe que já expiraram ficam com a causa deles, antes de a
-- regra `pedidos_causa_expiracao` (mais abaixo) conferir as linhas que já lá
-- estão: até aqui, só o Stripe expirava pedidos. Numa base sem pedidos
-- expirados não muda nada.
--
-- O `drizzle-kit` gera as colunas e as regras, e não os dados: esta instrução
-- foi escrita à mão, depois do `drizzle-kit generate`, como a da `0005`.
UPDATE "pedidos" SET "causa_expiracao" = 'sem-pagamento' WHERE "estado" = 'expirado';--> statement-breakpoint
CREATE INDEX "pedidos_em_curso_por_ip" ON "pedidos" USING btree ("ip") WHERE "pedidos"."estado" in ('por-confirmar', 'a-aguardar-aceite', 'confirmado', 'pendente');--> statement-breakpoint
CREATE INDEX "pedidos_em_curso_por_email" ON "pedidos" USING btree ("cliente_email") WHERE "pedidos"."estado" in ('por-confirmar', 'a-aguardar-aceite', 'confirmado', 'pendente');--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado_do_modo" CHECK (case
        when "pedidos"."modo_pagamento" in ('total', 'sinal')
          then "pedidos"."estado" not in ('por-confirmar', 'a-aguardar-aceite', 'confirmado')
        when "pedidos"."modo_pagamento" in ('na-loja', 'total', 'sinal') then "pedidos"."estado" not in ('pendente', 'pago')
        else true end);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_na_loja_sem_online" CHECK ("pedidos"."modo_pagamento" in ('total', 'sinal') or "pedidos"."pago_online_cent" = 0);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_confirmado_em" CHECK (("pedidos"."confirmado_em" is null or "pedidos"."modo_pagamento" not in ('total', 'sinal'))
        and ("pedidos"."confirmado_em" is not null or not ("pedidos"."estado" = 'confirmado'
          or ("pedidos"."estado" = 'entregue' and "pedidos"."modo_pagamento" not in ('total', 'sinal')))));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_expira_em" CHECK (("pedidos"."estado" <> 'por-confirmar' or "pedidos"."expira_em" is not null)
        and ("pedidos"."expira_em" is null
          or ("pedidos"."expira_em" > "pedidos"."criado_em" and "pedidos"."modo_pagamento" not in ('total', 'sinal'))));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_aceite_em" CHECK ("pedidos"."aceite_em" is null or "pedidos"."confirmado_em" is not null);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_causa_expiracao" CHECK (("pedidos"."estado" = 'expirado') = ("pedidos"."causa_expiracao" is not null)
        and ("pedidos"."causa_expiracao" is null or ("pedidos"."causa_expiracao" in ('sem-resposta-da-casa', 'sem-pagamento')
          and ("pedidos"."causa_expiracao" = 'sem-pagamento') = ("pedidos"."modo_pagamento" in ('total', 'sinal'))
          and ("pedidos"."causa_expiracao" <> 'sem-resposta-da-casa' or "pedidos"."expira_em" is not null))));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado" CHECK ("pedidos"."estado" in ('por-confirmar', 'a-aguardar-aceite', 'confirmado', 'pendente', 'pago', 'entregue', 'expirado', 'cancelado'));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_modo_pagamento" CHECK ("pedidos"."modo_pagamento" in ('na-loja', 'total', 'sinal'));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pago_em" CHECK (("pedidos"."pago_em" is not null) = ("pedidos"."modo_pagamento" in ('total', 'sinal') and "pedidos"."estado" in ('pago', 'entregue', 'cancelado')));