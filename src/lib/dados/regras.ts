import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import type { z } from "zod";
import { FUSO, validarLevantamento, type ArtigoDoCesto, type VagaOcupada } from "@/lib/horarios";
import { esgotadoHoje } from "@/lib/painel";
import { linhasDoBolo, ROTULOS_PT, validarBolo } from "@/lib/bolo-personalizado";
import type {
  ConfiguracaoDaCasa,
  Cotacao,
  DefinicoesLoja,
  EsquemaEntradaPedido,
  EsquemaEntradaProduto,
  LinhaCesto,
  LinhaCotada,
  Pedido,
  Produto,
  ResultadoCriarPedido,
  Personalizacao,
  ResultadoPainel,
  Variancia,
  Variante,
  OpcoesBolo,
} from "./tipos";

/**
 * # As regras da fronteira, num sítio só
 *
 * O que as duas implementações da `FonteDeDados` — a dos JSON (`json.ts`) e a
 * da base de dados (`bd.ts`) — têm de decidir da mesma maneira. Duas cópias de
 * uma regra são duas regras no dia em que alguém só muda uma; por isso vivem
 * aqui, sem dados e sem base de dados: recebem o que precisam por argumento.
 */

/* Um passo de 0,5 kg em vírgula flutuante: 1,5 / 0,5 dá 3 certinho, mas não é
   preciso esperar muito por um 0,1 + 0,2. */
const EPSILON = 1e-9;
const noMultiplo = (quantidade: number, minimo: number, multiplo: number) => {
  const passos = (quantidade - minimo) / multiplo;
  return Math.abs(passos - Math.round(passos)) < EPSILON;
};

type LinhaACotar = Pick<LinhaCesto, "produtoId" | "varianteId" | "quantidade" | "bolo"> & {
  escolhas?: readonly string[];
  variancias?: readonly { produtoId?: string | null; varianciaId: string; escolhaId: string }[];
  opcoes?: readonly string[];
  extras?: readonly { id: string; quantidade: number }[];
};

/** O preço de uma unidade e a cópia do que se escolheu, ou porque não bate. */
type Personalizado =
  | { ok: true; acrescimoCent: number; personalizacao: Personalizacao; texto: string[] }
  | { ok: false };

const quantidadeEmTexto = (n: number) => String(n).replace(".", ",");

/**
 * **A personalização de uma linha, conferida e com preço** (#88, `pedidos.md`
 * › Personalização). Recusa só o que não é conteúdo: uma variância sem escolha
 * ou com duas, uma peça que o produto não tem ou está desligada, um extra
 * acima do máximo. Num composto, as variâncias são as dos simples que o grupo
 * leva, e nada mais.
 *
 * ⚠️ **Os cestos de antes da #88 mandam o sabor pelo nome** (`escolhas`). Sem
 * `variancias`, procura-se esse nome nas escolhas da única variância do produto
 * — que é o que a `0011` fez dos sabores.
 */
