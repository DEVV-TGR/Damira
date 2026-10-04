/**
 * # O modo de teste da loja
 *
 * Um interruptor só, **`LOJA_EM_TESTE=1`** nas variáveis de ambiente da Vercel
 * (ou no `.env.local`). Ligado, o site no ar pode ser testado de ponta a ponta
 * antes de a casa dar os dados verdadeiros e antes de haver base de dados.
 *
 * ⚠️ **É o único interruptor de tudo o que é provisório** (decidido a 04/10):
 * nada do que está abaixo pede uma segunda variável para se ver. Ligado:
 *
 * - **prazos e horário de exemplo** no calendário (`src/lib/dados/exemplo.ts`);
 * - **pedidos de exemplo no calendário**, que dão cor aos dias e enchem horas
 *   (`pedidosDeExemplo`, no mesmo ficheiro);
 * - **pedidos de exemplo no painel**: pagos, entregues, um cancelado, um com
 *   dinheiro em falta, um que chegou tarde, um duplicado (`pedidosDoPainelDeExemplo`);
 * - **a entrada provisória do painel**, com o PIN `123456` e o email da equipa
 *   como gerente (`src/lib/sessao-painel/provisoria.ts`);
 * - o pagamento com as chaves de teste do Stripe, quando chegar (#38) — não se
 *   cobra nada;
 * - e **os avisos que dizem tudo isto**: a faixa no topo de todas as páginas da
 *   loja, e o aviso no topo do painel.
 *
 * ⚠️ **A faixa é o que impede isto de ser uma mentira, e não se apaga.** É a
 * mesma regra da conta em demonstração (`AGENTS.md` › A conta de cliente): uma
 * funcionalidade a fingir só é aceitável se o disser em voz alta. Sem ela,
 * alguém via «levante na quinta» e acreditava num prazo que fomos nós a
 * inventar.
 *
 * ⚠️ **É um bloqueador de lançamento** (#55): no dia em que a loja abre,
 * desliga-se. Sem os dados verdadeiros, o calendário volta a «indisponível» —
 * nunca a um prazo inventado.
 *
 * ⚠️ **Lê-se no build**, como as outras variáveis que mudam páginas estáticas:
 * ligar ou desligar o interruptor na Vercel obriga a um novo deploy.
 *
 * Recebe o ambiente por argumento para os testes poderem experimentar as duas
 * posições sem mexer no `process.env` de todos.
 */
/* Um ambiente qualquer, e não `NodeJS.ProcessEnv`: o tipo do Next exige o
   `NODE_ENV`, e os testes passam ambientes com uma ou duas variáveis. */
export type Ambiente = Record<string, string | undefined>;

export const emModoDeTeste = (ambiente: Ambiente = process.env): boolean =>
  ambiente.LOJA_EM_TESTE === "1";
