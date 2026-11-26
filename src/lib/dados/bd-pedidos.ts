import { OPCOES_BOLO } from "@/data/bolos-personalizados";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import type { BaseDeDados } from "@/db/catalogo";
import { casa as tabelaCasa, linhasPedido, pedidos, reembolsos, vagas } from "@/db/esquema";
import { erroDoPostgres } from "@/db/erros";
import type { ExecutarLote } from "@/db/lote";
import { conferirPedido, gerarReferencia, pedidoNaLoja, PRAZO_DO_PEDIDO_MS, textoDeProcura } from "./regras";
import {
  ESTADOS_EM_CURSO,
  EsquemaEntradaPedido,
  EsquemaPedido,
  type FonteDeDados,
  type FonteLoja,
  type Pedido,
  type ResultadoCriarPedido,
  type ResultadoProposta,
} from "./tipos";
import { DESTINO_PEDIDOS } from "@/lib/pedidos";

/**
 * # Os pedidos na base de dados (#29, #41)
 *
 * A metade da loja: criar o pedido, a ocupação das vagas, o pedido pela
 * referência — e a limpeza dos que expiraram. As do painel vêm noutro PR.
 *
 * ⚠️ **A última vaga decide-a a base de dados** (regra 5 do AGENTS.md). O código
 * confere a vaga antes, com o motor de horários, para responder depressa e com
 * o motivo certo; mas quem garante que dois clientes não ficam com a mesma é o
 * `CHECK (ocupadas <= limite)` de `vagas`, no mesmo lote que insere o pedido.
 */

/**
 * O que o `criarPedido` lê antes de gravar: os produtos, a casa e as vagas.
 * **Vem de quem o monta**, e não da base de dados diretamente, porque no modo de
 * teste a loja lê os tempos de exemplo por cima dela (`comExemplo`): um pedido
 * conferido com os valores gravados — sem tempos de produção — dava sempre
 * «indisponível», e o calendário mostrava vagas que o pedido recusava.
 */
export type LeituraDoPedido = Pick<FonteLoja, "listarProdutos" | "configuracaoDaCasa" | "definicoesLoja" | "ocupacao">;

export type OpcoesDosPedidos = {
  /**
   * ⚠️ O `LOJA_EM_TESTE` de quando o pedido nasce, gravado no `de_teste`. Sem
   * valor por defeito, como a coluna: quem monta a fonte tem de o dizer.
   */
  deTeste: boolean;
  /** A leitura do pedido; uma função, porque quem a dá pode ainda estar a ser montado. */
  leitura: () => LeituraDoPedido;
  /** Para a limpeza das leituras sem `agora` (a `ocupacao`). Os testes põem o deles. */
  relogio?: () => Date;
};

export type FontePedidosBd = Pick<
  FonteDeDados,
  "ocupacao" | "criarPedido" | "pedidoPorReferencia" | "versaoPedidos" | "aceitarProposta" | "recusarProposta"
>;

/* Os limites de criar pedidos (`robustez.md` › Limites): pedidos em curso ao
   mesmo tempo, por IP e por email. Sem pagamento adiantado, quem não aparece
   não paga nada (`pedidos.md` › Dinheiro): por isso contam os que esperam pela
   casa e os confirmados por levantar, e não só os pendentes do Stripe. */
const EM_CURSO_POR_IP = 5;
const EM_CURSO_POR_EMAIL = 3;

/* Os estados em curso, escritos no SQL como os índices parciais da `0006` os
   têm: é o que deixa o Postgres usá-los na contagem. */
const EM_CURSO = sql.raw(ESTADOS_EM_CURSO.map((estado) => `'${estado}'`).join(", "));

/* Quantas referências se tentam antes de desistir. Com 32⁴ por dia, colidir
   duas vezes seguidas já é sinal de outra coisa. */
const TENTATIVAS_DE_REFERENCIA = 5;

