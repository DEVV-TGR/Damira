import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { emailsPorEnviar as fila, pedidos } from "@/db/esquema";
import { JANELA_RESERVA_MS, MAXIMO_TENTATIVAS } from "@/lib/emails/emissor";
import { lerPedidos } from "./bd-pedidos";
import type { FonteEmails, LinhaEmail } from "./tipos";

const limiteSeguro = (limite: number) => Math.max(1, Math.min(100, Math.trunc(limite) || 10));

/**
 * Uma falha definitiva avisa numa execução horária, não em todas as seguintes.
 * Contá-las todas punha o cron a 503 24 vezes por dia até alguém mexer na base à
 * mão (não há ecrã de falhados e não se repõem `tentativas`), e um alerta que
 * toca sempre ensina a ignorá-lo. Os 65 minutos cobrem uma hora de cadência com
 * folga para o atraso do agendador; o histórico fica para o ecrã dos falhados.
 */
export const JANELA_ALERTA_FALHA_MS = 65 * 60_000;

/** Sinal operacional interno: não devolve pedidos nem destinatários ao cron. */
export async function haEmailsDefinitivamenteFalhados(db: BaseDeDados, agora: Date): Promise<boolean> {
  const instante = agora.toISOString();
  const [linha] = await db.select({ id: fila.id }).from(fila).where(and(
    isNull(fila.enviadoEm), sql`${fila.tentativas} >= ${MAXIMO_TENTATIVAS}`,
    sql`(${fila.ultimoErro} is null or ${fila.ultimoErro} not like 'saltado: %')`,
    // A quinta reserva ainda em curso pode concluir: só a consideramos abandonada
    // depois dos dois minutos. Um erro definitivo já escrito não precisa de esperar.
    // A janela de aviso conta da última tentativa; a reserva abandonada ainda tem
    // 63 minutos nela, mais do que o intervalo entre duas execuções.
    sql`${fila.ultimaTentativaEm} > ${instante}::timestamptz - ${JANELA_ALERTA_FALHA_MS} * interval '1 millisecond'`,
    sql`(${fila.ultimoErro} is not null or
      ${fila.ultimaTentativaEm} + ${JANELA_RESERVA_MS} * interval '1 millisecond' <= ${instante}::timestamptz)`,
  )).limit(1);
  return !!linha;
}

export function criarEmailsBd(db: BaseDeDados): FonteEmails {
  // A condição é a mesma na leitura e na escrita: a leitura não concede a reserva.
  const disponivel = (agora: Date) => and(
    isNull(fila.enviadoEm), lt(fila.tentativas, MAXIMO_TENTATIVAS),
    sql`(${fila.ultimaTentativaEm} is null or
      ${fila.ultimaTentativaEm} + (${JANELA_RESERVA_MS} * power(2, greatest(0, ${fila.tentativas} - 1))) * interval '1 millisecond'
        <= ${agora.toISOString()}::timestamptz)`,
  );
  // Na leitura só excluímos antecessores em espera/reservados; os prontos podem sair na mesma volta.
  const semAnteriorPendente = (agora: Date, soIndisponiveis = false) => sql`not exists (
    select 1 from emails_por_enviar anterior
    where anterior.pedido_id = ${fila.pedidoId} and anterior.destinatario = ${fila.destinatario}
      and (
        (anterior.modelo in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente')
          and ${fila.modelo} not in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente'))
        or ((anterior.modelo in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente')) =
            (${fila.modelo} in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente'))
          and (anterior.criado_em, anterior.id) < (${fila.criadoEm}, ${fila.id}))
      )
      and anterior.enviado_em is null
      and (anterior.tentativas < ${MAXIMO_TENTATIVAS} or
        (anterior.ultimo_erro is null and anterior.ultima_tentativa_em + interval '2 minutes' > ${agora.toISOString()}::timestamptz))
      and (not ${soIndisponiveis}::boolean or
        (anterior.ultima_tentativa_em is not null and anterior.ultima_tentativa_em +
          (${JANELA_RESERVA_MS} * power(2, greatest(0, anterior.tentativas - 1))) * interval '1 millisecond'
            > ${agora.toISOString()}::timestamptz))
  )`;
  const minhaReserva = (reserva: LinhaEmail) => and(
    eq(fila.id, reserva.id), isNull(fila.enviadoEm), eq(fila.tentativas, reserva.tentativas),
    reserva.ultimaTentativaEm ? eq(fila.ultimaTentativaEm, reserva.ultimaTentativaEm) : isNull(fila.ultimaTentativaEm),
  );
  return {
    async emailsPendentes({ agora, limite }) {
      return db.select().from(fila).where(and(disponivel(agora), semAnteriorPendente(agora, true)))
        .orderBy(asc(fila.criadoEm), asc(fila.id)).limit(limiteSeguro(limite));
    },
    async reservarEmail(id, agora) {
      const [linha] = await db.update(fila).set({ tentativas: sql`${fila.tentativas} + 1`, ultimaTentativaEm: agora, ultimoErro: null })
        .where(and(eq(fila.id, id), disponivel(agora), semAnteriorPendente(agora))).returning();
      return linha ?? null;
    },
    async marcarEmailEnviado(reserva, agora) {
      await db.update(fila).set({ enviadoEm: agora, ultimoErro: null }).where(minhaReserva(reserva));
    },
    async registarFalhaEmail(reserva, codigo, definitiva) {
      await db.update(fila).set({ ultimoErro: codigo,
        ...(definitiva ? { tentativas: MAXIMO_TENTATIVAS } : {}),
      }).where(minhaReserva(reserva));
    },
    async pedidoDoEmail(pedidoId) {
      return (await lerPedidos(db, eq(pedidos.id, pedidoId)))[0] ?? null;
    },
    async emailsFalhados(limite) {
      const linhas = await db.select().from(fila)
        .where(and(isNull(fila.enviadoEm), sql`(${fila.ultimoErro} is not null or ${fila.tentativas} >= ${MAXIMO_TENTATIVAS})`))
        .orderBy(asc(fila.criadoEm), asc(fila.id)).limit(limiteSeguro(limite));
      return linhas.map(l => ({ ...l, saltado: l.ultimoErro?.startsWith("saltado: ") ?? false }));
    },
  };
}
