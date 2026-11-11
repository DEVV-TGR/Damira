import type { ErrorEvent, init } from "@sentry/nextjs";

type OpcoesDoSentry = Parameters<typeof init>[0];

/**
 * # O que sai daqui para o Sentry (`robustez.md` › Logs)
 *
 * ⚠️ **A versão 11 do SDK recolhe quase tudo por defeito:** cookies, cabeçalhos,
 * o corpo dos pedidos, a query e as variáveis locais. O `sendDefaultPii` já não
 * controla isto, e um erro na página de compra levava o nome, o telefone e o NIF
 * de quem estava a comprar. O `dataCollection` desliga tudo, e o `limparEvento`
 * apanha o que chega por dentro das mensagens de erro.
 */
const NADA_DE_DADOS_PESSOAIS = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
} satisfies OpcoesDoSentry["dataCollection"];

const MASCARAS: [RegExp, string][] = [
  /* O erro do Drizzle traz os valores da query por extenso, moradas incluídas:
     `Failed query: insert into "pedidos" … params: Joana,912345678,Rua…`. */
  [/\bparams: [\s\S]*$/, "params: [retirado]"],
  [/[^\s@<>"'(),;:=]+@[^\s@<>"'(),;:]+\.[a-z]{2,}/gi, "[email]"],
  [/\b\d{4}-\d{3}\b/g, "[código postal]"],
  /* Telefones e NIF. Nove dígitos ou mais, com ou sem separadores. */
  [/(?:\+|\b00)?\d(?:[ .-]?\d){8,}\b/g, "[número]"],
];

const tapar = (texto: string) => MASCARAS.reduce((resultado, [padrao, troca]) => resultado.replace(padrao, troca), texto);

const semConsulta = (endereco: string) => endereco.split(/[?#]/)[0];

/**
 * ⚠️ **Uma morada escrita à mão, fora do `params:`, passa.** Não há padrão que a
 * reconheça. A regra continua a ser a do `robustez.md`: nas mensagens de erro e
 * nos `console.error` vai a referência `DAM-…`, nunca os dados da pessoa.
 */
export function limparEvento(evento: ErrorEvent): ErrorEvent {
  /* O `extra` é onde o `captureConsoleIntegration` guarda os argumentos do
     `console.error`, tal como vieram. */
  const limpo = { ...evento };
  delete limpo.user;
  delete limpo.breadcrumbs;
  delete limpo.extra;

  if (limpo.message) limpo.message = tapar(limpo.message);
  if (limpo.logentry) limpo.logentry = { message: tapar(limpo.logentry.message ?? "") };
  for (const excecao of limpo.exception?.values ?? []) {
    if (excecao.value) excecao.value = tapar(excecao.value);
  }
  if (limpo.request) {
    const navegador = limpo.request.headers?.["User-Agent"];
    limpo.request = {
      method: limpo.request.method,
      url: limpo.request.url && semConsulta(limpo.request.url),
      /* É daqui que o Sentry tira o browser e o sistema de cada erro. */
      headers: navegador ? { "User-Agent": navegador } : undefined,
    };
  }
  return limpo;
}

/** As opções comuns ao servidor (`sentry-servidor.ts`) e ao browser (`instrumentation-client.ts`). */
export const OPCOES_DO_SENTRY = {
  /* `||` e não `??`: uma variável criada vazia na Vercel é a string vazia
     (`site.ts`). Sem DSN o SDK fica desligado, e nada sai do site. */
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  dataCollection: NADA_DE_DADOS_PESSOAIS,
  /* O rasto de cliques e de pedidos é onde os dados pessoais entram sem ninguém
     os pedir: endereços com query e `console.log` antigos. */
  maxBreadcrumbs: 0,
  beforeSend: limparEvento,
} satisfies OpcoesDoSentry;