/**
 * Os pedidos que a condição escolhe passam a `expirado`, numa instrução só:
 * muda os pedidos, desconta as vagas deles e sobe a versão do painel, se houve
 * algum. É um sítio só para o desconto: a limpeza por idade e o pedido expirado
 * pelo id, no «voltar atrás» do #38, descontam da mesma maneira.
 *
 * ⚠️ **A condição tem de escolher só `pendente`, `por-confirmar` ou
 * `a-aguardar-aceite`**: são os três estados que expiram, e a causa sai do
 * estado — o pendente do Stripe expira `sem-pagamento`, o que esperava pela casa
 * `sem-resposta-da-casa`, o que esperava pelo cliente `sem-aceite-do-cliente`.
 *
 * Deixa o email ao cliente na mesma instrução (`emails_por_enviar`): «não
 * conseguimos responder a tempo» ou «a proposta expirou». O do Stripe não leva
 * email: dorme com ele.
 *
 * Duas ao mesmo tempo não descontam duas vezes: a segunda espera pelo *lock* da
 * linha, volta a avaliar a condição e já não a encontra. Os `UPDATE` dentro do
 * `WITH` correm sempre, mesmo sem ninguém os ler.
 */
function expirar(db: BaseDeDados, condicao: SQL, agora: Date) {
  return db.execute(sql`
    with expirados as (
      update pedidos set
        estado = 'expirado',
        causa_expiracao = case estado
          when 'pendente' then 'sem-pagamento'
          when 'a-aguardar-aceite' then 'sem-aceite-do-cliente'
          else 'sem-resposta-da-casa' end
      where estado in ('pendente', 'por-confirmar', 'a-aguardar-aceite') and (${condicao})
      returning id, levantamento_em, cliente_email, causa_expiracao
    ),
    emails as (
      insert into emails_por_enviar (pedido_id, modelo, destinatario, criado_em)
      select id,
        case causa_expiracao when 'sem-aceite-do-cliente' then 'proposta-expirada-cliente' else 'expirado-cliente' end,
        cliente_email, ${agora.toISOString()}::timestamptz
      from expirados where causa_expiracao <> 'sem-pagamento'
      returning 1
    ),
    por_vaga as (
      select levantamento_em, count(*)::int as n from expirados group by levantamento_em
    ),
    descontadas as (
      update vagas set ocupadas = vagas.ocupadas - por_vaga.n
      from por_vaga where vagas.inicio = por_vaga.levantamento_em
      returning 1
    )
    update casa set versao_pedidos = versao_pedidos + 1
    where id = 1 and exists (select 1 from expirados)
  `);
}

/**
 * # A limpeza: o que já passou do prazo passa a `expirado`
 *
 * **Sem tarefa agendada** (regra 6: a base de dados dorme) — corre antes de ler a
 * ocupação e dentro do `criarPedido`, quando já há um cliente no site
 * (`base-de-dados.md` › Expirar sem tarefa agendada). Dois prazos:
 *
 * - **o `por-confirmar` a que a casa não respondeu**, a partir de `expira_em`
 *   (`agora >= expiraEm` já está expirado: `pedidos.md` › Expirar às 48 horas);
 * - **o `pendente` do Stripe**, que dorme com ele mas pode ter ficado de antes:
 *   ⚠️ nunca antes do prazo — expira quando o Stripe já não aceita o pagamento, e
 *   não um minuto antes. Por isso é «mais velho do que o prazo», estritamente.
 *
 * - **o `a-aguardar-aceite` que o cliente não aceitou** nas 24 horas, a partir
 *   do mesmo `expira_em` (decidido a 25/11).
 *
 * O email ao cliente fica por enviar na mesma instrução (`expirar`).
 */
export function limparExpirados(db: BaseDeDados, agora: Date) {
  const limite = new Date(agora.getTime() - PRAZO_DO_PEDIDO_MS).toISOString();
  return expirar(
    db,
    sql`(estado = 'pendente' and criado_em < ${limite}::timestamptz)
      or (estado in ('por-confirmar', 'a-aguardar-aceite') and expira_em <= ${agora.toISOString()}::timestamptz)`,
    agora,
  );
}