export function personalizar(
  produto: Produto,
  variante: Variante,
  linha: LinhaACotar,
  produtoDe: (id: string) => Produto | undefined,
): Personalizado {
  const falha: Personalizado = { ok: false };
  let pedidas = [...(linha.variancias ?? [])].map((v) => ({ ...v, produtoId: v.produtoId ?? null }));
  const nomes = linha.escolhas ?? [];
  if (nomes.length > 0) {
    if (pedidas.length > 0 || nomes.length !== 1 || produto.variancias.length !== 1) return falha;
    const [variancia] = produto.variancias;
    const escolha = variancia.escolhas.find((e) => e.nome.pt === nomes[0]);
    if (!escolha) return falha;
    pedidas = [{ produtoId: null, varianciaId: variancia.id, escolhaId: escolha.id }];
  }

  /* As perguntas a responder: as do próprio simples, ou as dos simples de dentro. */
  const perguntas: { produtoId: string | null; produto: Produto; variancia: Variancia }[] =
    produto.tipo === "simples"
      ? produto.variancias.map((variancia) => ({ produtoId: null, produto, variancia }))
      : variante.leva.flatMap((l) => {
          const simples = produtoDe(l.produtoId);
          return (simples?.variancias ?? []).map((variancia) => ({ produtoId: l.produtoId, produto: simples!, variancia }));
        });
  if (pedidas.length !== perguntas.length) return falha;

  const personalizacao: Personalizacao = { variancias: [], opcoes: [], extras: [], leva: [] };
  const texto: string[] = [];
  let acrescimoCent = 0;
  for (const pergunta of perguntas) {
    const resposta = pedidas.filter(
      (p) => p.produtoId === pergunta.produtoId && p.varianciaId === pergunta.variancia.id,
    );
    if (resposta.length !== 1) return falha;
    const escolha = pergunta.variancia.escolhas.find((e) => e.id === resposta[0].escolhaId && e.ativa);
    if (!escolha) return falha;
    /* Num composto, a variância de dentro diz o que é, e não muda o preço: o
       preço é o do grupo (`pedidos.md` › Personalização). */
    if (produto.tipo === "simples") acrescimoCent += escolha.acrescimoCent;
    personalizacao.variancias.push({
      produto: pergunta.produtoId === null ? null : pergunta.produto.nome.pt,
      nome: pergunta.variancia.nome.pt,
      escolha: escolha.nome.pt,
      acrescimoCent: produto.tipo === "simples" ? escolha.acrescimoCent : 0,
    });
    if (produto.tipo === "simples") texto.push(`${pergunta.variancia.nome.pt}: ${escolha.nome.pt}`);
  }

  const opcoes = linha.opcoes ?? [];
  if (new Set(opcoes).size !== opcoes.length) return falha;
  for (const id of opcoes) {
    const opcao = produto.opcoes.find((o) => o.id === id && o.ativa);
    if (!opcao) return falha;
    personalizacao.opcoes.push(opcao.nome.pt);
    texto.push(`SEM ${opcao.nome.pt}`);
  }

  const extras = linha.extras ?? [];
  if (new Set(extras.map((e) => e.id)).size !== extras.length) return falha;
  for (const pedido of extras) {
    const extra = produto.extras.find((e) => e.id === pedido.id && e.ativo);
    if (!extra || pedido.quantidade > extra.maximo) return falha;
    acrescimoCent += extra.precoCent * pedido.quantidade;
    personalizacao.extras.push({ nome: extra.nome.pt, quantidade: pedido.quantidade, precoCent: extra.precoCent });
    texto.push(`+ ${pedido.quantidade} × ${extra.nome.pt}`);
  }

  if (produto.tipo === "composto") {
    for (const l of variante.leva) {
      const simples = produtoDe(l.produtoId);
      const nome = simples?.nome.pt ?? l.produtoId;
      personalizacao.leva.push({ nome, quantidade: l.quantidade });
      const escolhidas = personalizacao.variancias.filter((v) => v.produto === nome).map((v) => v.escolha);
      texto.push(
        `${l.quantidade === null ? "" : `${quantidadeEmTexto(l.quantidade)} × `}${nome}${escolhidas.length ? ` — ${escolhidas.join(", ")}` : ""}`,
      );
    }
  }
  return { ok: true, acrescimoCent, personalizacao, texto };
}

/**
 * O preço do cesto, calculado no servidor (regra 1 do `AGENTS.md`). As linhas
 * já vêm validadas pelo `EsquemaLinhaCesto`; o produto de cada uma vem de quem
 * chama — do `Map` dos JSON, ou de uma consulta à base de dados. Um produto
 * arquivado ou tirado de venda tem de vir na mesma: é aqui que se recusa.
 *
 * ⚠️ **Num composto, os simples de dentro também têm de vir** (para as
 * variâncias deles), mesmo fora de venda: entrar só em kits é para isso.
 *
 * O preço da unidade (#88): o do tamanho ou do grupo, mais, num simples, as
 * variâncias e os extras. Tirar não desconta, e num composto o que vem dentro
 * não soma. Um preço sob orçamento põe a linha sob orçamento.
 */
export function cotarLinhas(
  linhas: readonly LinhaACotar[],
  produtoDe: (id: string) => Produto | undefined,
  /** As opções do bolo personalizado. Sem elas, um bolo personalizado é recusado. */
  opcoesBolo?: OpcoesBolo,
): Cotacao {
  const cotadas = linhas.map((linha): LinhaCotada => cotarUma(linha, produtoDe, opcoesBolo).cotada);
  const validas = cotadas.filter((linha) => linha.erro === null);
  return {
    linhas: cotadas,
    totalCent: validas.reduce((soma, linha) => soma + (linha.totalCent ?? 0), 0),
    semPreco: validas.filter((linha) => linha.totalCent === null).length,
    valida: validas.length === cotadas.length,
  };
}

