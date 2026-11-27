import { validarLevantamento, type VagaOcupada } from "@/lib/horarios";
import { avisosDosPedidos, diaDeLisboa, faltaPagarCent, porDevolverCent } from "@/lib/painel";
import {
  EsquemaDefinicoes,
  EsquemaEntradaProduto,
  EsquemaFiltroPedidos,
  EsquemaHorarios,
  EsquemaOpcoesBolo,
  EsquemaOrdemCategorias,
  EsquemaProduto,
  EsquemaResposta,
  AVISOS_TRATAVEIS,
  type AvisoTratavel,
  type ConfiguracaoDaCasa,
  type DefinicoesLoja,
  type Familia,
  type FontePainel,
  type OpcoesBolo,
  type OrdemEmenta,
  type Pedido,
  type Produto,
  type ResultadoPainel,
} from "./tipos";
import {
  comPecasPartilhadas,
  emId,
  estadoAntesDeEntregue,
  invalido,
  livre,
  naoExiste,
  paraProcura,
  pedidoRespondido,
  planearResposta,
  podeCancelar,
  podeResponder,
  prepararProduto,
  REAGENDAVEIS,
} from "./regras";
import { categoriaDoProduto } from "@/db/categorias";
import { arvoreDaLoja, categoriaDe, planearFamilias, type ArvoreGravada } from "./familias";

/**
 * # O painel sobre os JSON — em memória, como os pedidos
 *
 * A metade de escrita da implementação provisória. Mexe no **mesmo estado** que
 * a fonte da loja (`json.ts`): um preço mudado aqui é o preço que o
 * `cotarCesto` cobra a seguir, e um horário gravado aqui é o que o calendário
 * mostra. É o que deixa construir e testar o painel antes da base de dados.
 *
 * ⚠️ **Não persiste.** O próximo arranque volta aos JSON, e dois processos da
 * Vercel não se veem. A gerente não pode preencher produtos a sério nisto — é
 * para isso que vem a implementação do Sobral (#31).
 *
 * ⚠️ **Não verifica o papel.** Quem pode chamar cada função decide-o o
 * `index.ts`, antes de chegar aqui.
 */

/** O que a fonte da loja e o painel partilham. Mutável de propósito. */
export type EstadoJson = {
  porId: Map<string, Produto>;
  configuracao: ConfiguracaoDaCasa;
  definicoes: DefinicoesLoja;
  /** A ordem da ementa; as categorias, como a gerente as deixou (#87). */
  ordem: OrdemEmenta;
  pedidos: Map<string, Pedido>;
  /** Referência → id do pedido. */
  porReferencia: Map<string, string>;
  /** Sobe a cada pedido criado ou alterado (`versaoPedidos`). */
  versao: number;
  /** As opções do bolo personalizado, como a gerente as deixou. */
  opcoesBolo: OpcoesBolo;
  /** As famílias e as categorias (26/11), arquivadas incluídas, como estão «gravadas». */
  arvore: ArvoreGravada;
};

/* «Márcia», «marcia» e «MARCIA» são a mesma pessoa ao telefone. */

const CINCO_MINUTOS = 5 * 60_000;


const centValido = (valor: unknown, maximo: number, podeSerZero: boolean): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= (podeSerZero ? 0 : 1) && valor <= maximo;

