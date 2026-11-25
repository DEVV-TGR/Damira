ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_expira_em";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_causa_expiracao";--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_expira_em" CHECK (("pedidos"."estado" not in ('por-confirmar', 'a-aguardar-aceite') or "pedidos"."expira_em" is not null)
        and ("pedidos"."expira_em" is null
          or ("pedidos"."expira_em" > "pedidos"."criado_em" and "pedidos"."modo_pagamento" not in ('total', 'sinal'))));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_causa_expiracao" CHECK (("pedidos"."estado" = 'expirado') = ("pedidos"."causa_expiracao" is not null)
        and ("pedidos"."causa_expiracao" is null or ("pedidos"."causa_expiracao" in ('sem-resposta-da-casa', 'sem-pagamento', 'sem-aceite-do-cliente')
          and ("pedidos"."causa_expiracao" = 'sem-pagamento') = ("pedidos"."modo_pagamento" in ('total', 'sinal'))
          and ("pedidos"."causa_expiracao" not in ('sem-resposta-da-casa', 'sem-aceite-do-cliente') or "pedidos"."expira_em" is not null)
          and ("pedidos"."causa_expiracao" <> 'sem-aceite-do-cliente' or "pedidos"."proposta_versao" > 0))));