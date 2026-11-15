ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_estado";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_modo_pagamento";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_pago_em";--> statement-breakpoint
DROP INDEX "pedidos_pendentes_por_ip";--> statement-breakpoint
DROP INDEX "pedidos_pendentes_por_email";--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "confirmado_em" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "pedidos_em_curso_por_ip" ON "pedidos" USING btree ("ip") WHERE "pedidos"."estado" in ('pendente', 'confirmado');--> statement-breakpoint
CREATE INDEX "pedidos_em_curso_por_email" ON "pedidos" USING btree ("cliente_email") WHERE "pedidos"."estado" in ('pendente', 'confirmado');--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado_do_modo" CHECK (case
        when "pedidos"."modo_pagamento" in ('total', 'sinal') then "pedidos"."estado" not in ('confirmado')
        when "pedidos"."modo_pagamento" in ('na-loja', 'total', 'sinal') then "pedidos"."estado" not in ('pendente', 'pago')
        else true end);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_na_loja_sem_online" CHECK ("pedidos"."modo_pagamento" in ('total', 'sinal') or "pedidos"."pago_online_cent" = 0);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_confirmado_em" CHECK (("pedidos"."confirmado_em" is null or "pedidos"."modo_pagamento" not in ('total', 'sinal'))
        and ("pedidos"."confirmado_em" is not null or not ("pedidos"."estado" = 'confirmado'
          or ("pedidos"."estado" = 'entregue' and "pedidos"."modo_pagamento" not in ('total', 'sinal')))));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado" CHECK ("pedidos"."estado" in ('confirmado', 'pendente', 'pago', 'entregue', 'expirado', 'cancelado'));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_modo_pagamento" CHECK ("pedidos"."modo_pagamento" in ('na-loja', 'total', 'sinal'));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pago_em" CHECK (("pedidos"."pago_em" is not null) = ("pedidos"."modo_pagamento" in ('total', 'sinal') and "pedidos"."estado" in ('pago', 'entregue', 'cancelado')));