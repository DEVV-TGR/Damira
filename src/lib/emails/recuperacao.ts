import { setTimeout as esperar } from "node:timers/promises";
import type { OpcoesEmissor, ResumoEmissor } from "./executar";

export type ResumoRecuperacao = ResumoEmissor & {
  voltas: number;
  paragem: "sem-trabalho" | "falha" | "bloqueado" | "limite-de-voltas" | "limite-de-tempo" | "intervencao-necessaria";
};
type Dependencias = {
  enviar: (opcoes: OpcoesEmissor) => Promise<ResumoEmissor>;
  decorrido?: () => number;
  esperar?: (ms: number) => Promise<unknown>;
};

/**
 * A fila na BD é a fonte de verdade, mesmo quando o produtor morreu antes do after().
 * O relógio monotónico e o limite de lotes impedem uma volta de durar indefinidamente.
 */
export async function recuperarEmailsAutomaticamente(
  agora: Date, { enviar, decorrido, esperar: pausa = esperar }: Dependencias,
): Promise<ResumoRecuperacao> {
  const inicio = performance.now();
  const tempo = decorrido ?? (() => performance.now() - inicio);
  const resumo: ResumoRecuperacao = { enviados: 0, falhados: 0, saltados: 0, voltas: 0, paragem: "limite-de-voltas" };
  try {
    for (let n = 0; n < 12; n++) {
      if (n > 0) await pausa(600);
      // Deixa margem para o último lote e para as escritas antes dos 300 s da rota.
      if (tempo() >= 180_000) { resumo.paragem = "limite-de-tempo"; break; }
      resumo.voltas++;
      const lote = await enviar({ agora: new Date(+agora + Math.floor(tempo())), limite: 10 });
      resumo.enviados += lote.enviados;
      resumo.falhados += lote.falhados;
      resumo.saltados += lote.saltados;
      if (lote.bloqueado) { resumo.bloqueado = lote.bloqueado; resumo.paragem = "bloqueado"; break; }
      // Não repetir 401/403/429 nem indisponibilidade da BD num ciclo apertado.
      // Os restantes emails já selecionados continuam a seguir a regra do emissor.
      if (lote.falhados) { resumo.paragem = "falha"; break; }
      // Uma seleção lenta pode esgotar os 45 s antes da primeira linha: 0/0/0
      // não é então uma fila sem elegíveis. Dar sinal ao monitor, sem insistir.
      if (lote.adiados) { resumo.adiados = lote.adiados; resumo.paragem = "limite-de-tempo"; break; }
      if (lote.enviados + lote.saltados === 0) { resumo.paragem = "sem-trabalho"; break; }
    }
  } catch {
    console.error("[emails-recuperacao] falha-interna");
    resumo.falhados++; resumo.paragem = "falha";
  }
  return resumo;
}