/**
 * Expira este pedido já, se ainda estiver pendente; em qualquer outro estado,
 * nada. É o «voltar atrás» do checkout do Stripe (#38), e dorme com ele.
 */
export function expirarPedido(db: BaseDeDados, id: string, agora = new Date()) {
  return expirar(db, sql`estado = 'pendente' and id = ${id}::uuid`, agora);
}

/**
 * ⚠️ **Uma limpeza que falha nunca derruba quem a chamou.** É arrumação que corre
 * à boleia do calendário e do checkout: deixá-la subir punha o site inteiro a
 * recusar pedidos, até alguém arranjar a base de dados à mão. E falhar é o lado
 * seguro: a vaga fica ocupada, não se vende nada duas vezes, só se liberta mais
 * tarde. Fica no log, com a regra que falhou e sem a mensagem do erro.
 */
async function limparSemTravar(db: BaseDeDados, agora: Date): Promise<void> {
  try {
    await limparExpirados(db, agora);
  } catch (erro) {
    const { code, constraint } = erroDoPostgres(erro);
    console.error(`[pedidos] a limpeza dos expirados falhou: ${code ?? "sem código"} ${constraint ?? "sem regra"}`);
  }
}

/**
 * Os pedidos que a condição escolhe, inteiros: três consultas em lote — os
 * pedidos, as linhas, os reembolsos —, nunca uma por pedido
 * (`robustez.md` › Consultas). Valida-os com o `EsquemaPedido`: uma coluna que
 * deixe de bater com o contrato rebenta aqui, e não numa página.
 */
export async function lerPedidos(
  db: BaseDeDados,
  condicao: SQL,
  { ordem = [asc(pedidos.criadoEm), asc(pedidos.id)], limite }: { ordem?: SQL[]; limite?: number } = {},
): Promise<Pedido[]> {
  const consulta = db.select().from(pedidos).where(condicao).orderBy(...ordem);
  const linhas = await (limite === undefined ? consulta : consulta.limit(limite));
  if (linhas.length === 0) return [];
  const ids = linhas.map((p) => p.id);
  const [doCesto, devolvidos] = await Promise.all([
    db
      .select()
      .from(linhasPedido)
      .where(inArray(linhasPedido.pedidoId, ids))
      .orderBy(asc(linhasPedido.pedidoId), asc(linhasPedido.posicao)),
    db
      .select()
      .from(reembolsos)
      .where(inArray(reembolsos.pedidoId, ids))
      .orderBy(asc(reembolsos.pedidoEm), asc(reembolsos.id)),
  ]);

  return linhas.map((p) => {
    const dele = devolvidos.filter((r) => r.pedidoId === p.id);
    const falhas = dele.filter((r) => r.estado === "falhado");
    return EsquemaPedido.parse({
      id: p.id,
      referencia: p.referencia,
      estado: p.estado,
      criadoEm: p.criadoEm,
      levantamentoEm: p.levantamentoEm,
      cliente: {
        nome: p.clienteNome,
        email: p.clienteEmail,
        telefone: p.clienteTelefone,
        nif: p.clienteNif,
        contaId: p.contaId,
      },
      linhas: doCesto
        .filter((l) => l.pedidoId === p.id)
        .map((l) => ({
          produtoId: l.produtoId,
          varianteId: l.varianteId,
          nome: l.nome,
          variante: l.variante,
          escolhas: l.escolhas,
          personalizacao: l.personalizacao,
          unidade: l.unidade,
          quantidade: l.quantidade,
          precoUnitarioCent: l.precoUnitarioCent,
          totalCent: l.totalCent,
          notas: l.notas,
          precoDaProposta: l.precoDaProposta,
        })),
      observacoes: p.observacoes,
      totalCent: p.totalCent,
      modoPagamento: p.modoPagamento,
      pagoOnlineCent: p.pagoOnlineCent,
      /* Não tem coluna: é a soma dos concluídos (`base-de-dados.md` › Os pedidos). */
      reembolsadoCent: dele.filter((r) => r.estado === "concluido").reduce((soma, r) => soma + r.valorCent, 0),
      reembolsos: dele.map((r) => ({ id: r.id, valorCent: r.valorCent, estado: r.estado, pedidoEm: r.pedidoEm })),
      /* O `reembolso-falhado` trata-se por reembolso: para o contrato, está tratado
         quando houve falhas e nenhuma ficou por tratar (`base-de-dados.md`). */
      avisosTratados: [
        ...p.avisosTratados.filter((aviso) => aviso !== "reembolso-falhado"),
        ...(falhas.length > 0 && falhas.every((r) => r.falhaTratadaEm !== null) ? ["reembolso-falhado"] : []),
      ],
      chegouTarde: p.chegouTarde,
      pagoEm: p.pagoEm,
      impressoEm: p.impressoEm,
      entregueEm: p.entregueEm,
      canceladoEm: p.canceladoEm,
      canceladoPor: p.canceladoPor,
      propostaVersao: p.propostaVersao,
      propostaEm: p.propostaEm,
      levantamentoAnteriorEm: p.levantamentoAnteriorEm,
      reagendadoEm: p.reagendadoEm,
      confirmadoEm: p.confirmadoEm,
      expiraEm: p.expiraEm,
      aceiteEm: p.aceiteEm,
      causaExpiracao: p.causaExpiracao,
    });
  });
}

