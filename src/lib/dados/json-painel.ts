import type { z } from "zod";
import { avisosDosPedidos, diaDeLisboa, faltaPagarCent } from "@/lib/painel";
import {
  EsquemaDefinicoes,
  EsquemaEntradaProduto,
  EsquemaFiltroPedidos,
  EsquemaHorarios,
  EsquemaProduto,
  type ConfiguracaoDaCasa,
  type DefinicoesLoja,
  type FontePainel,
  type Pedido,
  type Produto,
  type ResultadoPainel,
} from "./tipos";

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
  pedidos: Map<string, Pedido>;
  /** Referência → id do pedido. */
  porReferencia: Map<string, string>;
  /** Sobe a cada pedido criado ou alterado (`versaoPedidos`). */
  versao: number;
};

const invalido = (erro: z.ZodError): ResultadoPainel<never> => ({
  ok: false,
  erro: "dados-invalidos",
  campos: [...new Set(erro.issues.flatMap((issue) => (issue.path.length > 0 ? [String(issue.path[0])] : [])))],
});

const naoExiste: ResultadoPainel<never> = { ok: false, erro: "nao-existe" };

/* «Bolo de Bolacha» → `bolo-de-bolacha`. Os acentos saem, porque o id vai no
   URL e um `pão` partilhado por mensagem chega como `p%C3%A3o`. */
const emId = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

/* O primeiro livre de `base`, `base-2`, `base-3`… */
const livre = (base: string, ocupados: (id: string) => boolean): string => {
  if (!ocupados(base)) return base;
  let n = 2;
  while (ocupados(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

type EntradaLida = z.output<typeof EsquemaEntradaProduto>;

/* «Márcia», «marcia» e «MARCIA» são a mesma pessoa ao telefone. */
const paraProcura = (texto: string) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const CINCO_MINUTOS = 5 * 60_000;

/* Uma variante nova ganha id a partir do que a distingue: o número de pessoas,
   o rótulo, ou `unica` se for a única. As que já tinham id guardam-no. */
const comIds = (variantes: EntradaLida["variantes"]): Produto["variantes"] => {
  const usados = new Set(variantes.flatMap((v) => (v.id ? [v.id] : [])));
  return variantes.map((variante) => {
    if (variante.id) return { ...variante, id: variante.id };
    const base =
      variante.pessoas !== null
        ? String(variante.pessoas)
        : variante.rotulo
          ? emId(variante.rotulo.pt) || "variante"
          : "unica";
    const id = livre(base, (candidato) => usados.has(candidato));
    usados.add(id);
    return { ...variante, id };
  });
};

export function criarPainelJson(estado: EstadoJson): FontePainel {
  /* Troca o produto por uma cópia alterada. Nunca se muda o objeto que já foi
     entregue a alguém: quem o leu antes continua a ter o que leu. */
  const alterar = (id: string, mudanca: Partial<Produto>): ResultadoPainel<Produto> => {
    const atual = estado.porId.get(id);
    if (!atual) return naoExiste;
    const novo = EsquemaProduto.parse({ ...atual, ...mudanca });
    estado.porId.set(id, novo);
    return { ok: true, valor: novo };
  };

  return {
    async produtosDoPainel() {
      return [...estado.porId.values()];
    },

    async criarProduto(entrada) {
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      const id = livre(emId(lido.data.nome.pt) || "produto", (candidato) => estado.porId.has(candidato));
      const produto = EsquemaProduto.parse({
        ...lido.data,
        id,
        variantes: comIds(lido.data.variantes),
        arquivado: false,
        foraDeVenda: false,
        esgotadoNoDia: null,
      });
      estado.porId.set(id, produto);
      return { ok: true, valor: produto };
    },

    async editarProduto(id, entrada) {
      const atual = estado.porId.get(id);
      if (!atual) return naoExiste;
      const lido = EsquemaEntradaProduto.safeParse(entrada);
      if (!lido.success) return invalido(lido.error);
      /* Um id de variante que o produto não tem não se aceita: era o browser a
         inventar ids, e são eles que os cestos guardam. Uma variante que falte
         na entrada sai — um cesto que a tinha passa a «variante desconhecida». */
      const existentes = new Set(atual.variantes.map((v) => v.id));
      if (lido.data.variantes.some((v) => v.id !== undefined && !existentes.has(v.id))) {
        return { ok: false, erro: "dados-invalidos", campos: ["variantes"] };
      }
      return alterar(id, { ...lido.data, variantes: comIds(lido.data.variantes) });
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
      if (pedido.estado !== "pago") return { ok: false, erro: "estado-mudou" };
      if (faltaPagarCent(pedido) > 0 && !faltaCobrada) return { ok: false, erro: "falta-cobrar" };
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
      const devolvido: Pedido = { ...pedido, estado: "pago", entregueEm: null };
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
  };
}
