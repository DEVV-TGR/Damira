import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { erroDoPostgres } from "@/db/erros";
import { pedidos } from "@/db/esquema";
import { validarLevantamento, type VagaOcupada } from "@/lib/horarios";
import { avisosDosPedidos, porDevolverCent } from "@/lib/painel";
import { lerPedidos } from "./bd-pedidos";
import { invalido, naoExiste, paraProcura } from "./regras";
import {
  AVISOS_TRATAVEIS,
  EsquemaFiltroPedidos,
  type ConfiguracaoDaCasa,
  type ContextoPainel,
  type FontePainel,
  type Pedido,
  type ResultadoPainel,
} from "./tipos";

/**
 * # Os pedidos do painel na base de dados (#31)
 *
 * ⚠️ **Cada mudança é uma instrução só**, com o estado de partida no `WHERE` e os
 * efeitos dela no mesmo `WITH`: a vaga, o reembolso, a versão do painel. Assim
 * não há intervalo entre ler e escrever (regra 5), e funciona no driver HTTP da
 * Neon, que não tem transações interativas. Zero linhas quer dizer que o pedido
 * já não estava como se pensava; só então se lê, para responder com o motivo
 * certo (`base-de-dados.md` › Como o pedido muda de estado).
 *
 * O papel já vem verificado (`papeis.ts`), com a exceção escrita no contrato: os
 * 5 minutos do balcão para desfazer um «entregue» dependem do pedido.
 */

export type LeiturasDoPainel = {
  configuracao: (ctx: ContextoPainel) => Promise<ConfiguracaoDaCasa>;
  /** A ocupação de uma vaga, com os expirados já limpos. */
  ocupacao: (desde: Date, ate: Date) => Promise<VagaOcupada[]>;
};

export type FontePedidosDoPainelBd = Pick<
  FontePainel,
  | "listarPedidos"
  | "pedidoDoPainel"
  | "marcarEntregue"
  | "desfazerEntregue"
  | "precisaDeAtencao"
  | "tratarAviso"
  | "reagendarPedido"
  | "cancelarPedido"
  | "reembolsarPedido"
>;

const CINCO_MINUTOS = 5 * 60_000;

/* Superior a qualquer dia de Lisboa, mudança de hora incluída. A conta exata do
   «hoje» é do `avisosDosPedidos`; aqui só se evita ler o arquivo inteiro. */
const JANELA_DOS_AVISOS_MS = 36 * 3_600_000;

/* Um id que não tem esta forma vem de um browser a inventar. A coluna `uuid`
   rebentava com ele, em vez de dizer que não existe. */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const instante = (data: Date) => sql`${data.toISOString()}::timestamptz`;

const centValido = (valor: unknown, maximo: number, podeSerZero: boolean): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= (podeSerZero ? 0 : 1) && valor <= maximo;

/**
 * O cursor vai para o browser opaco, e é o último visto: nunca `OFFSET`, porque
 * com pedidos a entrar uma página saltava ou repetia linhas (`robustez.md`).
 */
const escreverCursor = (quando: Date, id: string) =>
  Buffer.from(`${quando.toISOString()}|${id}`).toString("base64url");

const lerCursor = (cursor: string): { quando: Date; id: string } | null => {
  const [iso, id, ...resto] = Buffer.from(cursor, "base64url").toString().split("|");
  if (iso === undefined || id === undefined || resto.length > 0 || !FORMATO_UUID.test(id)) return null;
  const quando = new Date(iso);
  return Number.isNaN(quando.getTime()) ? null : { quando, id };
};

/* Os `%` e os `_` da procura são texto, e não coringas. */
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");