/** Os pedidos da loja sobre a base de dados. */
export function criarPedidosBd(db: BaseDeDados, emLote: ExecutarLote, opcoes: OpcoesDosPedidos): FontePedidosBd {
  const decidirProposta = decidirPropostaBd(db);
  const relogio = opcoes.relogio ?? (() => new Date());

  const pedidoPorChave = async (chave: string): Promise<Pedido | null> =>
    (await lerPedidos(db, eq(pedidos.chaveIdempotencia, chave)))[0] ?? null;

  return {
    async ocupacao(desde, ate) {
      /* Primeiro a limpeza: um pedido abandonado há uma hora não pode continuar
         a encher o calendário de quem chega agora. */
      await limparSemTravar(db, relogio());
      const ocupadas = await db
        .select({ inicio: vagas.inicio, pedidos: vagas.ocupadas })
        .from(vagas)
        .where(and(gte(vagas.inicio, desde), lte(vagas.inicio, ate), sql`${vagas.ocupadas} > 0`))
        .orderBy(asc(vagas.inicio));
      return ocupadas;
    },

    async criarPedido(entrada, { agora, ip, contaId }): Promise<ResultadoCriarPedido> {
      const lido = EsquemaEntradaPedido.safeParse(entrada);
      if (!lido.success) return { ok: false, erro: "dados-invalidos" };
      const dados = lido.data;
      if (dados.armadilha !== "") return { ok: false, erro: "recusado" };

      await limparSemTravar(db, agora);

      /* A mesma chave devolve o mesmo pedido, seja qual for o resto: é o que
         impede um duplo clique de pagar duas vezes. */
      const repetido = await pedidoPorChave(dados.chaveIdempotencia);
      if (repetido) return { ok: true, pedido: repetido };

      const leitura = opcoes.leitura();
      const [definicoes, configuracao, catalogo] = await Promise.all([
        leitura.definicoesLoja(),
        leitura.configuracaoDaCasa(),
        /* Com os arquivados: é o `cotarLinhas` que os recusa, com o motivo. */
        leitura.listarProdutos({ incluirArquivados: true }),
      ]);
      const porId = new Map(catalogo.map((p) => [p.id, p]));
      /* A conferência de antes, com o motivo certo. A que decide é a do lote. */
      const conferido = await conferirPedido(dados, agora, {
        definicoes,
        configuracao,
        /* As do JSON, como no `cotarCesto` da base de dados, até ao PR de esquema. */
        opcoesBolo: OPCOES_BOLO,
        produtoDe: (id) => porId.get(id),
        ocupacaoDaVaga: (vaga) => leitura.ocupacao(vaga, vaga),
      });
      if (!conferido.ok) return conferido;
      const { levantamentoEm, linhas: linhasDoPedido } = conferido;

      for (let tentativa = 0; tentativa < TENTATIVAS_DE_REFERENCIA; tentativa++) {
        const pedido = pedidoNaLoja(dados, conferido, {
          id: randomUUID(),
          referencia: gerarReferencia(agora),
          agora,
          contaId,
        });

        try {
          await emLote((tx) => [
            inserirSeDentroDosLimites(tx, pedido, { ip, chave: dados.chaveIdempotencia, deTeste: opcoes.deTeste }),
            /* ⚠️ Se o limite travou o pedido, esta instrução falha na chave
               estrangeira — não há pedido para as linhas — e o lote inteiro cai.
               É assim que o limite se conta na mesma escrita, sem ler antes. */
            tx.insert(linhasPedido).values(
              linhasDoPedido.map((linha, posicao) => ({ pedidoId: pedido.id, posicao, ...linha })),
            ),
            /* A vaga: somar, com o limite de agora copiado para a linha. Se
               passar, o `CHECK` falha e ninguém fica com meia reserva. */
            tx
              .insert(vagas)
              .values({ inicio: levantamentoEm, ocupadas: 1, limite: configuracao.limitePorVaga })
              .onConflictDoUpdate({
                target: vagas.inicio,
                set: { ocupadas: sql`${vagas.ocupadas} + 1`, limite: configuracao.limitePorVaga },
              }),
            tx
              .update(tabelaCasa)
              .set({ versaoPedidos: sql`${tabelaCasa.versaoPedidos} + 1` })
              .where(eq(tabelaCasa.id, 1)),
          ]);
          return { ok: true, pedido };
        } catch (erro) {
          const { code, constraint } = erroDoPostgres(erro);
          if (constraint === "vagas_no_limite") return { ok: false, erro: "vaga-cheia" };
          if (code === "23503" && constraint === "linhas_pedido_pedido_id_pedidos_id_fk") {
            return { ok: false, erro: "demasiados-pedidos" };
          }
          if (code === "23505" && constraint === "pedidos_chave_idempotencia_unique") {
            /* Dois cliques ao mesmo tempo: o outro gravou primeiro. É dele o pedido. */
            const doOutro = await pedidoPorChave(dados.chaveIdempotencia);
            if (doOutro) return { ok: true, pedido: doOutro };
          }
          if (code === "23505" && constraint === "pedidos_referencia_unique") continue;
          throw erro;
        }
      }
      throw new Error(`${TENTATIVAS_DE_REFERENCIA} referências seguidas já existiam para ${agora.toISOString()}`);
    },

    async pedidoPorReferencia(referencia) {
      return (await lerPedidos(db, eq(pedidos.referencia, referencia)))[0] ?? null;
    },

    async aceitarProposta(referencia, versao, agora) {
      const momento = sql`${agora.toISOString()}::timestamptz`;
      return decidirProposta(
        referencia,
        versao,
        agora,
        sql`estado = 'confirmado', aceite_em = ${momento}, confirmado_em = ${momento}`,
        /* O cliente e a loja: o aceite é a primeira ordem para a cozinha (`pedidos.md`). */
        sql`select id, 'aceite-cliente', cliente_email, ${momento} from mudado
            union all select id, 'aceite-loja', ${DESTINO_PEDIDOS}, ${momento} from mudado`,
      );
    },

    async recusarProposta(referencia, versao, agora) {
      const momento = sql`${agora.toISOString()}::timestamptz`;
      return decidirProposta(
        referencia,
        versao,
        agora,
        sql`estado = 'cancelado', cancelado_em = ${momento}, cancelado_por = 'cliente'`,
        sql`select id, 'proposta-recusada-cliente', cliente_email, ${momento} from mudado`,
        /* Recusar liberta a vaga, como cancelar. */
        sql`
          descontada as (
            update vagas set ocupadas = vagas.ocupadas - 1
            from mudado where vagas.inicio = mudado.levantamento_em
            returning 1
          ),`,
      );
    },

    async versaoPedidos() {
      const [linha] = await db.select({ versao: tabelaCasa.versaoPedidos }).from(tabelaCasa).where(eq(tabelaCasa.id, 1));
      return linha?.versao ?? 0;
    },
  };
}

