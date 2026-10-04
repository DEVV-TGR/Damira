import "server-only";
import { fonteDoAmbiente } from "./exemplo";
import { protegerPainel } from "./papeis";
import type { FonteDeDados } from "./tipos";

/**
 * # A fronteira entre o frontend e os dados
 *
 * O frontend lê e escreve **só** por aqui (`docs/loja/divisao.md`). Do outro
 * lado está hoje o `json.ts`; amanhã está a base de dados, e esta lista de
 * funções não muda — é por isso que já são todas `async`.
 *
 * ⚠️ **`server-only`**: um componente de cliente que importe isto parte o
 * `build`. É de propósito. Os dados chegam ao browser por props, escolhidos
 * pela página; importados diretamente, levavam o catálogo inteiro no bundle
 * (era o que acontecia com o `ementa.json`). Os tipos, esses, importam-se de
 * `@/lib/dados/tipos`, que não traz dados nenhuns.
 *
 * Mudar uma assinatura daqui é **PR próprio, revisto pelo outro** — o
 * `CODEOWNERS` pede-o.
 */

/* O modo de teste (`LOJA_EM_TESTE=1`, ver `src/lib/modo-teste.ts`) liga os
   tempos e a cozinha de exemplo, para o calendário funcionar antes de a casa os
   dar. Quando vier a base de dados, é aqui que ela entra no lugar dos JSON. */
const fonte: FonteDeDados = fonteDoAmbiente();

export const listarProdutos: FonteDeDados["listarProdutos"] = (filtro) =>
  fonte.listarProdutos(filtro);

export const produtoPorId: FonteDeDados["produtoPorId"] = (id) => fonte.produtoPorId(id);

export const ordemDaEmenta: FonteDeDados["ordemDaEmenta"] = () => fonte.ordemDaEmenta();

export const configuracaoDaCasa: FonteDeDados["configuracaoDaCasa"] = () =>
  fonte.configuracaoDaCasa();

export const definicoesLoja: FonteDeDados["definicoesLoja"] = () => fonte.definicoesLoja();

/** ⚠️ **Nunca em cache.** Uma vaga em cache é uma vaga vendida duas vezes. */
export const ocupacao: FonteDeDados["ocupacao"] = (desde, ate) => fonte.ocupacao(desde, ate);

/** O preço do cesto, calculado aqui. O browser manda ids e quantidades. */
export const cotarCesto: FonteDeDados["cotarCesto"] = (linhas) => fonte.cotarCesto(linhas);

/**
 * Cria o pedido `pendente`. O `agora` entra por argumento, como no motor de
 * horários, e o `contaId` vem da sessão — nunca do formulário.
 */
export const criarPedido: FonteDeDados["criarPedido"] = (entrada, contexto) =>
  fonte.criarPedido(entrada, contexto);

export const pedidoPorReferencia: FonteDeDados["pedidoPorReferencia"] = (referencia) =>
  fonte.pedidoPorReferencia(referencia);

// ——— O painel ———

/*
 * O papel verifica-se no `protegerPainel` (`papeis.ts`), antes de a fonte ser
 * chamada. Depois de gravar um produto, quem chama (a ação do servidor, #40)
 * revalida as páginas onde ele aparece: são estáticas, e sem isso o site mostra
 * o preço antigo durante horas (`painel-gerente.md` › Mudar um preço). A fonte
 * não sabe que páginas há; a ação sabe.
 */
const painel = protegerPainel(fonte);

/** Todos os produtos, arquivados incluídos. O balcão também os vê, para os esgotar. */
export const produtosDoPainel = painel.produtosDoPainel;
export const criarProduto = painel.criarProduto;
export const editarProduto = painel.editarProduto;
/** «Apagar» no painel. Nunca se apaga a sério: os pedidos antigos apontam para ele. */
export const arquivarProduto = painel.arquivarProduto;
/** Do balcão. Volta sozinho amanhã. */
export const marcarEsgotadoHoje = painel.marcarEsgotadoHoje;
/** Do balcão. Fica fora até alguém o voltar a pôr. */
export const tirarDeVenda = painel.tirarDeVenda;
export const guardarHorarios = painel.guardarHorarios;
export const guardarDefinicoes = painel.guardarDefinicoes;
/** Do balcão, para quando a cozinha está cheia. O fim calcula-o o `fimDaPausa` (`src/lib/painel.ts`). */
export const pausarLoja = painel.pausarLoja;
export const listarPedidos = painel.listarPedidos;
export const pedidoDoPainel = painel.pedidoDoPainel;
/** `pago → entregue`, condicional. Com dinheiro em falta, só com `faltaCobrada`. */
export const marcarEntregue = painel.marcarEntregue;
/** O balcão até 5 minutos depois; a gerente sempre. */
export const desfazerEntregue = painel.desfazerEntregue;
export const precisaDeAtencao = painel.precisaDeAtencao;
/**
 * ⚠️ O número do polling. Quem o serve (a rota do painel, #39) põe-no em cache
 * com uma etiqueta, e cada ação que muda um pedido invalida-a (`revalidateTag`):
 * é o que deixa a base de dados dormir com o tablet aberto o dia inteiro.
 */
export const versaoPedidos = painel.versaoPedidos;
