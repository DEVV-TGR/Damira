import { setTimeout as esperar } from "node:timers/promises";
import { z } from "zod";
import { erroDoPostgres } from "@/db/erros";
import type { FonteEmails, LinhaEmail } from "@/lib/dados/tipos";
import { REMETENTE_PEDIDOS } from "@/lib/pedidos";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
import { anteriorAoEmissor, CORTE_DA_FILA, dadosDoEmail, foraDaJanelaDeIdempotencia, JANELA_RESERVA_MS } from "./emissor";
import { escreverEmail } from "./modelos";
import { enviarPeloResend } from "./resend";
import { NOME_REMETENTE } from "./textos";
import { MODELOS_EMAIL, type DadosCasa, type ModeloEmail } from "./tipos";

export type ResumoEmissor = { enviados: number; falhados: number; saltados: number; bloqueado?: string };
export type OpcoesEmissor = { agora: Date; limite?: number };
export type DependenciasEmissor = {
  fonte: Omit<FonteEmails, "emailsFalhados">; ambiente: Ambiente; casa: DadosCasa & { email: string | null };
  buscar?: typeof fetch; esperar?: (ms: number) => Promise<unknown>;
  /** Milissegundos desde o início da volta; monotónico, injetável nos testes. */
  decorrido?: () => number;
  /** O corte da fila (`CORTE_DA_FILA`); injetável para os testes com datas antigas. */
  corte?: Date;
};

/** Só códigos controlados; o objeto do erro nunca sai para os logs. */
function registarErro(erro: unknown, referencia?: string, modelo?: string) {
  const code = erro == null ? undefined : erroDoPostgres(erro)?.code;
  console.error("[emails]", referencia ?? "", MODELOS_EMAIL.includes(modelo as ModeloEmail) ? modelo : "",
    typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "falha-interna");
}