/**
 * O aceite e a recusa: ⚠️ **uma instrução só**, condicional à versão que o link assina e a ainda
 * esperar o aceite. Muda o pedido, deixa os emails por enviar e sobe a versão do painel; zero linhas
 * é «já não estava assim», e lê-se o pedido para a página dizer em que ficou.
 */
function decidirPropostaBd(db: BaseDeDados) {
  return async (
    referencia: string,
    versao: number,
    agora: Date,
    mudanca: SQL,
    emails: SQL,
    efeitos: SQL = sql``,
  ): Promise<ResultadoProposta> => {
    if (!Number.isSafeInteger(versao) || versao < 1) return { ok: false, erro: "nao-existe" };
    const resultado = await db.execute(sql`
      with mudado as (
        update pedidos set ${mudanca}
        where referencia = ${referencia} and modo_pagamento = 'na-loja'
          and estado = 'a-aguardar-aceite' and proposta_versao = ${versao}::integer
          and expira_em > ${agora.toISOString()}::timestamptz
        returning id, cliente_email, levantamento_em
      ),
      ${efeitos}
      emails as (
        insert into emails_por_enviar (pedido_id, modelo, destinatario, criado_em)
        ${emails}
        returning 1
      ),
      versao as (
        update casa set versao_pedidos = versao_pedidos + 1
        where id = 1 and exists (select 1 from mudado)
        returning 1
      )
      select id from mudado
    `);
    const mudou = (resultado as unknown as { rows: unknown[] }).rows.length > 0;
    const pedido = (await lerPedidos(db, eq(pedidos.referencia, referencia)))[0] ?? null;
    if (!pedido) return { ok: false, erro: "nao-existe" };
    return mudou ? { ok: true, pedido } : { ok: false, erro: "estado-mudou", pedido };
  };
}