function cotarUma(
  linha: LinhaACotar,
  produtoDe: (id: string) => Produto | undefined,
  opcoesBolo?: OpcoesBolo,
): { cotada: LinhaCotada; personalizado?: Extract<Personalizado, { ok: true }> } {
  const base = { produtoId: linha.produtoId, varianteId: linha.varianteId, quantidade: linha.quantidade };
  const falha = (erro: LinhaCotada["erro"]) => ({
    cotada: { ...base, precoUnitarioCent: null, totalCent: null, detalhe: [], erro },
  });

  const produto = produtoDe(linha.produtoId);
  if (!produto) return falha("produto-desconhecido");
  const variante = produto.variantes.find((v) => v.id === linha.varianteId && v.ativa);
  if (!variante) return falha("variante-desconhecida");
  if (!produto.aVendaOnline || produto.arquivado || produto.foraDeVenda) return falha("fora-de-venda");
  /* O bolo personalizado (o «bolo por medida», #51) monta-se no configurador e
     confere-se contra as opções da casa (`validarBolo`). ⚠️ **Não leva peças da
     #88** — variâncias, opções, extras, sabor pelo nome —: o bolo é todo do
     configurador, e o preço final é da gerente. Nenhum outro produto traz bolo. */
  const ehBolo = produto.familia === "medida";
  if (ehBolo) {
    const pecas = (linha.escolhas?.length ?? 0) + (linha.variancias?.length ?? 0) + (linha.opcoes?.length ?? 0) + (linha.extras?.length ?? 0);
    if (pecas > 0 || !linha.bolo || !opcoesBolo || validarBolo(opcoesBolo, linha.bolo) !== null) return falha("bolo-invalido");
  } else if (linha.bolo) {
    return falha("bolo-invalido");
  }
  const personalizado = personalizar(produto, variante, linha, produtoDe);
  if (!personalizado.ok) return falha("escolha-invalida");
  if (ehBolo && linha.bolo && opcoesBolo) {
    /* O texto é o do configurador, com os nomes da casa; as fotos ficam na
       cópia da linha, em dois campos (`bolos-personalizados.md` › As duas fotos). */
    personalizado.texto = linhasDoBolo(opcoesBolo, linha.bolo, ROTULOS_PT);
    personalizado.personalizacao.bolo = {
      fotos: { referencia: [...linha.bolo.fotosReferencia], imprimir: linha.bolo.fotoImprimir },
    };
  }
  if (linha.quantidade < produto.quantidadeMinima - EPSILON) return falha("abaixo-do-minimo");
  if (!noMultiplo(linha.quantidade, produto.quantidadeMinima, produto.multiplo)) {
    return falha("fora-do-multiplo");
  }

  const preco = variante.precoCent === null ? null : variante.precoCent + personalizado.acrescimoCent;
  return {
    personalizado,
    cotada: {
      ...base,
      precoUnitarioCent: preco,
      /* Ao quilo, 1,5 kg a 1700 cêntimos são 2550: arredonda-se uma vez, no
         total da linha, e é sempre um inteiro. */
      totalCent: preco === null ? null : Math.round(preco * linha.quantidade),
      detalhe: personalizado.texto,
      erro: null,
    },
  };
}

/**
 * Os ids dos produtos de que um cesto precisa para se cotar: os das linhas e,
 * nos compostos, os simples que cada grupo leva. Quem lê da base de dados pede
 * os dois numa consulta cada, nunca um por produto (`robustez.md`).
 */
export const simplesLevados = (produtos: readonly Produto[]): string[] => [
  ...new Set(produtos.flatMap((p) => p.variantes.flatMap((v) => v.leva.map((l) => l.produtoId)))),
];

/**
 * O que um composto leva tem de existir e ser **simples** — não há kits dentro
 * de kits (`painel-gerente.md`). Fora de venda pode: é para isso que serve.
 */
export const levaInvalida = (variantes: readonly Pick<Variante, "leva">[], produtoDe: (id: string) => Produto | undefined) =>
  variantes.some((v) => v.leva.some((l) => produtoDe(l.produtoId)?.tipo !== "simples"));

// ——— Gravar um produto (o painel da gerente) ———

/** Os campos que falharam, para o formulário do painel os marcar. */
export const invalido = (erro: z.ZodError): ResultadoPainel<never> => ({
  ok: false,
  erro: "dados-invalidos",
  campos: [...new Set(erro.issues.flatMap((issue) => (issue.path.length > 0 ? [String(issue.path[0])] : [])))],
});

export const naoExiste: ResultadoPainel<never> = { ok: false, erro: "nao-existe" };

/**
 * O «necessita de confirmação da loja» de partida: ligado só num produto **sem
 * preço** — nenhuma variante com preço, que é «sob orçamento» e nunca zero.
 * Um preço que ninguém deu não se confirma sozinho; um que a casa escreveu,
 * sim, até a gerente dizer o contrário. Calcula-se em vez de se escrever à mão
 * em 107 produtos, e é a mesma conta para os JSON e para a migração da base de
 * dados.
 */
export const pedeConfirmacaoInicial = (produto: { variantes: readonly { precoCent: number | null }[] }): boolean =>
  produto.variantes.every((variante) => variante.precoCent === null);

/* «Bolo de Bolacha» → `bolo-de-bolacha`. Os acentos saem, porque o id vai no
   URL e um `pão` partilhado por mensagem chega como `p%C3%A3o`. */
export const emId = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

