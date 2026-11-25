import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { emailsPorEnviar as fila, pedidos } from "@/db/esquema";
import { JANELA_RESERVA_MS, MAXIMO_TENTATIVAS } from "@/lib/emails/emissor";
import { lerPedidos } from "./bd-pedidos";
import type { FonteEmails, LinhaEmail } from "./tipos";

const limiteSeguro = (limite: number) => Math.max(1, Math.min(100, Math.trunc(limite) || 10));

export function criarEmailsBd(db: BaseDeDados): FonteEmails {
  // A condição é a mesma na leitura e na escrita: a leitura não concede a reserva.
  const disponivel = (agora: Date) => and(
    isNull(fila.enviadoEm), lt(fila.tentativas, MAXIMO_TENTATIVAS),
    sql`${fila.modelo} <> 'resposta-cliente'`,
    sql`(${fila.ultimaTentativaEm} is null or
      ${fila.ultimaTentativaEm} + (${JANELA_RESERVA_MS} * power(2, greatest(0, ${fila.tentativas} - 1))) * interval '1 millisecond'
        <= ${agora.toISOString()}::timestamptz)`,
  );
  // O novo estado não pode ultrapassar o recibo, mesmo que outra volta o esteja a enviar.
  const semReciboPendente = (agora: Date) => sql`not exists (
    select 1 from emails_por_enviar anterior
    where anterior.pedido_id = ${fila.pedidoId} and anterior.destinatario = ${fila.destinatario}
      and anterior.id <> ${fila.id}
      and anterior.modelo in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente')
      and ${fila.modelo} not in ('criado-confirmado-cliente', 'criado-por-confirmar-cliente')
      and anterior.enviado_em is null
      and (anterior.tentativas < ${MAXIMO_TENTATIVAS} or
        (anterior.ultimo_erro is null and anterior.ultima_tentativa_em + interval '2 minutes' > ${agora.toISOString()}::timestamptz))
  )`;
  const minhaReserva = (reserva: LinhaEmail) => and(
    eq(fila.id, reserva.id), isNull(fila.enviadoEm), eq(fila.tentativas, reserva.tentativas),
    reserva.ultimaTentativaEm ? eq(fila.ultimaTentativaEm, reserva.ultimaTentativaEm) : isNull(fila.ultimaTentativaEm),
  );
  return {
    async emailsPendentes({ agora, limite }) {
      return db.select().from(fila).where(disponivel(agora))
        .orderBy(asc(fila.criadoEm), asc(fila.id)).limit(limiteSeguro(limite));
    },
    async reservarEmail(id, agora) {
      const [linha] = await db.update(fila).set({ tentativas: sql`${fila.tentativas} + 1`, ultimaTentativaEm: agora, ultimoErro: null })
        .where(and(eq(fila.id, id), disponivel(agora), semReciboPendente(agora))).returning();
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