/**
 * O `INSERT` do pedido, que **só insere dentro dos limites**: menos de 5 em
 * curso do mesmo IP e menos de 3 do mesmo email (`robustez.md` › Limites),
 * contados pelos índices parciais na própria instrução. Fora deles não insere
 * nada, e a instrução seguinte do lote — as linhas — falha por isso.
 */
function inserirSeDentroDosLimites(
  db: BaseDeDados,
  pedido: Pedido,
  { ip, chave, deTeste }: { ip: string | null; chave: string; deTeste: boolean },
) {
  const { cliente } = pedido;
  return db.execute(sql`
    insert into pedidos (
      id, referencia, estado, criado_em, levantamento_em,
      cliente_nome, cliente_email, cliente_telefone, cliente_nif, conta_id,
      observacoes, total_cent, modo_pagamento, chave_idempotencia, ip, procura, de_teste,
      confirmado_em, expira_em
    )
    select
      ${pedido.id}::uuid, ${pedido.referencia}, ${pedido.estado},
      ${pedido.criadoEm.toISOString()}::timestamptz, ${pedido.levantamentoEm.toISOString()}::timestamptz,
      ${cliente.nome}, ${cliente.email}, ${cliente.telefone}, ${cliente.nif}::text, ${cliente.contaId}::text,
      ${pedido.observacoes}::text, ${pedido.totalCent}::integer, ${pedido.modoPagamento},
      ${chave}::uuid, ${ip}::text, ${textoDeProcura(cliente.nome, pedido.referencia)}, ${deTeste}::boolean,
      ${pedido.confirmadoEm?.toISOString() ?? null}::timestamptz, ${pedido.expiraEm?.toISOString() ?? null}::timestamptz
    where (
      ${ip}::text is null
      or (select count(*) from pedidos where estado in (${EM_CURSO}) and ip = ${ip}::text) < ${EM_CURSO_POR_IP}
    )
    and (select count(*) from pedidos where estado in (${EM_CURSO}) and cliente_email = ${cliente.email})
      < ${EM_CURSO_POR_EMAIL}
  `);
}
