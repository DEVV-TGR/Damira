/**
 * # O modo de teste da loja
 *
 * Um interruptor só, **`LOJA_EM_TESTE=1`** nas variáveis de ambiente da Vercel
 * (ou no `.env.local`). Ligado, o site no ar pode ser testado de ponta a ponta
 * antes de a casa dar os dados verdadeiros:
 *
 * - o calendário usa os prazos e o horário de exemplo (`src/lib/dados/exemplo.ts`);
 * - o pagamento usa as chaves de teste do Stripe — não se cobra nada;
 * - e **uma faixa no topo de todas as páginas diz as duas coisas**.
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
export const emModoDeTeste = (ambiente: NodeJS.ProcessEnv = process.env): boolean =>
  ambiente.LOJA_EM_TESTE === "1";
