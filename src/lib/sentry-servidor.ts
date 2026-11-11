import { captureConsoleIntegration, httpIntegration, init } from "@sentry/nextjs";
import { OPCOES_DO_SENTRY } from "./sentry";

init({
  ...OPCOES_DO_SENTRY,
  integrations: (predefinidas) => [
    ...predefinidas.filter(({ name }) => !["Http", "ProcessSession"].includes(name)),
    /* Só erros. Estas duas mandavam contagens ao Sentry a cada arranque de função e a
       cada minuto com tráfego, com erro ou sem ele. O `disableIncomingRequestSpans` é
       o que o SDK usa em Next, porque o Next já trata dos pedidos que chegam. */
    httpIntegration({ disableIncomingRequestSpans: true, sessions: false }),
    /* Os erros que o código apanha e escreve com `console.error` (o email que não
       saiu, por exemplo) não rebentam, e sem isto só ficavam no log de um dia. */
    captureConsoleIntegration({ levels: ["error"] }),
  ],
});