export function criarPedidosDoPainelBd(db: BaseDeDados, leituras: LeiturasDoPainel): FontePedidosDoPainelBd {
  const lerUm = async (id: string): Promise<Pedido | null> =>
    FORMATO_UUID.test(id) ? ((await lerPedidos(db, eq(pedidos.id, id)))[0] ?? null) : null;

  /**
   * Muda o pedido, e na mesma instrução sobe a versão do painel, se mudou. Devolve
   * se mudou. `efeitos` são outros passos do `WITH`, que leem o `mudado`.
   */
  const mudar = async (mudanca: SQL, condicao: SQL, id: string, efeitos: SQL[] = []): Promise<boolean> => {
    const passos = efeitos.length > 0 ? sql`${sql.join(efeitos, sql`, `)},` : sql``;
    const resultado = await db.execute(sql`
      with mudado as (
        update pedidos set ${mudanca}
        where id = ${id}::uuid and ${condicao}
        returning id, levantamento_em
      ),
      ${passos}
      versao as (
        update casa set versao_pedidos = versao_pedidos + 1
        where id = 1 and exists (select 1 from mudado)
        returning 1
      )
      select id from mudado
    `);
    return (resultado as unknown as { rows: unknown[] }).rows.length > 0;
  };

  /* O pedido depois de uma mudança; ou o motivo, se ele não mudou. */
  const depoisDeMudar = async (id: string): Promise<ResultadoPainel<Pedido>> => {
    const pedido = await lerUm(id);
    return pedido ? { ok: true, valor: pedido } : naoExiste;
  };

  /* Liberta a vaga de quem deixou de a ocupar. Nunca mexe no limite
     (`base-de-dados.md` › Vagas e quantidades). */
  const descontarVaga = sql`
    descontada as (
      update vagas set ocupadas = vagas.ocupadas - 1
      from mudado where vagas.inicio = mudado.levantamento_em
      returning 1
    )`;

  /* O reembolso nasce `pendente`, e o estado vem depois do webhook. Pedido e sem
     `stripe_refund_id` é o trabalho por fazer da #49 (`base-de-dados.md`). */
  const novoReembolso = (valorCent: number, agora: Date) => sql`
    novo_reembolso as (
      insert into reembolsos (id, pedido_id, valor_cent, estado, pedido_em)
      select ${randomUUID()}, mudado.id, ${valorCent}::integer, 'pendente', ${instante(agora)}
      from mudado
      returning 1
    )`;

  /* A trava dos reembolsos ao mesmo tempo: quem passa do que foi pago bate no
     `CHECK`. Vê-se antes, na leitura, para responder depressa; decide-o isto. */
  const passouDoPago = (erro: unknown) => erroDoPostgres(erro).constraint === "pedidos_reembolso_reservado";

  return {
    async listarPedidos(entrada) {
      const lido = EsquemaFiltroPedidos.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      const filtro = lido.data;

      const cursor = filtro.cursor === null ? null : lerCursor(filtro.cursor);
      if (filtro.cursor !== null && cursor === null) {
        return { ok: false, erro: "dados-invalidos", campos: ["cursor"] };
      }

      const recentes = filtro.ordem === "recentes";
      const coluna = recentes ? pedidos.criadoEm : pedidos.levantamentoEm;
      const condicoes: (SQL | undefined)[] = [
        filtro.estados ? inArray(pedidos.estado, filtro.estados) : undefined,
        filtro.levantamentoDesde ? gte(pedidos.levantamentoEm, filtro.levantamentoDesde) : undefined,
        filtro.levantamentoAte ? lte(pedidos.levantamentoEm, filtro.levantamentoAte) : undefined,
        filtro.texto ? sql`${pedidos.procura} like ${`%${escaparLike(paraProcura(filtro.texto))}%`}` : undefined,
        cursor
          ? sql`(${coluna} ${recentes ? sql`<` : sql`>`} ${instante(cursor.quando)}
                or (${coluna} = ${instante(cursor.quando)} and ${pedidos.id} > ${cursor.id}::uuid))`
          : undefined,
      ];

      /* Mais um do que se mostra, para saber se há página seguinte sem contar. */
      const encontrados = await lerPedidos(db, and(...condicoes) ?? sql`true`, {
        ordem: [recentes ? desc(coluna) : asc(coluna), asc(pedidos.id)],
        limite: filtro.limite + 1,
      });
      const pagina = encontrados.slice(0, filtro.limite);
      const ultimo = pagina.at(-1);
      return {
        ok: true,
        valor: {
          pedidos: pagina,
          seguinte:
            encontrados.length > filtro.limite && ultimo
              ? escreverCursor(recentes ? ultimo.criadoEm : ultimo.levantamentoEm, ultimo.id)
              : null,
        },
      };
    },

    async pedidoDoPainel(id) {
      return depoisDeMudar(id);
    },

    async marcarEntregue(id, faltaCobrada, { agora }) {
      if (!FORMATO_UUID.test(id)) return naoExiste;
      const mudou = await mudar(
        sql`estado = 'entregue', entregue_em = ${instante(agora)}`,
        sql`estado = 'pago' and (${faltaCobrada}::boolean or total_cent <= pago_online_cent)`,
        id,
      );
      if (mudou) return depoisDeMudar(id);

      const pedido = await lerUm(id);
      if (!pedido) return naoExiste;
      /* O segundo toque, ou o outro tablet, encontra-o já entregue, e isso não é
         um erro: o que se queria aconteceu. */
      if (pedido.estado === "entregue") return { ok: true, valor: pedido };
      return { ok: false, erro: pedido.estado === "pago" ? "falta-cobrar" : "estado-mudou" };
    },

    async desfazerEntregue(id, { papel, agora }) {
      if (!FORMATO_UUID.test(id)) return naoExiste;
      const limite = new Date(agora.getTime() - CINCO_MINUTOS);
      const mudou = await mudar(
        sql`estado = 'pago', entregue_em = null`,
        sql`estado = 'entregue' and (${papel !== "funcionario"}::boolean or entregue_em >= ${instante(limite)})`,
        id,
      );
      if (mudou) return depoisDeMudar(id);

      const pedido = await lerUm(id);
      if (!pedido) return naoExiste;
      return { ok: false, erro: pedido.estado === "entregue" ? "fora-do-prazo" : "estado-mudou" };
    },

    async precisaDeAtencao(ctx) {
      const { agora } = ctx;
      const desde = new Date(agora.getTime() - JANELA_DOS_AVISOS_MS);
      const [candidatos, casa] = await Promise.all([
        lerPedidos(
          db,
          or(
            and(eq(pedidos.estado, "pago"), gte(pedidos.levantamentoEm, desde)),
            /* Uma falha de reembolso fica até ser tratada, com o levantamento já
               passado ou não (`pagamentos.md` › Em aberto, 7). */
            sql`${pedidos.id} in (
              select pedido_id from reembolsos where estado = 'falhado' and falha_tratada_em is null
            )`,
          )!,
        ),
        leituras.configuracao(ctx),
      ]);
      return { ok: true, valor: avisosDosPedidos(candidatos, casa, agora) };
    },

    async tratarAviso(id, tipo, { agora }) {
      if (!(await lerUm(id))) return naoExiste;
      /* Os avisos de dinheiro entram com a `FonteWebhook`, que é quem os grava. */
      if (!AVISOS_TRATAVEIS.find((aviso) => aviso === tipo)) {
        return { ok: false, erro: "dados-invalidos", campos: ["tipo"] };
      }

      if (tipo === "reembolso-falhado") {
        /* ⚠️ Por reembolso, e não no pedido: um segundo reembolso falhado ficava
           escondido pelo primeiro, já tratado (`base-de-dados.md`). */
        await db.execute(sql`
          with mudado as (
            update reembolsos set falha_tratada_em = ${instante(agora)}
            where pedido_id = ${id}::uuid and estado = 'falhado' and falha_tratada_em is null
            returning 1
          )
          update casa set versao_pedidos = versao_pedidos + 1
          where id = 1 and exists (select 1 from mudado)
        `);
      } else {
        await mudar(
          sql`avisos_tratados = array_append(avisos_tratados, ${tipo}::text)`,
          sql`not (${tipo}::text = any(avisos_tratados))`,
          id,
        );
      }
      return depoisDeMudar(id);
    },

    async reagendarPedido(id, entrada, ctx) {
      const { agora } = ctx;
      const pedido = await lerUm(id);
      if (!pedido) return naoExiste;
      if (pedido.estado !== "pago") return { ok: false, erro: "estado-mudou" };
      const recusar: ResultadoPainel<Pedido> = { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
      const novo = typeof entrada === "string" ? new Date(entrada) : null;
      if (!novo || Number.isNaN(novo.getTime())) return recusar;
      const anterior = pedido.levantamentoEm;
      const mesmaHora = novo.getTime() === anterior.getTime();

      /* Uma hora da loja, com vaga, no futuro: o motor do calendário, com o horário
         da loja no lugar do da cozinha — a gerente sabe se a cozinha consegue. O
         próprio pedido não conta para a ocupação da hora dele. */
      const casa = await leituras.configuracao(ctx);
      const ocupadas = (await leituras.ocupacao(novo, novo)).map((o) =>
        mesmaHora ? { ...o, pedidos: o.pedidos - 1 } : o,
      );
      const validacao = validarLevantamento([], novo, agora, { ...casa, cozinha: casa.loja }, ocupadas);
      if (!validacao.ok) return recusar;

      /* ⚠️ `levantamento_em = anterior` na condição: outro aparelho que o tenha
         movido primeiro não pode ver a vaga errada descontada. */
      const condicao = sql`estado = 'pago' and levantamento_em = ${instante(anterior)}`;
      const mudanca = sql`levantamento_em = ${instante(novo)}, reagendado_em = ${instante(agora)}`;
      try {
        /* A vaga é a mesma: nada a mover, e duas escritas na mesma linha na mesma
           instrução são recusadas pelo Postgres. */
        const mudou = mesmaHora
          ? await mudar(mudanca, condicao, id)
          : await mudar(mudanca, condicao, id, [
              sql`
                a_antiga as (
                  update vagas set ocupadas = vagas.ocupadas - 1
                  where vagas.inicio = ${instante(anterior)} and exists (select 1 from mudado)
                  returning 1
                )`,
              /* Quem decide a última vaga é o `CHECK`, e não a validação de cima. */
              sql`
                a_nova as (
                  insert into vagas (inicio, ocupadas, limite)
                  select ${instante(novo)}, 1, ${casa.limitePorVaga}::integer from mudado
                  on conflict (inicio) do update
                    set ocupadas = vagas.ocupadas + 1, limite = excluded.limite
                  returning 1
                )`,
            ]);
        return mudou ? depoisDeMudar(id) : { ok: false, erro: "estado-mudou" };
      } catch (erro) {
        if (erroDoPostgres(erro).constraint === "vagas_no_limite") return recusar;
        throw erro;
      }
    },

    async cancelarPedido(id, reembolsoCent, { agora }) {
      const pedido = await lerUm(id);
      if (!pedido) return naoExiste;
      if (pedido.estado !== "pago") return { ok: false, erro: "estado-mudou" };
      const recusar: ResultadoPainel<Pedido> = { ok: false, erro: "dados-invalidos", campos: ["reembolsoCent"] };
      if (!centValido(reembolsoCent, porDevolverCent(pedido), true)) return recusar;

      try {
        const mudou = await mudar(
          sql`estado = 'cancelado', cancelado_em = ${instante(agora)}, cancelado_por = 'gerente',
              reembolso_reservado_cent = reembolso_reservado_cent + ${reembolsoCent}::integer`,
          sql`estado = 'pago'`,
          id,
          [descontarVaga, ...(reembolsoCent > 0 ? [novoReembolso(reembolsoCent, agora)] : [])],
        );
        return mudou ? depoisDeMudar(id) : { ok: false, erro: "estado-mudou" };
      } catch (erro) {
        if (passouDoPago(erro)) return recusar;
        throw erro;
      }
    },

    async reembolsarPedido(id, valorCent, { agora }) {
      const pedido = await lerUm(id);
      if (!pedido) return naoExiste;
      if (!["pago", "entregue", "cancelado"].includes(pedido.estado)) return { ok: false, erro: "estado-mudou" };
      const recusar: ResultadoPainel<Pedido> = { ok: false, erro: "dados-invalidos", campos: ["valorCent"] };
      if (!centValido(valorCent, porDevolverCent(pedido), false)) return recusar;

      try {
        const mudou = await mudar(
          sql`reembolso_reservado_cent = reembolso_reservado_cent + ${valorCent}::integer`,
          sql`estado in ('pago', 'entregue', 'cancelado')`,
          id,
          [novoReembolso(valorCent, agora)],
        );
        return mudou ? depoisDeMudar(id) : { ok: false, erro: "estado-mudou" };
      } catch (erro) {
        if (passouDoPago(erro)) return recusar;
        throw erro;
      }
    },
  };
}
