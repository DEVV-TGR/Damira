import { sql, type SQL } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { erroDoPostgres } from "@/db/erros";
import { expirarPendentes } from "@/lib/dados/bd-pedidos";
import type { EstadoPedido } from "@/lib/dados/tipos";
import type { AcaoDisputa, AcaoExpirar, AcaoPagar, AcaoReembolso } from "./eventos";
import type { FonteWebhook, RegistoEvento, ResultadoWebhook } from "./tipos";

/**
 * # A `FonteWebhook` sobre a base de dados (#42)
 *
 * ⚠️ **Cada método é uma instrução só**: o registo do evento, a mudança, os
 * contadores, os avisos, os emails e a versão do painel, tudo no mesmo `WITH`.
 * Corre inteira ou não corre, e isto funciona no driver HTTP da Neon, que não tem
 * transações interativas (`pagamentos.md` › Em aberto, 2 e 3).
 *
 * - **Repetido** é só a violação da chave de `eventos_stripe`: faz cair a instrução
 *   inteira, por isso um evento repetido não faz nada.
 * - **A corrida de duas confirmações** resolve-a o *lock* da linha: a segunda
 *   espera, volta a avaliar o `estado` e já não encontra nada para mudar. O
 *   `chegou_tarde` sai do próprio `UPDATE`, e não de uma leitura de antes.
 * - **O talão, o som e os emails** saem da transição (`pedidos.md`). Aqui só se
 *   gravam os emails; quem os envia é outra peça, depois de a instrução correr.
 */

export type OpcoesDoWebhook = {
  /** Para quem vai o aviso à loja (`EMAIL_PEDIDOS`). */
  emailDaLoja: string;
  /** Para o caminho sem evento (o «voltar atrás» do #38). Os testes põem o deles. */
  relogio?: () => Date;
};

const instante = (data: Date) => sql`${data.toISOString()}::timestamptz`;

/* O passo do `WITH` que regista o evento, ou nada, no caminho sem evento. */
const passoDoRegisto = (evento: RegistoEvento | null): SQL =>
  evento
    ? sql`registo as (
        insert into eventos_stripe (id, tipo, api_version, recebido_em)
        values (${evento.id}::text, ${evento.tipo}::text, ${evento.apiVersion}::text, ${instante(evento.recebidoEm)})
        returning 1
      ),`
    : sql``;

const eRepetido = (erro: unknown): boolean => {
  const { code, constraint } = erroDoPostgres(erro);
  return code === "23505" && constraint === "eventos_stripe_pkey";
};