export async function executarEmissor(
  { agora, limite = 10 }: OpcoesEmissor,
  { fonte, ambiente, casa, buscar = fetch, esperar: pausa = esperar, decorrido, corte = CORTE_DA_FILA }: DependenciasEmissor,
): Promise<ResumoEmissor> {
  const resumo: ResumoEmissor = { enviados: 0, falhados: 0, saltados: 0 };
  const inicio = performance.now();
  const tempo = decorrido ?? (() => performance.now() - inicio);
  const instanteAtual = () => new Date(+agora + Math.floor(tempo()));
  let fezEnvio = false;
  try {
    const seguro = ambiente.EMAILS_SO_PARA?.trim();
    const producao = ambiente.VERCEL_ENV === "production";
    /* ⚠️ O modo de teste também prende os envios em produção: até ao lançamento o
       site no ar grava pedidos de ensaio, e nenhum email desses pode chegar a um
       cliente nem à casa como se fosse verdadeiro. Vive aqui, e não numa rota, para
       valer para todos os chamadores — as ações, a recuperação e o ensaio. */
    if ((!producao || seguro || emModoDeTeste(ambiente)) && !z.email().safeParse(seguro).success) {
      console.error("[emails] emails-so-para-em-falta-ou-invalido");
      return { ...resumo, bloqueado: "sem-destino-seguro" };
    }
    const chave = ambiente.RESEND_API_KEY?.trim();
    if (!chave) {
      console.error("[emails] sem-chave-resend");
      return { ...resumo, bloqueado: "sem-chave-resend" };
    }
    const remetente = ambiente.EMAIL_REMETENTE?.trim() || REMETENTE_PEDIDOS;
    if (!z.email().safeParse(remetente).success) return { ...resumo, bloqueado: "sem-remetente" };
    const linhas = await fonte.emailsPendentes({ agora, limite: Math.max(1, Math.min(10, Math.trunc(limite) || 10)) });
    for (const linha of linhas) {
      // Deixa margem para o último timeout e as escritas num chamador de 60 s.
      if (tempo() >= 45_000) break;
      let reserva: LinhaEmail | null = null;
      let referencia: string | undefined;
      try {
        // O tempo avança durante o lote: não se reserva com a hora de um envio anterior.
        reserva = await fonte.reservarEmail(linha.id, instanteAtual());
        if (!reserva) continue;
        if (anteriorAoEmissor(linha, corte)) {
          await fonte.registarFalhaEmail(reserva, "saltado: anterior-ao-emissor", true);
          resumo.saltados++; continue;
        }
        if (foraDaJanelaDeIdempotencia(linha, instanteAtual())) {
          await fonte.registarFalhaEmail(reserva, "idempotencia-expirada", true);
          resumo.falhados++; continue;
        }
        const pedido = await fonte.pedidoDoEmail(linha.pedidoId);
        if (!pedido) {
          await fonte.registarFalhaEmail(reserva, "pedido-inexistente", true);
          resumo.falhados++; continue;
        }
        referencia = pedido.referencia;
        let email: ReturnType<typeof escreverEmail>;
        try {
          if (!MODELOS_EMAIL.includes(linha.modelo as ModeloEmail)) throw new Error("modelo");
          const dados = dadosDoEmail(pedido, linha, { agora: instanteAtual(), modoDeTeste: emModoDeTeste(ambiente) });
          if ("saltar" in dados) {
            await fonte.registarFalhaEmail(reserva, `saltado: ${dados.saltar}`, true);
            resumo.saltados++; continue;
          }
          email = escreverEmail(linha.modelo as ModeloEmail, dados, casa, "pt");
        } catch {
          await fonte.registarFalhaEmail(reserva, "dados-do-modelo", true);
          resumo.falhados++; continue;
        }
        const responderPara = linha.modelo.endsWith("-loja") ? pedido.cliente.email : casa.email;
        if (!z.email().safeParse(responderPara).success || !z.email().safeParse(linha.destinatario).success) {
          await fonte.registarFalhaEmail(reserva, "endereco-invalido", true);
          resumo.falhados++; continue;
        }
        if (fezEnvio) await pausa(600);
        // Revalidar junto do fetch: a leitura ou a pausa podem atravessar o limite do fornecedor.
        if (foraDaJanelaDeIdempotencia(linha, instanteAtual())) {
          await fonte.registarFalhaEmail(reserva, "idempotencia-expirada", true);
          resumo.falhados++; continue;
        }
        if (reserva.ultimaTentativaEm && +instanteAtual() >= +reserva.ultimaTentativaEm + JANELA_RESERVA_MS - 15_000) {
          await fonte.registarFalhaEmail(reserva, "reserva-expirada", false);
          resumo.falhados++; continue;
        }
        fezEnvio = true;
        const resultado = await enviarPeloResend({ id: linha.id, remetente: `${NOME_REMETENTE} <${remetente}>`,
          destinatario: seguro || linha.destinatario, responderPara: responderPara!,
          assunto: seguro ? `${email.assunto} [destino original: ${linha.destinatario}]` : email.assunto,
          texto: email.texto, html: email.html }, chave, buscar);
        if (resultado.ok) {
          await fonte.marcarEmailEnviado(reserva, instanteAtual());
          resumo.enviados++;
        } else {
          await fonte.registarFalhaEmail(reserva, resultado.codigo, resultado.definitiva);
          console.error("[emails]", referencia, linha.modelo, resultado.codigo);
          resumo.falhados++;
          if (["resend-401", "resend-403", "resend-429"].includes(resultado.codigo)) break;
        }
      } catch (erro) {
        registarErro(erro, referencia, linha.modelo);
        resumo.falhados++;
        if (reserva) {
          try { await fonte.registarFalhaEmail(reserva, "falha-interna", false); }
          catch (falha) { registarErro(falha, referencia, linha.modelo); }
        }
      }
    }
  } catch (erro) {
    registarErro(erro); resumo.falhados++;
  }
  return resumo;
}