export function criarPainelJson(
  estado: EstadoJson,
  /** A mesma ocupação do calendário (com os pedidos de exemplo, no modo de teste). */
  ocupacaoEntre: (desde: Date, ate: Date) => VagaOcupada[],
): FontePainel {
  /* Troca o pedido por uma cópia alterada, e sobe a versão do polling. */
  const gravarPedido = (pedido: Pedido): ResultadoPainel<Pedido> => {
    estado.pedidos.set(pedido.id, pedido);
    estado.versao++;
    return { ok: true, valor: pedido };
  };

  /* Na base de dados, o reembolso pede-se ao Stripe e fica `pendente` até o
     webhook dizer (`pagamentos.md`). Aqui, sem Stripe, conclui-se logo — e o
     painel diz que é simulado. */
  const comReembolso = (pedido: Pedido, valorCent: number, agora: Date): Pedido =>
    valorCent === 0
      ? pedido
      : {
          ...pedido,
          reembolsos: [
            ...pedido.reembolsos,
            { id: `reembolso-${pedido.id}-${pedido.reembolsos.length + 1}`, valorCent, estado: "concluido", pedidoEm: agora },
          ],
          reembolsadoCent: pedido.reembolsadoCent + valorCent,
        };

  /* Troca o produto por uma cópia alterada. Nunca se muda o objeto que já foi
     entregue a alguém: quem o leu antes continua a ter o que leu. */
  const alterar = (id: string, mudanca: Partial<Produto>): ResultadoPainel<Produto> => {
    const atual = estado.porId.get(id);
    if (!atual) return naoExiste;
    /* `safeParse`: um valor errado responde `dados-invalidos`, e nunca rebenta
       para o browser (`robustez.md` › Erros). */
    const lido = EsquemaProduto.safeParse({ ...atual, ...mudanca });
    if (!lido.success) return invalido(lido.error);
    estado.porId.set(id, lido.data);
    return { ok: true, valor: lido.data };
  };

  /* ⚠️ Uma categoria que não está na ordem (#87) ficava órfã: fora da `/ementa`,
     que só mostra as categorias da ordem, e sem a gerente a poder lá pôr, porque
     a ordem só aceita uma permutação das que existem. Recusa-se à entrada. */
  const foraDaOrdem = (categoria: string | null) =>
    categoria !== null && !estado.ordem.categorias.includes(categoria);
  const categoriaDesconhecida: ResultadoPainel<never> = {
    ok: false,
    erro: "dados-invalidos",
    campos: ["categoria"],
  };

  /* A categoria escolhida no editor (26/11) tem de existir e estar em uso: a
     mesma regra do `bd.ts`. */
  const categoriaEscolhidaInvalida = (categoriaId: string | undefined) =>
    categoriaId !== undefined && !estado.arvore.categorias.some((c) => c.id === categoriaId && !c.arquivada);
  const categoriaEscolhidaRecusada: ResultadoPainel<never> = {
    ok: false,
    erro: "dados-invalidos",
    campos: ["categoriaId"],
  };
  /* A secção (27/11) tem de ser da categoria escolhida e estar em uso: a mesma
     regra do `bd.ts`. */
  const seccaoEscolhidaInvalida = (categoriaId: string | undefined, seccaoId: string | null | undefined) =>
    seccaoId !== undefined &&
    seccaoId !== null &&
    (categoriaId === undefined ||
      !estado.arvore.seccoes.some((x) => x.id === seccaoId && x.categoriaId === categoriaId && !x.arquivada));
  const seccaoEscolhidaRecusada: ResultadoPainel<never> = { ok: false, erro: "dados-invalidos", campos: ["seccaoId"] };
  /* Sem categoria escolhida, sem secção: uma secção é sempre de uma categoria.
     Sem secção é a ausência (`undefined`), como o `bd.ts` a lê. */
  const seccaoGravada = (categoriaId: string | undefined, seccaoId: string | null | undefined) =>
    categoriaId === undefined ? undefined : (seccaoId ?? undefined);

  /* Sem categoria escolhida, a que sai da família, da carta e da categoria — e,
     se ainda não existir, nasce no fim da família dela, como o `categoriaNova`
     da base de dados. Devolve o produto já com ela. */
  const comCategoria = (produto: Produto, escolhida: string | undefined): Produto => {
    if (escolhida !== undefined) return { ...produto, categoriaId: escolhida };
    const derivada = categoriaDoProduto(produto);
    if (!estado.arvore.categorias.some((c) => c.id === derivada.id)) {
      const naFamilia = estado.arvore.categorias.filter((c) => c.familiaId === derivada.familiaId);
      estado.arvore = {
        ...estado.arvore,
        categorias: [
          ...estado.arvore.categorias,
          {
            id: derivada.id,
            nome: { pt: derivada.nomePt, en: derivada.nomeEn ?? null },
            familiaId: derivada.familiaId,
            posicao: Math.max(-1, ...naFamilia.map((c) => c.posicao)) + 1,
            arquivada: false,
          },
        ],
      };
    }
    return { ...produto, categoriaId: derivada.id };
  };

  /* As variâncias e os extras partilhados mudam em todos os que os têm: na base
     de dados é a mesma linha; aqui são cópias, e atualizam-se à mão. */
  const partilhar = (gravado: Produto) => {
    for (const outro of estado.porId.values()) {
      if (outro.id === gravado.id) continue;
      const mudado = comPecasPartilhadas(outro, gravado);
      if (mudado) estado.porId.set(outro.id, mudado);
    }
  };

  return {
    /* Nos JSON não há nada gravado: a configuração é a do estado em memória
       (com os valores de exemplo dentro, no modo de teste sem base de dados —
       e nada disso sobrevive a um arranque). */
    async configuracaoDoPainel() {
      return estado.configuracao;
    },

    async produtosDoPainel() {
      return [...estado.porId.values()];
    },

    async criarProduto(entrada) {
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      if (foraDaOrdem(lido.data.categoria)) return categoriaDesconhecida;
      if (categoriaEscolhidaInvalida(lido.data.categoriaId)) return categoriaEscolhidaRecusada;
      if (seccaoEscolhidaInvalida(lido.data.categoriaId, lido.data.seccaoId)) return seccaoEscolhidaRecusada;
      const preparado = prepararProduto(lido.data, [...estado.porId.values()], null);
      if (!preparado.ok) return preparado.resultado;
      const id = livre(emId(lido.data.nome.pt) || "produto", (candidato) => estado.porId.has(candidato));
      const produto = {
        ...comCategoria(
          EsquemaProduto.parse({
            ...lido.data,
            id,
            ...preparado.campos,
            arquivado: false,
            foraDeVenda: false,
            esgotadoNoDia: null,
          }),
          lido.data.categoriaId,
        ),
        seccaoId: seccaoGravada(lido.data.categoriaId, lido.data.seccaoId),
      };
      estado.porId.set(id, produto);
      partilhar(produto);
      return { ok: true, valor: produto };
    },

    async editarProduto(id, entrada) {
      const atual = estado.porId.get(id);
      if (!atual) return naoExiste;
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      if (foraDaOrdem(lido.data.categoria)) return categoriaDesconhecida;
      if (categoriaEscolhidaInvalida(lido.data.categoriaId)) return categoriaEscolhidaRecusada;
      if (seccaoEscolhidaInvalida(lido.data.categoriaId, lido.data.seccaoId)) return seccaoEscolhidaRecusada;
      const preparado = prepararProduto(lido.data, [...estado.porId.values()], atual);
      if (!preparado.ok) return preparado.resultado;
      /* Sem categoria na entrada, sai outra vez da carta e da categoria: a
         mesma regra do `bd.ts`. */
      const semCategoria = EsquemaProduto.safeParse({ ...atual, ...lido.data, ...preparado.campos, categoriaId: undefined });
      if (!semCategoria.success) return invalido(semCategoria.error);
      const { categoriaId } = comCategoria(semCategoria.data, lido.data.categoriaId);
      const resultado = alterar(id, {
        ...lido.data,
        ...preparado.campos,
        categoriaId,
        seccaoId: seccaoGravada(lido.data.categoriaId, lido.data.seccaoId),
      });
      if (resultado.ok) partilhar(resultado.valor);
      return resultado;
    },

    async arquivarProduto(id, arquivado) {
      return alterar(id, { arquivado });
    },

    async marcarEsgotadoHoje(id, esgotado, { agora }) {
      return alterar(id, { esgotadoNoDia: esgotado ? diaDeLisboa(agora) : null });
    },

    async tirarDeVenda(id, fora) {
      return alterar(id, { foraDeVenda: fora });
    },

    async guardarHorarios(entrada) {
      const lido = EsquemaHorarios.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      estado.configuracao = lido.data;
      return { ok: true, valor: estado.configuracao };
    },

    async guardarDefinicoes(entrada) {
      const lido = EsquemaDefinicoes.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      estado.definicoes = { ...estado.definicoes, ...lido.data };
      return { ok: true, valor: estado.definicoes };
    },

    async guardarOpcoesDoBolo(entrada) {
      const lido = EsquemaOpcoesBolo.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      /* Um objeto novo: quem leu as opções antes (um configurador aberto) fica
         com as que leu, e o servidor confere o bolo contra as de agora. */
      estado.opcoesBolo = lido.data;
      return { ok: true, valor: estado.opcoesBolo };
    },

    async guardarFamilias(entrada) {
      const usadas = new Set([...estado.porId.values()].map(categoriaDe));
      const planeado = planearFamilias(entrada, estado.arvore, usadas);
      if (!planeado.ok) return planeado;
      const { plano } = planeado;
      /* Os produtos das secções que saem ficam na categoria, sem secção. */
      const seccoesQueSaem = new Set(plano.apagarSeccoes);
      for (const produto of estado.porId.values()) {
        if (produto.seccaoId && seccoesQueSaem.has(produto.seccaoId)) {
          estado.porId.set(produto.id, { ...produto, seccaoId: undefined });
        }
      }
      /* Os produtos das que saem passam para o destino, arquivados incluídos, e
         sem secção. */
      for (const { de, para } of plano.moverProdutos) {
        for (const produto of estado.porId.values()) {
          if (categoriaDe(produto) === de) {
            estado.porId.set(produto.id, { ...produto, categoriaId: para, seccaoId: undefined });
          }
        }
      }
      /* As arquivadas ficam como estavam; as que saem apagam-se ou arquivam-se. */
      const apagadas = new Set([...plano.apagarFamilias, ...plano.apagarCategorias]);
      const tocadas = new Set([...plano.familias, ...plano.categorias].map((l) => l.id));
      estado.arvore = {
        familias: [
          ...plano.familias,
          ...estado.arvore.familias
            .filter((f) => !tocadas.has(f.id) && !apagadas.has(f.id))
            .map((f) => (plano.arquivarFamilias.includes(f.id) ? { ...f, arquivada: true } : f)),
        ],
        categorias: [
          ...plano.categorias,
          ...estado.arvore.categorias.filter((c) => c.arquivada && !tocadas.has(c.id)),
        ],
        seccoes: [
          ...plano.seccoes,
          ...estado.arvore.seccoes.filter(
            (x) => x.arquivada && !seccoesQueSaem.has(x.id) && !plano.seccoes.some((n) => n.id === x.id),
          ),
        ],
      };
      const valor: Familia[] = arvoreDaLoja(estado.arvore);
      return { ok: true, valor };
    },

    async guardarOrdemCategorias(entrada) {
      /* Um campo só: seja o que for que falhe, é a lista que se marca. */
      const recusada: ResultadoPainel<never> = { ok: false, erro: "dados-invalidos", campos: ["categorias"] };
      const lido = EsquemaOrdemCategorias.safeParse(entrada);
      if (!lido.success) return recusada;
      /* Uma permutação das que existem, e nada mais: uma que falte saía da
         ementa sem ninguém dar por isso, e uma inventada era uma secção vazia.
         Criar categorias é outra conversa, e passa pelo produto. */
      const atuais = new Set(estado.ordem.categorias);
      const nova = lido.data.categorias;
      if (nova.length !== atuais.size || nova.some((categoria) => !atuais.has(categoria))) return recusada;
      /* Um objeto novo, como nos produtos: quem leu a ordem antes fica com a
         que leu. */
      estado.ordem = { ...estado.ordem, categorias: [...nova] };
      return { ok: true, valor: estado.ordem };
    },

    async pausarLoja(ate, { agora }) {
      /* Uma pausa que já acabou não é pausa: é um relógio errado algures. */
      if (ate !== null && (Number.isNaN(ate.getTime()) || ate.getTime() <= agora.getTime())) {
        return { ok: false, erro: "dados-invalidos", campos: ["pausaAte"] };
      }
      estado.definicoes = { ...estado.definicoes, pausaAte: ate };
      return { ok: true, valor: estado.definicoes };
    },

    async listarPedidos(entrada) {
      const lido = EsquemaFiltroPedidos.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      const filtro = lido.data;
      /* Aqui o cursor é a posição na lista. Na base de dados será outra coisa
         (o último visto, por índice); o browser não sabe e não precisa. */
      if (filtro.cursor !== null && !/^\d+$/.test(filtro.cursor)) {
        return { ok: false, erro: "dados-invalidos", campos: ["cursor"] };
      }
      const texto = filtro.texto ? paraProcura(filtro.texto) : null;
      const encontrados = [...estado.pedidos.values()]
        .filter(
          (p) =>
            (!filtro.estados || filtro.estados.includes(p.estado)) &&
            (!filtro.levantamentoDesde || p.levantamentoEm >= filtro.levantamentoDesde) &&
            (!filtro.levantamentoAte || p.levantamentoEm <= filtro.levantamentoAte) &&
            (!texto || paraProcura(p.referencia).includes(texto) || paraProcura(p.cliente.nome).includes(texto)),
        )
        .sort((a, b) =>
          filtro.ordem === "recentes"
            ? b.criadoEm.getTime() - a.criadoEm.getTime() || a.id.localeCompare(b.id)
            : a.levantamentoEm.getTime() - b.levantamentoEm.getTime() || a.id.localeCompare(b.id),
        );
      const inicio = filtro.cursor === null ? 0 : Number(filtro.cursor);
      const fim = inicio + filtro.limite;
      return {
        ok: true,
        valor: {
          pedidos: encontrados.slice(inicio, fim),
          seguinte: fim < encontrados.length ? String(fim) : null,
        },
      };
    },

    async pedidoDoPainel(id) {
      const pedido = estado.pedidos.get(id);
      return pedido ? { ok: true, valor: pedido } : naoExiste;
    },

    async marcarEntregue(id, faltaCobrada, { agora }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      /* O segundo toque — ou o outro dispositivo — encontra-o já entregue, e
         isso não é um erro: o que se queria aconteceu. Na base de dados é um
         `UPDATE … WHERE estado = 'pago'`, nunca ler e depois escrever. */
      if (pedido.estado === "entregue") return { ok: true, valor: pedido };
      /* Pago na loja, o dinheiro entra no mesmo toque em que o pedido sai do
         balcão: não há falta a perguntar (`pedidos.md` › Os estados). */
      const naLoja = pedido.estado === "confirmado" && pedido.modoPagamento === "na-loja";
      if (pedido.estado !== "pago" && !naLoja) return { ok: false, erro: "estado-mudou" };
      if (!naLoja && faltaPagarCent(pedido) > 0 && !faltaCobrada) return { ok: false, erro: "falta-cobrar" };
      const entregue: Pedido = { ...pedido, estado: "entregue", entregueEm: agora };
      estado.pedidos.set(id, entregue);
      estado.versao++;
      return { ok: true, valor: entregue };
    },

    async desfazerEntregue(id, { papel, agora }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (pedido.estado !== "entregue" || pedido.entregueEm === null) return { ok: false, erro: "estado-mudou" };
      if (papel === "funcionario" && agora.getTime() - pedido.entregueEm.getTime() > CINCO_MINUTOS) {
        return { ok: false, erro: "fora-do-prazo" };
      }
      const devolvido: Pedido = { ...pedido, estado: estadoAntesDeEntregue(pedido), entregueEm: null };
      estado.pedidos.set(id, devolvido);
      estado.versao++;
      return { ok: true, valor: devolvido };
    },

    async precisaDeAtencao({ agora }) {
      return { ok: true, valor: avisosDosPedidos([...estado.pedidos.values()], estado.configuracao, agora) };
    },

    async versaoPedidos() {
      return estado.versao;
    },

    async tratarAviso(id, tipo: AvisoTratavel) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (!AVISOS_TRATAVEIS.includes(tipo)) return { ok: false, erro: "dados-invalidos", campos: ["tipo"] };
      if (pedido.avisosTratados.includes(tipo)) return { ok: true, valor: pedido };
      return gravarPedido({ ...pedido, avisosTratados: [...pedido.avisosTratados, tipo] });
    },

    async reagendarPedido(id, entrada, { agora }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (!REAGENDAVEIS.includes(pedido.estado)) return { ok: false, erro: "estado-mudou" };
      const novo = typeof entrada === "string" ? new Date(entrada) : null;
      if (!novo || Number.isNaN(novo.getTime())) return { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
      /* Uma hora da loja, com vaga, no futuro: o motor do calendário, com o
         horário da loja no lugar do da cozinha — a gerente sabe se a cozinha
         consegue; o que não pode é marcar para uma hora fechada ou cheia. O
         próprio pedido não conta para a ocupação da hora nova. */
      const casa = estado.configuracao;
      const ocupadas = ocupacaoEntre(novo, novo).map((o) =>
        o.inicio.getTime() === pedido.levantamentoEm.getTime() ? { ...o, pedidos: o.pedidos - 1 } : o,
      );
      const validacao = validarLevantamento([], novo, agora, { ...casa, cozinha: casa.loja }, ocupadas);
      if (!validacao.ok) return { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
      return gravarPedido({ ...pedido, levantamentoEm: novo, reagendadoEm: agora });
    },

    async cancelarPedido(id, reembolsoCent, { agora }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (!podeCancelar(pedido, agora)) return { ok: false, erro: "estado-mudou" };
      if (!centValido(reembolsoCent, porDevolverCent(pedido), true)) {
        return { ok: false, erro: "dados-invalidos", campos: ["reembolsoCent"] };
      }
      const cancelado: Pedido = { ...pedido, estado: "cancelado", canceladoEm: agora, canceladoPor: "gerente" };
      return gravarPedido(comReembolso(cancelado, reembolsoCent, agora));
    },

    async responderPedido(id, entrada, { agora, papel }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (!podeResponder(pedido, agora)) return { ok: false, erro: "estado-mudou" };
      const lido = EsquemaResposta.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      const novo = lido.data.levantamentoEm === null ? null : new Date(lido.data.levantamentoEm);
      if (novo && Number.isNaN(novo.getTime())) return { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
      const planeado = planearResposta(pedido, { precos: lido.data.precos, levantamentoEm: novo }, papel, agora);
      if (!planeado.ok) return planeado;
      const { plano } = planeado;
      if (plano.levantamentoEm.getTime() !== pedido.levantamentoEm.getTime()) {
        /* A hora nova, como no reagendar: da loja, com vaga, no futuro. */
        const casa = estado.configuracao;
        const ocupadas = ocupacaoEntre(plano.levantamentoEm, plano.levantamentoEm);
        const validacao = validarLevantamento([], plano.levantamentoEm, agora, { ...casa, cozinha: casa.loja }, ocupadas);
        if (!validacao.ok) return { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
      }
      return gravarPedido(pedidoRespondido(pedido, plano, agora));
    },

    async reembolsarPedido(id, valorCent, { agora }) {
      const pedido = estado.pedidos.get(id);
      if (!pedido) return naoExiste;
      if (!["pago", "entregue", "cancelado"].includes(pedido.estado)) return { ok: false, erro: "estado-mudou" };
      if (!centValido(valorCent, porDevolverCent(pedido), false)) {
        return { ok: false, erro: "dados-invalidos", campos: ["valorCent"] };
      }
      return gravarPedido(comReembolso(pedido, valorCent, agora));
    },
  };
}
