import { tz } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import { Balcao, type ProdutoDoBalcao } from "@/components/painel/balcao/Balcao";
import { EntradaPainel } from "@/components/painel/EntradaPainel";
import { PainelAberto } from "@/components/painel/PainelAberto";
import {
  configuracaoDaCasa,
  definicoesLoja,
  listarPedidos,
  pedidoDoPainel,
  precisaDeAtencao,
  produtosDoPainel,
  simularPedidoDeTeste,
} from "@/lib/dados";
import type { ContextoPainel, Pedido } from "@/lib/dados/tipos";
import { FUSO } from "@/lib/horarios";
import { contarPorPreencher, esgotadoHoje, organizarBalcao } from "@/lib/painel";
import { VERSAO_DO_SITE, versaoEmCache } from "@/lib/painel-versao";
import { sessao } from "@/lib/sessao-painel";

/**
 * # `/painel` — uma página, dois papéis (`painel.md`)
 *
 * Lê a sessão a cada pedido, por isso é dinâmica: o painel nunca vai para a
 * cache (regra 7 do AGENTS.md). Sem sessão, a entrada; com sessão, o painel.
 * `?entrar=gerente` abre a entrada da gerente por cima do balcão.
 */
export const dynamic = "force-dynamic";

export default async function Painel({ searchParams }: { searchParams: Promise<{ entrar?: string }> }) {
  const agora = new Date();
  const { entrar } = await searchParams;
  const atual = await sessao.sessaoAtual(agora);

  if (!sessao.ligada) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-tijolo">Painel</p>
        <h1 className="titulo-display mt-2 text-4xl">A entrada ainda não está ligada</h1>
        <p className="mt-4 text-tinta-suave">
          O painel abre quando a entrada da equipa estiver configurada. Até lá, os pedidos continuam a chegar
          por email.
        </p>
      </main>
    );
  }

  const aviso = sessao.provisoria ? <AvisoEntradaProvisoria /> : null;
  const querGerente = entrar === "gerente" && atual?.papel !== "gerente";

  if (!atual || querGerente) {
    return (
      <>
        {aviso}
        <EntradaPainel
          inicial={querGerente ? "gerente" : "equipa"}
          /* ⚠️ A gerente num tablet que já é do balcão: «lembrar» desligado por
             defeito, senão os preços e os reembolsos ficavam ao alcance da
             equipa durante 30 dias (`painel.md`). */
          lembrarPorDefeito={!(await sessao.temSessaoDeEquipa(agora))}
          podeVoltar={atual !== null}
        />
      </>
    );
  }

  const ctx: ContextoPainel = { papel: atual.papel, agora };
  const [casa, definicoes, produtos, pedidos] = await Promise.all([
    configuracaoDaCasa(),
    definicoesLoja(),
    produtosDoPainel(ctx),
    pedidosDoBalcao(ctx),
  ]);
  /* A gestão só se pede para a gerente — e a fronteira recusava-a ao balcão de
     qualquer forma. */
  const atencao = atual.papel === "gerente" ? await precisaDeAtencao(ctx) : null;
  /* Os pedidos de que os avisos falam: poucos, e a gerente decide sobre eles
     ali mesmo, sem ir procurá-los. */
  const pedidosDosAvisos: Record<string, Pedido> = {};
  for (const aviso of atencao?.ok ? atencao.valor : []) {
    for (const id of "pedidoIds" in aviso ? aviso.pedidoIds : [aviso.pedidoId]) {
      const lido = await pedidoDoPainel(id, ctx);
      if (lido.ok) pedidosDosAvisos[id] = lido.valor;
    }
  }

  return (
    <>
      {aviso}
      <PainelAberto papel={atual.papel} versaoInicial={await versaoEmCache()} site={VERSAO_DO_SITE}>
        <Balcao
          papel={atual.papel}
          pedidos={pedidos}
          balcao={organizarBalcao(pedidos, produtos, casa, agora)}
          produtos={produtos
            .filter((p) => !p.arquivado && (p.aVendaOnline || p.foraDeVenda))
            .map(
              (p): ProdutoDoBalcao => ({
                id: p.id,
                nome: p.nome.pt,
                esgotadoHoje: esgotadoHoje(p, agora),
                foraDeVenda: p.foraDeVenda,
              }),
            )}
          pausaAte={definicoes.pausaAte}
          modoTeste={simularPedidoDeTeste !== null}
          gestao={
            atencao?.ok
              ? { avisos: atencao.valor, pedidosDosAvisos, porPreencher: contarPorPreencher(produtos), casa, definicoes }
              : null
          }
        />
      </PainelAberto>
    </>
  );
}

/**
 * Os pedidos de hoje em diante, até onde o calendário vai: é daqui que saem os
 * três separadores e as novidades (pedido novo, cancelado). Os entregues de
 * hoje vêm também, para o balcão saber que já não são novos. Página a página,
 * com um teto: a casa não tem mil pedidos à frente, e um ciclo sem fim é pior
 * do que uma lista cortada.
 */
async function pedidosDoBalcao(ctx: ContextoPainel): Promise<Pedido[]> {
  const casa = await configuracaoDaCasa();
  const desde = startOfDay(ctx.agora, { in: tz(FUSO) });
  const ate = addDays(desde, casa.diasAFrente + 1, { in: tz(FUSO) });
  const todos: Pedido[] = [];
  let cursor: string | null = null;
  for (let pagina = 0; pagina < 10; pagina++) {
    const resultado = await listarPedidos(
      { estados: ["pago", "cancelado", "entregue"], levantamentoDesde: desde, levantamentoAte: ate, cursor, limite: 100 },
      ctx,
    );
    if (!resultado.ok) break;
    todos.push(...resultado.valor.pedidos);
    cursor = resultado.valor.seguinte;
    if (cursor === null) break;
  }
  return todos;
}

/**
 * ⚠️ **Não se apaga enquanto a entrada provisória estiver ligada.** É ela que
 * torna aceitável haver um PIN de teste e pedidos inventados: sem ela, alguém
 * tomava esta entrada pela verdadeira e um pedido de exemplo por um pedido.
 * Liga e desliga com o modo de teste; sai de vez com a entrada da #33 (`painel.md`).
 */
function AvisoEntradaProvisoria() {
  return (
    <div className="bg-tinta px-4 py-2 text-center text-xs font-semibold tracking-wide text-papel">
      <span className="mr-2 inline-block rounded-full bg-tijolo px-2 py-0.5 uppercase tracking-widest">
        Entrada de teste
      </span>
      Os pedidos são de exemplo, e o PIN e o código não são os definitivos. A entrada a sério chega com a
      base de dados.
    </div>
  );
}
