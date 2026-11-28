import type { Reporter, TestCase, TestModule } from "vitest/node";

/**
 * Diz no registo do CI que ficheiro, e que teste, está a correr há demasiado
 * tempo.
 *
 * O CI encravava no `npm test` até o `timeout` o matar, e o registo não dizia
 * em quê: no CI o Vitest só escreve um ficheiro quando ele acaba, e o que
 * encrava nunca acaba. Este reporter guarda o que começou e ainda não acabou, e
 * de minuto a minuto escreve o que já passou do limite. Quando o passo for
 * morto, as últimas linhas do registo dizem quem foi.
 *
 * O ficheiro aparece sempre. O teste só aparece se o worker ainda conseguir
 * avisar que o começou: um worker bloqueado por inteiro (um ciclo síncrono, a
 * memória a trocar com o disco) já não avisa, e fica-se pelo ficheiro.
 *
 * Só se liga no CI (`vitest.config.mts`): no terminal o Vitest já mostra o que
 * está a correr.
 */

/* Um ficheiro inteiro chega a 45 s no CI (`sessao-painel/bd.test.ts`), e um
   teste tem 20 s antes de o Vitest o dar por falhado (`testTimeout`): o que
   passa de 90 s já não é um ficheiro lento, é um ficheiro parado. */
const LIMITE_MS = 90_000;
const DE_QUANTO_EM_QUANTO_MS = 60_000;

export default class ReporterPresos implements Reporter {
  private readonly aCorrer = new Map<string, number>();
  private relogio: ReturnType<typeof setInterval> | undefined;

  onTestRunStart() {
    this.relogio = setInterval(() => this.avisar(), DE_QUANTO_EM_QUANTO_MS);
    /* Não é ele que segura o processo vivo: se tudo o resto acabou, sai-se. */
    this.relogio.unref();
  }

  /* Conta desde que o ficheiro entra na fila de um worker, e não desde que os
     testes começam: o `await catalogoDeTeste()` do topo dos ficheiros corre
     antes de haver testes, e é dos sítios onde um PGlite pode ficar preso. */
  onTestModuleQueued(modulo: TestModule) {
    this.aCorrer.set(this.nomeDoFicheiro(modulo), Date.now());
  }

  onTestModuleEnd(modulo: TestModule) {
    this.aCorrer.delete(this.nomeDoFicheiro(modulo));
  }

  onTestCaseReady(teste: TestCase) {
    this.aCorrer.set(this.nomeDoTeste(teste), Date.now());
  }

  onTestCaseResult(teste: TestCase) {
    this.aCorrer.delete(this.nomeDoTeste(teste));
  }

  onTestRunEnd() {
    clearInterval(this.relogio);
    this.aCorrer.clear();
  }

  /* Chamado quando o Vitest desiste de esperar que os workers fechem. */
  onProcessTimeout() {
    this.avisar(0);
  }

  private avisar(limite = LIMITE_MS) {
    const agora = Date.now();
    for (const [nome, desde] of this.aCorrer) {
      const passou = agora - desde;
      if (passou >= limite) console.log(`⏳ há ${Math.round(passou / 1000)} s a correr: ${nome}`);
    }
  }

  /* O nome do projeto à frente (`json`, `bd`): os ficheiros do contrato correm
     nas duas voltas, e sem ele não se sabe qual delas encravou. */
  private nomeDoFicheiro(modulo: TestModule) {
    return `[${modulo.project.name}] ${modulo.relativeModuleId}`;
  }

  private nomeDoTeste(teste: TestCase) {
    return `${this.nomeDoFicheiro(teste.module)} › ${teste.fullName}`;
  }
}