export function criarFonteWebhookBd(db: BaseDeDados, opcoes: OpcoesDoWebhook): FonteWebhook {
  const relogio = opcoes.relogio ?? (() => new Date());

  /* Nos dois drivers, o `execute` devolve um resultado com `rows`. */
  const linhas = async <T>(instrucao: SQL): Promise<T[]> =>
    ((await db.execute(instrucao)) as unknown as { rows: T[] }).rows;

  /* O registo primeiro: se o evento já foi tratado, nada do resto corre. */
  const semRepetidos = async (executar: () => Promise<ResultadoWebhook>): Promise<ResultadoWebhook> => {
    try {
      return await executar();
    } catch (erro) {
      if (eRepetido(erro)) return { resultado: "repetido" };
      throw erro;
    }
  };

  return {
    marcarPago: (evento, pagamento: AcaoPagar) =>
      semRepetidos(async () => {
        const agora = evento?.recebidoEm ?? relogio();
        const em = instante(agora);
        const [linha] = await linhas<{
          mudou: number;
          chegou_tarde: boolean | null;
          campos: string[] | null;
          estado: EstadoPedido | null;
        }>(sql`
          with ${passoDoRegisto(evento)}
          mudado as (
            update pedidos set
              estado = 'pago',
              chegou_tarde = (estado = 'expirado'),
              pago_em = ${em},
              pago_online_cent = ${pagamento.montanteCent}::integer,
              stripe_session_id = coalesce(stripe_session_id, ${pagamento.sessaoId}::text),
              stripe_payment_intent_id = coalesce(stripe_payment_intent_id, ${pagamento.paymentIntentId}::text)
            where id = ${pagamento.pedidoId}::uuid and estado in ('pendente', 'expirado')
            returning id, chegou_tarde, levantamento_em, total_cent, modo_pagamento,
                      stripe_session_id, de_teste, cliente_email
          ),
          /* ⚠️ O que não bate, na passagem a pago. O pedido passa na mesma: o dinheiro
             entrou (pedidos.md › Avisos tratados). Em modo sinal, o montante não se
             confere, porque o pedido ainda não guarda o valor do sinal. */
          nao_bate as (
            select id, array_remove(array[
              case when stripe_session_id <> ${pagamento.sessaoId}::text then 'sessao' end,
              case when ${pagamento.moeda}::text <> 'eur' then 'moeda' end,
              case when modo_pagamento = 'total' and total_cent <> ${pagamento.montanteCent}::integer then 'montante' end,
              case when de_teste = ${pagamento.livemode}::boolean then 'modo' end
            ], null) as campos
            from mudado
          ),
          /* ⚠️ Um segundo pagamento: o pedido já não está por pagar, e esta sessão não
             é a dele. Entrou dinheiro a mais, e alguém tem de o ver. */
          segundo as (
            select id, array['sessao'] as campos from pedidos
            where id = ${pagamento.pedidoId}::uuid
              and estado not in ('pendente', 'expirado')
              and stripe_session_id is distinct from ${pagamento.sessaoId}::text
          ),
          factos as (
            select id, campos from nao_bate where cardinality(campos) > 0
            union all
            select id, campos from segundo
          ),
          aviso as (
            insert into avisos_dinheiro (pedido_id, tipo, stripe_id, detalhe, criado_em)
            select id, 'pagamento-nao-bate', ${pagamento.sessaoId}::text, array_to_string(campos, ', '), ${em} from factos
            on conflict (tipo, stripe_id) do nothing
            returning 1
          ),
          /* Pago ganha a expirado: volta a ocupar, mesmo acima do limite. O CASE
             porque o GREATEST ignora os NULL (base-de-dados.md). */
          vaga as (
            insert into vagas (inicio, ocupadas, limite)
            select levantamento_em, 1, null from mudado where chegou_tarde
            on conflict (inicio) do update set
              ocupadas = vagas.ocupadas + 1,
              limite = case when vagas.limite is null then null
                            else greatest(vagas.limite, vagas.ocupadas + 1) end
            returning 1
          ),
          emails as (
            insert into emails_por_enviar (pedido_id, modelo, destinatario, criado_em)
            select id, 'pago-cliente', cliente_email, ${em} from mudado
            union all
            select id, 'pago-loja', ${opcoes.emailDaLoja}::text, ${em} from mudado
            returning 1
          ),
          versao as (
            update casa set versao_pedidos = versao_pedidos + 1
            where id = 1 and (exists (select 1 from mudado) or exists (select 1 from aviso))
            returning 1
          )
          select
            (select count(*)::int from mudado) as mudou,
            (select chegou_tarde from mudado) as chegou_tarde,
            (select campos from factos limit 1) as campos,
            (select estado from pedidos where id = ${pagamento.pedidoId}::uuid) as estado
        `);

        if (linha.estado === null) return { resultado: "pedido-desconhecido" };
        const estado: EstadoPedido = linha.mudou > 0 ? "pago" : linha.estado;
        if (linha.campos !== null) {
          return { resultado: "nao-bate", campos: linha.campos as ("sessao" | "moeda" | "montante" | "modo")[], estado };
        }
        return linha.mudou > 0
          ? { resultado: "mudou", estado, chegouTarde: linha.chegou_tarde === true }
          : { resultado: "sem-efeito", estado };
      }),

    expirarPendente: (evento, expiracao: AcaoExpirar) =>
      semRepetidos(async () => {
        /* ⚠️ Só a sessão que é dele: o fim de uma sessão antiga não expira um pedido
           que entretanto tem outra. */
        const mudou = await expirarPendentes(
          db,
          sql`id = ${expiracao.pedidoId}::uuid
              and (stripe_session_id is null or stripe_session_id = ${expiracao.sessaoId}::text)`,
          passoDoRegisto(evento),
        );
        if (mudou) return { resultado: "mudou", estado: "expirado", chegouTarde: false };
        const [pedido] = await linhas<{ estado: EstadoPedido }>(
          sql`select estado from pedidos where id = ${expiracao.pedidoId}::uuid`,
        );
        return pedido ? { resultado: "sem-efeito", estado: pedido.estado } : { resultado: "pedido-desconhecido" };
      }),

    atualizarReembolso: (evento, reembolso: AcaoReembolso) =>
      semRepetidos(async () => {
        const em = instante(evento.recebidoEm);
        const [linha] = await linhas<{ mudou: number; existe: number; estado: EstadoPedido | null }>(sql`
          with ${passoDoRegisto(evento)}
          /* Primeiro pelo id do Stripe, e depois pelo nosso, nos metadados: um reembolso
             nosso cuja resposta se perdeu não é um reembolso externo. */
          alvo as (
            select id, pedido_id from reembolsos
            where stripe_refund_id = ${reembolso.stripeRefundId}::text
               or (id = ${reembolso.reembolsoId}::text and stripe_refund_id is null)
            limit 1
          ),
          /* Só para a frente, e falhado é final (pedidos.md › Os estados, e de onde
             vêm): um succeeded antigo depois de um failed não faz nada. */
          mudado as (
            update reembolsos r set
              estado = ${reembolso.estado}::text,
              estado_stripe = ${reembolso.estadoStripe}::text,
              stripe_refund_id = coalesce(r.stripe_refund_id, ${reembolso.stripeRefundId}::text),
              motivo = coalesce(${reembolso.motivo}::text, r.motivo)
            from alvo
            where r.id = alvo.id and (
              r.estado = 'pendente'
              or (r.estado = 'concluido' and ${reembolso.estado}::text = 'falhado')
            )
            returning r.pedido_id, r.valor_cent, r.estado
          ),
          /* O dinheiro que afinal não voltou deixa de estar reservado. */
          devolvido as (
            update pedidos p set reembolso_reservado_cent = p.reembolso_reservado_cent - mudado.valor_cent
            from mudado
            where p.id = mudado.pedido_id and mudado.estado = 'falhado'
            returning 1
          ),
          /* Um reembolso que não pedimos entra no pedido na mesma. */
          externo as (
            select p.id, p.reembolso_reservado_cent, p.pago_online_cent from pedidos p
            where not exists (select 1 from alvo)
              and (p.id = ${reembolso.pedidoId}::uuid or p.stripe_payment_intent_id = ${reembolso.paymentIntentId}::text)
            limit 1
          ),
          a_reservar as (
            select case when ${reembolso.estado}::text = 'falhado' then 0 else ${reembolso.valorCent}::integer end as valor
          ),
          /* ⚠️ Se não couber ao lado dos nossos ainda por pedir ao Stripe, os nossos
             cedem: o Stripe conta os pendentes dele, por isso o nosso ia ser recusado.
             Se mesmo assim não couber, o CHECK recusa e o webhook responde 5xx. */
          cedidos as (
            update reembolsos r set estado = 'falhado', motivo = 'cedeu-a-reembolso-externo'
            from externo, a_reservar
            where r.pedido_id = externo.id and r.estado = 'pendente' and r.stripe_refund_id is null
              and externo.reembolso_reservado_cent + a_reservar.valor > externo.pago_online_cent
            returning r.valor_cent
          ),
          novo as (
            insert into reembolsos (id, pedido_id, valor_cent, estado, pedido_em, stripe_refund_id, estado_stripe, motivo)
            select gen_random_uuid()::text, id, ${reembolso.valorCent}::integer, ${reembolso.estado}::text, ${em},
                   ${reembolso.stripeRefundId}::text, ${reembolso.estadoStripe}::text, ${reembolso.motivo}::text
            from externo
            returning 1
          ),
          reservado as (
            update pedidos p set reembolso_reservado_cent =
              p.reembolso_reservado_cent + (select valor from a_reservar)
              - coalesce((select sum(valor_cent)::int from cedidos), 0)
            from externo
            where p.id = externo.id
            returning 1
          ),
          versao as (
            update casa set versao_pedidos = versao_pedidos + 1
            where id = 1 and (exists (select 1 from mudado) or exists (select 1 from novo))
            returning 1
          )
          select
            (select count(*)::int from mudado) + (select count(*)::int from novo) as mudou,
            (select count(*)::int from alvo) as existe,
            (select p.estado from pedidos p
             where p.id = coalesce((select pedido_id from alvo), (select id from externo))) as estado
        `);
        if (linha.estado === null) return { resultado: "pedido-desconhecido" };
        return linha.mudou > 0
          ? { resultado: "mudou", estado: linha.estado, chegouTarde: false }
          : { resultado: "sem-efeito", estado: linha.estado };
      }),

    registarDisputa: (evento, disputa: AcaoDisputa) =>
      semRepetidos(async () => {
        const em = instante(evento.recebidoEm);
        /* O evento não traz o nosso id: é pelo pagamento que se encontra o pedido. */
        const [linha] = await linhas<{ estado: EstadoPedido | null }>(sql`
          with ${passoDoRegisto(evento)}
          dele as (
            select id, estado from pedidos where stripe_payment_intent_id = ${disputa.paymentIntentId}::text
          ),
          aviso as (
            insert into avisos_dinheiro (pedido_id, tipo, stripe_id, detalhe, criado_em)
            select id, 'disputa', ${disputa.disputaId}::text, ${disputa.motivo}::text, ${em} from dele
            on conflict (tipo, stripe_id) do nothing
            returning 1
          ),
          versao as (
            update casa set versao_pedidos = versao_pedidos + 1
            where id = 1 and exists (select 1 from aviso)
            returning 1
          )
          select (select estado from dele) as estado
        `);
        return linha.estado === null
          ? { resultado: "pedido-desconhecido" }
          : { resultado: "mudou", estado: linha.estado, chegouTarde: false };
      }),
  };
}
