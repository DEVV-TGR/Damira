import "server-only";
import { fonteDeExemplo } from "./exemplo";
import { criarFonteJson } from "./json";
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

/* `DADOS_DE_EXEMPLO=1` no `.env.local` liga os tempos e a cozinha de exemplo,
   para trabalhar no calendário antes de a casa os dar. Em produção o
   `exemplo.ts` recusa-se a correr. */
const fonte: FonteDeDados =
  process.env.DADOS_DE_EXEMPLO === "1" ? fonteDeExemplo() : criarFonteJson();

export const listarProdutos: FonteDeDados["listarProdutos"] = (filtro) =>
  fonte.listarProdutos(filtro);

export const produtoPorId: FonteDeDados["produtoPorId"] = (id) => fonte.produtoPorId(id);

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