/* O primeiro livre de `base`, `base-2`, `base-3`… */
export const livre = (base: string, ocupados: (id: string) => boolean): string => {
  if (!ocupados(base)) return base;
  let n = 2;
  while (ocupados(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

type EntradaLida = z.output<typeof EsquemaEntradaProduto>;

/* Uma variante nova ganha id a partir do que a distingue: o número de pessoas,
   o rótulo, ou `unica` se for a única. As que já tinham id guardam-no. */
export const comIds = (variantes: EntradaLida["variantes"]): Produto["variantes"] => {
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

/* O id de uma peça nova: o nome em `kebab`, o primeiro livre. */
const idNovo = (nome: string, recurso: string, ocupado: (id: string) => boolean) =>
  livre(emId(nome) || recurso, ocupado);

/**
 * As peças da #88 com ids: as que já os tinham guardam-nos, as novas ganham-nos
 * a partir do nome.
 *
 * ⚠️ **As variâncias e os extras são de todo o catálogo** (o «ligar»), por isso
 * um id novo tem de estar livre em todo ele, e um id que venha do browser tem
 * de existir — em qualquer produto. Um que não exista em lado nenhum era o
 * browser a inventar ids, e devolve o campo a marcar. As opções e as escolhas
 * são só da sua peça.
 */
export function pecasComIds(
  entrada: Pick<EntradaLida, "variancias" | "opcoes" | "extras">,
  existentes: { variancias: (id: string) => boolean; extras: (id: string) => boolean },
): { ok: true; pecas: Pick<Produto, "variancias" | "opcoes" | "extras"> } | { ok: false; campo: string } {
  if (entrada.variancias.some((v) => v.id !== undefined && !existentes.variancias(v.id))) {
    return { ok: false, campo: "variancias" };
  }
  if (entrada.extras.some((e) => e.id !== undefined && !existentes.extras(e.id))) {
    return { ok: false, campo: "extras" };
  }
  const usadas = new Set<string>();
  const variancias = entrada.variancias.map((v) => {
    const id = v.id ?? idNovo(v.nome.pt, "variancia", (c) => usadas.has(c) || existentes.variancias(c));
    usadas.add(id);
    const escolhasUsadas = new Set(v.escolhas.flatMap((e) => (e.id ? [e.id] : [])));
    const escolhas = v.escolhas.map((e) => {
      const idEscolha = e.id ?? idNovo(e.nome.pt, "escolha", (c) => escolhasUsadas.has(c));
      escolhasUsadas.add(idEscolha);
      return { ...e, id: idEscolha };
    });
    return { ...v, id, escolhas };
  });
  const usados = new Set<string>();
  const extras = entrada.extras.map((e) => {
    const id = e.id ?? idNovo(e.nome.pt, "extra", (c) => usados.has(c) || existentes.extras(c));
    usados.add(id);
    return { ...e, id };
  });
  const opcoesUsadas = new Set(entrada.opcoes.flatMap((o) => (o.id ? [o.id] : [])));
  const opcoes = entrada.opcoes.map((o) => {
    const id = o.id ?? idNovo(o.nome.pt, "opcao", (c) => opcoesUsadas.has(c));
    opcoesUsadas.add(id);
    return { ...o, id };
  });
  return { ok: true, pecas: { variancias, opcoes, extras } };
}

/**
 * O que muda nos **outros** produtos quando um grava uma variância ou um extra
 * partilhado: a mesma peça, com o mesmo id, passa a ser a nova em todos. Só
 * para a fonte dos JSON — na base de dados é a mesma linha, e muda sozinha.
 */
export function comPecasPartilhadas(outro: Produto, gravado: Pick<Produto, "variancias" | "extras">): Produto | null {
  let mudou = false;
  const variancias = outro.variancias.map((v) => {
    const nova = gravado.variancias.find((g) => g.id === v.id);
    if (nova) mudou = true;
    return nova ?? v;
  });
  const extras = outro.extras.map((e) => {
    const novo = gravado.extras.find((g) => g.id === e.id);
    if (novo) mudou = true;
    return novo ?? e;
  });
  return mudou ? { ...outro, variancias, extras } : null;
}

/**
 * Tudo o que se confere e completa antes de gravar um produto, nas duas
 * fontes: os ids das variantes e das peças, e o que um grupo leva. `catalogo`
 * é o catálogo inteiro, arquivados incluídos; `atual`, o produto que se edita.
 */
export function prepararProduto(
  lido: EntradaLida,
  catalogo: readonly Produto[],
  atual: Produto | null,
):
  | { ok: true; campos: Pick<Produto, "variantes" | "variancias" | "opcoes" | "extras"> }
  | { ok: false; resultado: ResultadoPainel<never> } {
  const recusa = (campo: string) => ({
    ok: false as const,
    resultado: { ok: false as const, erro: "dados-invalidos" as const, campos: [campo] },
  });
  /* Um id de variante que o produto não tem não se aceita: era o browser a
     inventar ids, e são eles que os cestos guardam. Uma variante que falte
     na entrada sai. */
  const existentes = new Set(atual?.variantes.map((v) => v.id) ?? []);
  if (lido.variantes.some((v) => v.id !== undefined && !existentes.has(v.id))) return recusa("variantes");
  const porId = new Map(catalogo.map((p) => [p.id, p]));
  /* Um simples que está num kit não passa a composto: ficava um kit dentro de
     um kit. Tira-se primeiro do kit (`painel-gerente.md`). */
  if (atual && lido.tipo === "composto" && compostosQueLevam(atual.id, catalogo).length > 0) return recusa("tipo");
  if (levaInvalida(lido.variantes, (id) => (id === atual?.id ? undefined : porId.get(id)))) return recusa("variantes");
  const variancias = new Set(catalogo.flatMap((p) => p.variancias.map((v) => v.id)));
  const extras = new Set(catalogo.flatMap((p) => p.extras.map((e) => e.id)));
  const pecas = pecasComIds(lido, { variancias: (id) => variancias.has(id), extras: (id) => extras.has(id) });
  if (!pecas.ok) return recusa(pecas.campo);
  return { ok: true, campos: { variantes: comIds(lido.variantes), ...pecas.pecas } };
}

/**
 * Antes de arquivar um simples, o painel avisa em que compostos ele está
 * (`painel-gerente.md`): arquivar não o tira de lá, porque um kit não muda
 * sozinho.
 */
export const compostosQueLevam = (id: string, catalogo: readonly Produto[]): Produto[] =>
  catalogo.filter((p) => !p.arquivado && p.variantes.some((v) => v.leva.some((l) => l.produtoId === id)));

// ——— O pedido ———

/**
 * **O prazo de um pedido por pagar: 31 minutos**, contados de quando nasceu
 * (`pedidos.md`, decidido a 02/11). É também o `expires_at` da sessão do Stripe
 * (`pagamentos.md`): um prazo só, para a vaga nunca sair enquanto alguém a pode
 * pagar. O Stripe exige pelo menos 30 minutos; o minuto a mais cobre os
 * segundos entre criar o pedido e criar a sessão.
 */
export const PRAZO_DO_PEDIDO_MS = 31 * 60_000;

/**
 * **O prazo da casa para responder a um `por-confirmar`: 48 horas corridas**,
 * contadas de quando nasceu (`pedidos.md` › Expirar às 48 horas, §1 da
 * política). Corridas quer dizer instantes e não hora de parede: soma-se ao
 * instante, e numa mudança de hora o cliente lê uma hora a mais ou a menos.
 */
export const PRAZO_DA_RESPOSTA_MS = 48 * 3_600_000;

/**
 * O prazo do cliente para aceitar a proposta da casa: 24 horas, a contar da proposta (decidido pela
 * Andreia a 25/11, `pedidos.md` › Em aberto, 2). Passado ele, a proposta expira, a vaga liberta-se
 * e o cliente recebe o email. Uma proposta revista começa outra vez as 24 horas.
 */
export const PRAZO_DO_ACEITE_MS = 24 * 3_600_000;

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * A referência de balcão, `DAM-DDMM-XXXX`, sem letras que se confundem ao
 * telefone. ⚠️ O dia é o **de Lisboa**, e o `agora` entra por argumento: entre a
 * meia-noite e a uma da manhã de verão, o dia UTC é o anterior (regra 3 do
 * AGENTS.md). Única na base de dados: quem a gera tenta outra se colidir.
 */
export const gerarReferencia = (agora: Date): string => {
  let sufixo = "";
  for (let i = 0; i < 4; i++) sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `DAM-${format(agora, "ddMM", { in: tz(FUSO) })}-${sufixo}`;
};

type DadosDoPedido = z.output<typeof EsquemaEntradaPedido>;

/** O que passou a conferência: o que falta para o pedido nascer é a referência e o id. */
export type PedidoConferido = {
  ok: true;
  levantamentoEm: Date;
  linhas: Pedido["linhas"];
  /** Só a parte conhecida: uma linha sem preço nunca se soma como zero. */
  totalCent: number;
  /**
   * Se o pedido espera pela casa: basta **um** produto que necessite de
   * confirmação, ou uma linha sem preço, para o pedido inteiro esperar
   * (`pedidos.md` › Confirmar).
   */
  porConfirmar: boolean;
};

/**
 * Tudo o que se confere antes de um pedido nascer, pela ordem em que se responde:
 * a pausa, os artigos, o preço, o mínimo, o calendário. É uma conferência e não
 * uma garantia: quem decide a última vaga é a base de dados (regra 5), e quem
 * chama trata disso.
 *
 * Os dados vêm de quem chama (`ocupacaoDaVaga` só é pedida se tudo o resto
 * passou, por ser a única que pode ir à base de dados outra vez).
 */
export async function conferirPedido(
  dados: DadosDoPedido,
  agora: Date,
  fontes: {
    definicoes: DefinicoesLoja;
    configuracao: ConfiguracaoDaCasa;
    produtoDe: (id: string) => Produto | undefined;
    ocupacaoDaVaga: (vaga: Date) => VagaOcupada[] | Promise<VagaOcupada[]>;
    /** Sem elas, um bolo personalizado é recusado. */
    opcoesBolo?: OpcoesBolo;
  },
): Promise<PedidoConferido | Extract<ResultadoCriarPedido, { ok: false }>> {
  const { definicoes, configuracao, produtoDe, ocupacaoDaVaga } = fontes;
  if (definicoes.pausaAte && agora.getTime() < definicoes.pausaAte.getTime()) {
    return { ok: false, erro: "loja-em-pausa" };
  }

  const cotacao = cotarLinhas(dados.linhas, produtoDe, fontes.opcoesBolo);
  if (!cotacao.valida) return { ok: false, erro: "artigo-invalido", linhas: cotacao.linhas };
  /* ⚠️ Com uma linha por orçar, a parte conhecida não diz quanto o pedido vai
     custar — o bolo por medida sozinho dava zero. O mínimo só se confere quando
     se sabem todos os preços; com uma linha por orçar, decide a gerente, ao
     responder. */
  if (definicoes.valorMinimoCent !== null && cotacao.semPreco === 0 && cotacao.totalCent < definicoes.valorMinimoCent) {
    return { ok: false, erro: "abaixo-do-minimo-da-loja" };
  }

  /* Sem a cozinha ou sem um tempo de produção, não há calendário — e um pedido
     sem calendário é uma promessa sem data. */
  const produtos = dados.linhas.map((linha) => produtoDe(linha.produtoId)!);
  if (configuracao.cozinha === null || produtos.some((p) => p.tempoProducao === null)) {
    return { ok: false, erro: "indisponivel" };
  }
  const cesto: ArtigoDoCesto[] = produtos.map((p) => ({
    tempo: p.tempoProducao!,
    esgotadoHoje: esgotadoHoje(p, agora),
  }));
  const levantamentoEm = new Date(dados.levantamentoEm);
  const validacao = validarLevantamento(
    cesto,
    levantamentoEm,
    agora,
    { ...configuracao, cozinha: configuracao.cozinha },
    await ocupacaoDaVaga(levantamentoEm),
  );
  if (!validacao.ok) return { ok: false, erro: validacao.motivo };

  return {
    ok: true,
    levantamentoEm,
    totalCent: cotacao.totalCent,
    /* O servidor trata uma linha sem preço como «necessita de confirmação»,
       diga a caixa o que disser (`pedidos.md` › Confirmar). */
    porConfirmar: cotacao.semPreco > 0 || produtos.some((p) => p.pedeConfirmacao),
    linhas: dados.linhas.map((linha, i) => {
      const produto = produtos[i];
      const variante = produto.variantes.find((v) => v.id === linha.varianteId)!;
      const cotada = cotacao.linhas[i];
      /* Já passou na cotação: aqui só se tira a cópia do que se escolheu. */
      const personalizado = cotarUma(linha, produtoDe, fontes.opcoesBolo).personalizado!;
      return {
        produtoId: produto.id,
        varianteId: variante.id,
        /* Em português: a língua do pedido ainda não está decidida (`pedidos.md`
           não tem `locale`). */
        nome: produto.nome.pt,
        variante: variante.rotulo?.pt ?? null,
        escolhas: personalizado.texto,
        personalizacao: personalizado.personalizacao,
        unidade: produto.unidade,
        quantidade: linha.quantidade,
        /* `null` numa linha sem preço, até a gerente o fixar. */
        precoUnitarioCent: cotada.precoUnitarioCent,
        totalCent: cotada.totalCent,
        notas: linha.notas,
        precoDaProposta: false,
      };
    }),
  };
}

/**
 * O pedido no momento em que nasce, **a pagar na loja** (`pedidos.md` › Os
 * estados): `confirmado` se não há nada a confirmar, com o `confirmadoEm` de
 * agora; senão `por-confirmar`, com 48 horas para a casa responder. Tudo o que
 * vem depois fica a vazio.
 *
 * ⚠️ Só levantamentos: a entrega, que nasce sempre `por-confirmar` e paga por
 * transferência, espera pelas regras da casa (`pedidos.md` › Em aberto, 8). E o
 * `pendente` do Stripe dorme com ele: nenhum pedido lá nasce.
 */
export const pedidoNaLoja = (
  dados: DadosDoPedido,
  conferido: PedidoConferido,
  { id, referencia, agora, contaId }: { id: string; referencia: string; agora: Date; contaId: string | null },
): Pedido => ({
  id,
  referencia,
  estado: conferido.porConfirmar ? "por-confirmar" : "confirmado",
  criadoEm: agora,
  levantamentoEm: conferido.levantamentoEm,
  cliente: { ...dados.cliente, contaId },
  linhas: conferido.linhas,
  observacoes: dados.observacoes,
  totalCent: conferido.totalCent,
  modoPagamento: "na-loja",
  pagoOnlineCent: 0,
  reembolsadoCent: 0,
  chegouTarde: false,
  pagoEm: null,
  impressoEm: null,
  entregueEm: null,
  canceladoEm: null,
  canceladoPor: null,
  reembolsos: [],
  avisosTratados: [],
  reagendadoEm: null,
  confirmadoEm: conferido.porConfirmar ? null : agora,
  expiraEm: conferido.porConfirmar ? new Date(agora.getTime() + PRAZO_DA_RESPOSTA_MS) : null,
  aceiteEm: null,
  causaExpiracao: null,
  propostaVersao: 0,
  propostaEm: null,
  levantamentoAnteriorEm: null,
});

// ——— O painel ———

/**
 * Os pedidos pagos na loja que a gerente pode cancelar: os que esperam pela casa
 * ou pelo cliente, e os confirmados por levantar (`pedidos.md` › Os estados). O
 * `pago` do Stripe também se cancela, com reembolso; o resto já acabou.
 * O prazo já passado vale mesmo antes de a limpeza gravar a expiração.
 */
export const CANCELAVEIS_NA_LOJA: readonly Pedido["estado"][] = ["por-confirmar", "a-aguardar-aceite", "confirmado"];

export const podeCancelar = (pedido: Pick<Pedido, "estado" | "modoPagamento" | "expiraEm">, agora: Date): boolean =>
  (pedido.estado === "pago" || (pedido.modoPagamento === "na-loja" && CANCELAVEIS_NA_LOJA.includes(pedido.estado))) &&
  /* Os dois que esperam têm prazo — a casa (48 h) e o cliente (24 h) —, e passado ele já expiraram,
     mesmo antes de a limpeza o gravar: não aparecem como ativos nem se cancelam. */
  ((pedido.estado !== "por-confirmar" && pedido.estado !== "a-aguardar-aceite") ||
    (pedido.expiraEm !== null && pedido.expiraEm.getTime() > agora.getTime()));

/**
 * Quem a gerente reagenda: o `pago` e o `confirmado`. Mudar a hora de um que
 * ainda espera pela casa é responder-lhe, e passa pelo aceite do cliente
 * (`pedidos.md` › Confirmar).
 */
export const REAGENDAVEIS: readonly Pedido["estado"][] = ["pago", "confirmado"];

/**
 * Para onde volta um «entregue» desfeito: para o estado de onde veio — `pago`
 * no Stripe, `confirmado` na loja. Os efeitos da primeira confirmação não se
 * repetem (`pedidos.md` › Os estados).
 */
export const estadoAntesDeEntregue = (pedido: Pick<Pedido, "modoPagamento">): Pedido["estado"] =>
  pedido.modoPagamento === "na-loja" ? "confirmado" : "pago";

/**
 * O texto por onde o painel procura um pedido: o nome e a referência, sem
 * acentos e em minúsculas. Escreve-se uma vez, ao criar, e é o que deixa
 * encontrar «a encomenda da Márcia» escrevendo `marcia`
 * (`base-de-dados.md` › Os pedidos).
 */
export const textoDeProcura = (nome: string, referencia: string): string => paraProcura(`${nome} ${referencia}`);

/** Sem acentos e em minúsculas: a mesma conta no que se guarda e no que se procura. */
export const paraProcura = (texto: string): string => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// ——— A resposta da casa e o aceite do cliente ———

/**
 * Quem pode receber a resposta da casa: o que ainda espera por ela, e o que espera o aceite (uma
 * proposta revista). Um `por-confirmar` com o prazo passado já não se responde, mesmo antes de a
 * limpeza gravar a expiração (`pedidos.md` › Expirar às 48 horas).
 */
export const podeResponder = (pedido: Pick<Pedido, "estado" | "modoPagamento" | "expiraEm">, agora: Date): boolean =>
  pedido.modoPagamento === "na-loja" &&
  (pedido.estado === "a-aguardar-aceite" || pedido.estado === "por-confirmar") &&
  /* Os dois têm prazo: as 48 h da casa, ou as 24 h do cliente. Passado, já não se responde. */
  pedido.expiraEm !== null &&
  pedido.expiraEm.getTime() > agora.getTime();

/** A proposta ainda se pode aceitar ou recusar: espera o aceite, na versão do link, e dentro das 24 h. */
export const propostaEmAberto = (pedido: Pick<Pedido, "estado" | "propostaVersao" | "expiraEm">, versao: number, agora: Date) =>
  pedido.estado === "a-aguardar-aceite" &&
  pedido.propostaVersao === versao &&
  pedido.expiraEm !== null &&
  pedido.expiraEm.getTime() > agora.getTime();

/** O plano da resposta: o que muda no pedido, já validado, igual para as duas fontes. */
export type PlanoResposta = {
  tipo: "confirmar" | "propor";
  linhas: Pedido["linhas"];
  totalCent: number;
  levantamentoEm: Date;
  levantamentoAnteriorEm: Date | null;
  /** As posições cujo preço a casa fixou agora. */
  fixadas: number[];
  /** Até quando o cliente pode aceitar a proposta; `null` no «sim» da casa. */
  expiraEm: Date | null;
};

/**
 * Decide o que a resposta faz, sem tocar em nada: confirma (sem nada novo), propõe (preço ou hora
 * novos) ou recusa a entrada. A hora nova valida-a quem chama, com a ocupação das vagas.
 *
 * - Só se fixa o preço de uma linha sem preço, ou de uma já fixada numa proposta: o preço que o
 *   cliente viu ao pedir não muda por aqui.
 * - Depois de responder, nenhuma linha fica sem preço: um pedido confirmado, ou uma proposta,
 *   com um «a fixar» não diz ao cliente quanto vai pagar.
 * - Propor é da gerente; o balcão só dá o «sim» (`pedidos.md` › O aceite do cliente).
 */
export function planearResposta(
  pedido: Pedido,
  entrada: { precos: { posicao: number; precoUnitarioCent: number }[]; levantamentoEm: Date | null },
  papel: "funcionario" | "gerente",
  agora: Date,
): { ok: true; plano: PlanoResposta } | { ok: false; erro: "dados-invalidos" | "sem-permissao"; campos?: string[] } {
  const posicoes = entrada.precos.map((p) => p.posicao);
  if (new Set(posicoes).size !== posicoes.length) return { ok: false, erro: "dados-invalidos", campos: ["precos"] };

  const linhas = pedido.linhas.map((linha) => ({ ...linha }));
  for (const { posicao, precoUnitarioCent } of entrada.precos) {
    const linha = linhas[posicao];
    if (!linha || (linha.precoUnitarioCent !== null && !linha.precoDaProposta)) {
      return { ok: false, erro: "dados-invalidos", campos: ["precos"] };
    }
    /* Ao quilo pede-se meio quilo: o total arredonda ao cêntimo, e o dinheiro fica inteiro. */
    linhas[posicao] = {
      ...linha,
      precoUnitarioCent,
      totalCent: Math.round(precoUnitarioCent * linha.quantidade),
      precoDaProposta: true,
    };
  }
  if (linhas.some((linha) => linha.totalCent === null)) return { ok: false, erro: "dados-invalidos", campos: ["precos"] };

  const novaHora =
    entrada.levantamentoEm !== null && entrada.levantamentoEm.getTime() !== pedido.levantamentoEm.getTime();
  const propoe = entrada.precos.length > 0 || novaHora;
  /* Um «sim» só confirma o que ainda esperava pela casa; responder outra vez a uma proposta sem
     mudar nada não é uma resposta. */
  if (!propoe && pedido.estado !== "por-confirmar") return { ok: false, erro: "dados-invalidos", campos: ["precos"] };
  if (propoe && papel !== "gerente") return { ok: false, erro: "sem-permissao" };

  const levantamentoEm = novaHora ? entrada.levantamentoEm! : pedido.levantamentoEm;
  /* As 24 horas do cliente, mas nunca depois do levantamento: aceitar às 9h30 um pedido das 10h00
     confirmava-o quando a cozinha já não o faz, e às 12h00 confirmava-o para uma hora passada. Uma
     proposta sem tempo nenhum para aceitar não se envia. (A margem antes da produção é o n.º 1 do
     «Em aberto», da Andreia.) */
  const expiraEm = propoe ? new Date(Math.min(agora.getTime() + PRAZO_DO_ACEITE_MS, levantamentoEm.getTime())) : null;
  if (expiraEm && expiraEm.getTime() <= agora.getTime()) {
    return { ok: false, erro: "dados-invalidos", campos: ["levantamentoEm"] };
  }

  return {
    ok: true,
    plano: {
      tipo: propoe ? "propor" : "confirmar",
      linhas,
      totalCent: linhas.reduce((soma, linha) => soma + (linha.totalCent ?? 0), 0),
      levantamentoEm,
      levantamentoAnteriorEm: horaAnterior(pedido, novaHora ? entrada.levantamentoEm! : null),
      fixadas: entrada.precos.map((p) => p.posicao),
      expiraEm,
    },
  };
}

/**
 * A hora que o cliente pediu, guardada enquanto a proposta a muda: a primeira, mesmo que a proposta
 * seja revista várias vezes. Se a revisão voltar à hora pedida, deixa de haver mudança de hora —
 * senão a página dizia «10h30, em vez das 10h30».
 */
function horaAnterior(pedido: Pedido, nova: Date | null): Date | null {
  if (nova === null) return pedido.levantamentoAnteriorEm;
  const pedida = pedido.levantamentoAnteriorEm ?? pedido.levantamentoEm;
  return nova.getTime() === pedida.getTime() ? null : pedida;
}

/** O pedido depois da resposta, como as duas fontes o gravam. */
export const pedidoRespondido = (pedido: Pedido, plano: PlanoResposta, agora: Date): Pedido =>
  plano.tipo === "confirmar"
    ? { ...pedido, estado: "confirmado", confirmadoEm: agora }
    : {
        ...pedido,
        estado: "a-aguardar-aceite",
        linhas: plano.linhas,
        totalCent: plano.totalCent,
        levantamentoEm: plano.levantamentoEm,
        levantamentoAnteriorEm: plano.levantamentoAnteriorEm,
        propostaVersao: pedido.propostaVersao + 1,
        propostaEm: agora,
        /* O prazo do cliente substitui as 48 h da casa: ela já respondeu. */
        expiraEm: plano.expiraEm,
      };
