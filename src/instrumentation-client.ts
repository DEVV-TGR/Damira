import { init } from "@sentry/nextjs";
import { OPCOES_DO_SENTRY } from "@/lib/sentry";

/* ⚠️ A `BrowserSession` faz um pedido por cada visita, com erro ou sem ele: é
   tráfego para o Sentry de toda a gente que abre o site. A `Breadcrumbs` só vigia
   cliques, pedidos e consola para um rasto que não guardamos. */
const DE_FORA = ["BrowserSession", "Breadcrumbs"];

init({
  ...OPCOES_DO_SENTRY,
  integrations: (predefinidas) => predefinidas.filter(({ name }) => !DE_FORA.includes(name)),
});
