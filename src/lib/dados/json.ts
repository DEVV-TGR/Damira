import { randomUUID } from "node:crypto";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { casa, DIAS_DA_SEMANA } from "@/data/casa";
import { CARTAS, CATEGORIAS, ementa, SUBCATEGORIAS, type Artigo } from "@/data/ementa";
import type { Box, KitBolo, Linha } from "@/data/encomendas";
import { regraDe } from "@/lib/encomendavel";
import {
  FUSO,
  PREDEFINICOES,
  validarLevantamento,
  type ArtigoDoCesto,
  type HorarioSemanal,
  type VagaOcupada,
} from "@/lib/horarios";
import { esgotadoHoje } from "@/lib/painel";
import { PRODUTOS, type Produto as ProdutoDasEncomendas } from "@/lib/produtos";
import mensagensEn from "../../../messages/en.json";
import mensagensPt from "../../../messages/pt.json";
import { criarPainelJson, type EstadoJson } from "./json-painel";
import { cotarLinhas } from "./regras";
import {
  EsquemaEntradaPedido,
  EsquemaLinhaCesto,
  EsquemaProduto,
  type ConfiguracaoDaCasa,
  type Cotacao,
  type DefinicoesLoja,
  type FonteDeDados,
  type FonteLoja,
  type GrupoComposicao,
  type Pedido,
  type Produto,
  type ResultadoCriarPedido,
} from "./tipos";

/**
 * # A implementação provisória: os JSON por trás da fronteira
 *
 * É **o único ficheiro que a migração troca**. A base de dados implementa a
 * mesma `FonteDeDados` (ver `tipos.ts`) e as páginas não dão por nada.
 *
 * ⚠️ **Os pedidos ficam em memória e não persistem.** Um `Map` num processo da
 * Vercel apaga-se no próximo arranque, e dois processos não se veem. Serve para
 * o cesto, o calendário e o checkout poderem ser construídos e testados antes
 * de haver base de dados — **não serve para receber um pedido a sério**, e não
 * está ligado a nenhuma página.
 *
 * ⚠️ **O que a casa ainda não deu fica `null`**, e não se inventa: o tempo de
 * produção, os alergénios, o sinal, o limite e o horário da cozinha. Sem eles o
 * calendário não se calcula, e o `criarPedido` responde `indisponivel`. Os
 * valores para trabalhar estão em `exemplo.ts`, à parte.
 */

// ——— Euros → cêntimos ———

/* A conversão acontece uma vez, aqui. Rebenta em vez de arredondar em silêncio:
   um preço de 1,605 € no JSON é um erro de quem o escreveu, e arredondá-lo é
   decidir pela casa quanto custa. Os 95 + 12 de hoje são todos exatos. */
const emCent = (euros: number, onde: string): number => {
  const cent = Math.round(euros * 100);
  if (Math.abs(cent - euros * 100) > 1e-6) {
    throw new Error(`src/lib/dados/json.ts: ${onde} custa ${euros} €, que não é um número de cêntimos.`);
  }
  return cent;
};

// ——— O catálogo ———

const daEmenta = (artigo: Artigo): Produto => {
  /* O mínimo e o passo da encomenda vivem ainda numa tabela por categoria (ver
     `encomendavel.ts`). Passam a ser por produto quando a gerente os puder
     editar; até lá, um artigo sem regra não se encomenda. */
  const regra = regraDe(artigo);
  return {
    id: artigo.id,
    origem: "ementa",
    familia: "ementa",
    nome: { pt: artigo.nome, en: artigo.nomeEn },
    descricao: artigo.descricao,
    carta: artigo.carta,
    categoria: artigo.categoria,
    subcategoria: artigo.subcategoria,
    unidade: artigo.unidade,
    variantes: artigo.variantes
      ? artigo.variantes.map((variante) => ({
          id: variante.chave,
          rotulo: { pt: variante.chave, en: variante.chave },
          pessoas: null,
          precoCent: emCent(variante.preco, `${artigo.id} (${variante.chave})`),
          composicao: [],
        }))
      : [
          {
            id: "unica",
            rotulo: null,
            pessoas: null,
            precoCent: artigo.preco === null ? null : emCent(artigo.preco, artigo.id),
            composicao: [],
          },
        ],
    escolhas: artigo.sabores,
    tempoProducao: null,
    quantidadeMinima: regra?.minimo ?? 1,
    multiplo: regra?.passo ?? 1,
    aVendaOnline: regra !== null,
    apareceNaEmenta: true,
    /* O JSON escreve `[]` em todos, e ali quer dizer **por preencher** — nunca
       «sem alergénios». Aqui passa a `null`, que é o que significa. */
    alergenios: artigo.alergenios.length > 0 ? artigo.alergenios : null,
    vegan: artigo.vegan,
    fotos: artigo.foto ? [artigo.foto] : [],
    sinalPercent: null,
    limite: null,
    semGluten: false,
    arquivado: false,
    foraDeVenda: false,
    esgotadoNoDia: null,
  };
};

const paraPessoas = (n: number) => ({
  pt: mensagensPt.produto.paraPessoas.replace("{n}", String(n)),
  en: mensagensEn.produto.paraPessoas.replace("{n}", String(n)),
});

const linhas = (itens: readonly Linha[]) =>
  itens.map((item) => ({ nome: item.nome, quantidade: item.quantidade }));

/* O que um produto de variante única leva, por família. A box escreve a
   quantidade colada ao nome; o kit de bolo tem-na em coluna própria. */
const composicaoDe = (produto: ProdutoDasEncomendas): GrupoComposicao[] => {
  if (produto.familia === "bolo") {
    return [{ grupo: "itens", linhas: linhas((produto.fonte as KitBolo).itens) }];
  }
  if (produto.familia === "box") {
    const itens = (produto.fonte as Box).itens;
    return [{ grupo: "itens", linhas: itens.map((nome) => ({ nome, quantidade: null })) }];
  }
  return [];
};

const daEncomenda = (produto: ProdutoDasEncomendas): Produto => {
  const fonte = produto.fonte;
  const variantes =
    fonte && "escaloes" in fonte
      ? fonte.escaloes.map((escalao) => ({
          id: String(escalao.pessoas),
          rotulo: paraPessoas(escalao.pessoas),
          pessoas: escalao.pessoas,
          precoCent: emCent(escalao.preco, `${produto.id} (${escalao.pessoas} pessoas)`),
          composicao: [
            { grupo: "salgados" as const, linhas: linhas(escalao.salgados) },
            { grupo: "doces" as const, linhas: linhas(escalao.doces) },
          ],
        }))
      : [
          {
            id: "unica",
            rotulo: null,
            pessoas: null,
            precoCent: produto.preco === null ? null : emCent(produto.preco, produto.id),
            composicao: composicaoDe(produto),
          },
        ];

  /* O bolo por medida não vem do JSON e o nome dele vive nas traduções. */
  const medida = produto.familia === "medida";
  return {
    id: produto.id,
    origem: "encomendas",
    familia: produto.familia,
    nome: medida
      ? { pt: mensagensPt.produto.medida.nome, en: mensagensEn.produto.medida.nome }
      : { pt: produto.nome("pt"), en: produto.nome("en") },
    descricao: medida
      ? { pt: mensagensPt.produto.medida.resumo, en: mensagensEn.produto.medida.resumo }
      : produto.resumo
        ? { pt: produto.resumo("pt"), en: produto.resumo("en") }
        : null,
    carta: null,
    categoria: null,
    subcategoria: null,
    unidade: "un",
    variantes,
    escolhas: [],
    tempoProducao: null,
    quantidadeMinima: 1,
    multiplo: 1,
    aVendaOnline: true,
    apareceNaEmenta: false,
    alergenios: null,
    vegan: produto.vegan,
    fotos: produto.foto ? [produto.foto] : [],
    sinalPercent: null,
    limite: null,
    semGluten: false,
    arquivado: false,
    foraDeVenda: false,
    esgotadoNoDia: null,
  };
};

const montarCatalogo = (): Produto[] => {
  const catalogo = EsquemaProduto.array().parse([
    ...ementa.map(daEmenta),
    ...PRODUTOS.map(daEncomenda),
  ]);
  /* A ementa e as encomendas vêm de ficheiros diferentes e agora partilham um
     espaço de ids. Um `nata` nos dois era um produto que tapava o outro. */
  const repetidos = catalogo
    .map((produto) => produto.id)
    .filter((id, i, todos) => todos.indexOf(id) !== i);
  if (repetidos.length > 0) {
    throw new Error(`src/lib/dados/json.ts: id repetido — ${[...new Set(repetidos)].join(", ")}`);
  }
  return catalogo;
};

export const CATALOGO_JSON: readonly Produto[] = montarCatalogo();

// ——— A casa ———

const lojaDoCasaJson = (): HorarioSemanal => {
  const semana = {} as Record<(typeof DIAS_DA_SEMANA)[number], { abre: string; fecha: string }[]>;
  for (const dia of DIAS_DA_SEMANA) {
    const horario = casa.horarios?.[dia] ?? null;
    semana[dia] = horario ? [horario] : [];
  }
  return semana;
};

export const CONFIGURACAO_JSON: ConfiguracaoDaCasa = {
  loja: lojaDoCasaJson(),
  /* A Damira ainda não deu o horário da cozinha. É diferente do da loja, e
     usar o da loja no lugar dele era prometer pastéis às 7h00 feitos numa
     cozinha que só abre às 8h00. */
  cozinha: null,
  diasFechados: [],
  ...PREDEFINICOES,
  /* Os degraus que se combinaram a 04/10, até a casa os afinar no painel. Com um
     limite de 4 por vaga: 0 ou 1 pedido é verde, 2 amarelo-laranja, 3 vermelho,
     4 cheio. */
  limiaresAfluencia: { livre: 25, media: 50 },
};

const DEFINICOES_JSON: DefinicoesLoja = {
  aceitarCancelamentosSite: false,
  devolverSinalAoCancelar: false,
  valorMinimoCent: null,
  pausaAte: null,
};

// ——— A referência ———

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* ⚠️ O dia é o de **Lisboa**. O `gerarReferencia` do `historico.ts` usa o dia
   UTC, e entre a meia-noite e a uma da manhã de verão dá o dia anterior — é a
   regra 3 do AGENTS.md vista do lado da referência. Corrige-se no PR que liga
   as páginas a esta fronteira; aqui já nasce certo. */
const gerarReferencia = (agora: Date): string => {
  let sufixo = "";
  for (let i = 0; i < 4; i++) sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `DAM-${format(agora, "ddMM", { in: tz(FUSO) })}-${sufixo}`;
};

// ——— A fonte ———

const ATIVOS = new Set<Pedido["estado"]>(["pendente", "pago"]);

export type OpcoesFonteJson = {
  catalogo?: readonly Produto[];
  configuracao?: ConfiguracaoDaCasa;
  definicoes?: DefinicoesLoja;
  /**
   * Pedidos que contam para a ocupação sem estarem no `Map` — os de exemplo do
   * modo de teste (`exemplo.ts`). Somam-se aos verdadeiros **dentro da fonte**,
   * para o calendário e a confirmação ao enviar verem as mesmas vagas cheias.
   */
  ocupacaoExtra?: (desde: Date, ate: Date) => VagaOcupada[];
  /**
   * Pedidos que já existem ao arrancar — os testes do painel precisam de
   * pedidos pagos, e só o Stripe paga (#42). Contam para tudo, como os outros.
   */
  pedidos?: readonly Pedido[];
};

/**
 * A fonte sobre os JSON. Cada chamada tem os seus próprios pedidos em memória —
 * é o que deixa os testes não se pisarem uns aos outros.
 */
export function criarFonteJson(opcoes: OpcoesFonteJson = {}): FonteDeDados {
  return criarFonteJsonComEstado(opcoes).fonte;
}

/**
 * A mesma fonte, com o estado à mão. Só o `exemplo.ts` a usa, para o modo de
 * teste poder **simular um pedido pago** — o que de outra forma só o Stripe faz.
 * Nada do site lhe chega: o estado não sai daqui para as páginas.
 */
export function criarFonteJsonComEstado(opcoes: OpcoesFonteJson = {}): { fonte: FonteDeDados; estado: EstadoJson } {
  /* O catálogo, a configuração e as definições num estado que o painel
     (`json-painel.ts`) também escreve: o que a gerente grava é o que a loja lê
     a seguir. A ordem do `Map` é a do catálogo, com os produtos novos no fim. */
  const estado: EstadoJson = {
    porId: new Map((opcoes.catalogo ?? CATALOGO_JSON).map((produto) => [produto.id, produto])),
    configuracao: opcoes.configuracao ?? CONFIGURACAO_JSON,
    definicoes: opcoes.definicoes ?? DEFINICOES_JSON,
    pedidos: new Map((opcoes.pedidos ?? []).map((pedido) => [pedido.id, pedido])),
    porReferencia: new Map((opcoes.pedidos ?? []).map((pedido) => [pedido.referencia, pedido.id])),
    versao: 0,
  };
  const { porId, pedidos, porReferencia } = estado;

  /* A chave de idempotência só serve ao criar; não precisa de estar no estado
     partilhado. Os índices guardam o id, e não o pedido: o painel troca o
     pedido por uma cópia quando lhe toca, e um índice com o objeto ficava com a
     versão antiga. */
  const porChave = new Map<string, string>();

  /* A regra é a de `regras.ts`, a mesma que a fonte da base de dados usa. */
  const cotar = (linhas: ReturnType<typeof EsquemaLinhaCesto.parse>[]): Cotacao =>
    cotarLinhas(linhas, (id) => porId.get(id));

  const ocupacaoEntre = (desde: Date, ate: Date): VagaOcupada[] => {
    const contagem = new Map<number, number>();
    for (const pedido of pedidos.values()) {
      const quando = pedido.levantamentoEm.getTime();
      if (!ATIVOS.has(pedido.estado) || quando < desde.getTime() || quando > ate.getTime()) continue;
      contagem.set(quando, (contagem.get(quando) ?? 0) + 1);
    }
    /* Os de exemplo enchem **até** ao limite, e nunca para lá dele: somados aos
       verdadeiros (os pedidos de exemplo do painel, ou um feito agora no site),
       uma hora já cheia ficava com 5 de 4, e o calendário mostrava uma vaga que
       não pode existir. */
    const limite = estado.configuracao.limitePorVaga;
    for (const { inicio, pedidos: n } of opcoes.ocupacaoExtra?.(desde, ate) ?? []) {
      const reais = contagem.get(inicio.getTime()) ?? 0;
      const extra = limite === null ? n : Math.max(0, Math.min(n, limite - reais));
      if (reais + extra > 0) contagem.set(inicio.getTime(), reais + extra);
    }
    return [...contagem].map(([quando, n]) => ({ inicio: new Date(quando), pedidos: n }));
  };

  const loja: FonteLoja = {
    async listarProdutos(filtro = {}) {
      return [...porId.values()].filter(
        (produto) =>
          (filtro.incluirArquivados || !produto.arquivado) &&
          (filtro.origem === undefined || produto.origem === filtro.origem) &&
          (filtro.familia === undefined || produto.familia === filtro.familia) &&
          (filtro.aVendaOnline === undefined || produto.aVendaOnline === filtro.aVendaOnline) &&
          (filtro.apareceNaEmenta === undefined || produto.apareceNaEmenta === filtro.apareceNaEmenta),
      );
    },

    async produtoPorId(id) {
      const produto = porId.get(id);
      return produto && !produto.arquivado ? produto : null;
    },

    async ordemDaEmenta() {
      return { cartas: [...CARTAS], categorias: [...CATEGORIAS], subcategorias: [...SUBCATEGORIAS] };
    },

    async configuracaoDaCasa() {
      return estado.configuracao;
    },

    async definicoesLoja() {
      return estado.definicoes;
    },

    async ocupacao(desde, ate) {
      return ocupacaoEntre(desde, ate);
    },

    async cotarCesto(entrada) {
      const lido = EsquemaLinhaCesto.array().max(50).safeParse(entrada);
      if (!lido.success) return { ok: false, erro: "dados-invalidos" };
      return { ok: true, cotacao: cotar(lido.data) };
    },

    async criarPedido(entrada, { agora, contaId }): Promise<ResultadoCriarPedido> {
      const { configuracao, definicoes } = estado;
      const lido = EsquemaEntradaPedido.safeParse(entrada);
      if (!lido.success) return { ok: false, erro: "dados-invalidos" };
      const dados = lido.data;
      if (dados.armadilha !== "") return { ok: false, erro: "recusado" };

      /* A mesma chave devolve o mesmo pedido, seja qual for o resto: é o que
         impede um duplo clique de pagar duas vezes. */
      const repetido = pedidos.get(porChave.get(dados.chaveIdempotencia) ?? "");
      if (repetido) return { ok: true, pedido: repetido };

      if (definicoes.pausaAte && agora.getTime() < definicoes.pausaAte.getTime()) {
        return { ok: false, erro: "loja-em-pausa" };
      }

      const cotacao = cotar(dados.linhas);
      if (!cotacao.valida) return { ok: false, erro: "artigo-invalido", linhas: cotacao.linhas };
      if (cotacao.semPreco > 0) return { ok: false, erro: "sob-orcamento", linhas: cotacao.linhas };
      if (definicoes.valorMinimoCent !== null && cotacao.totalCent < definicoes.valorMinimoCent) {
        return { ok: false, erro: "abaixo-do-minimo-da-loja" };
      }

      /* Sem a cozinha ou sem um tempo de produção, não há calendário — e um
         pedido sem calendário é uma promessa sem data. */
      const produtos = dados.linhas.map((linha) => porId.get(linha.produtoId)!);
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
        ocupacaoEntre(levantamentoEm, levantamentoEm),
      );
      if (!validacao.ok) return { ok: false, erro: validacao.motivo };

      let referencia = gerarReferencia(agora);
      while (porReferencia.has(referencia)) referencia = gerarReferencia(agora);

      const pedido: Pedido = {
        id: randomUUID(),
        referencia,
        estado: "pendente",
        criadoEm: agora,
        levantamentoEm,
        cliente: { ...dados.cliente, contaId },
        linhas: dados.linhas.map((linha, i) => {
          const produto = produtos[i];
          const variante = produto.variantes.find((v) => v.id === linha.varianteId)!;
          const cotada = cotacao.linhas[i];
          return {
            produtoId: produto.id,
            varianteId: variante.id,
            /* Em português: a língua do pedido ainda não está decidida
               (`pedidos.md` não tem `locale`). */
            nome: produto.nome.pt,
            variante: variante.rotulo?.pt ?? null,
            escolhas: linha.escolhas,
            unidade: produto.unidade,
            quantidade: linha.quantidade,
            precoUnitarioCent: cotada.precoUnitarioCent!,
            totalCent: cotada.totalCent!,
            notas: linha.notas,
          };
        }),
        observacoes: dados.observacoes,
        totalCent: cotacao.totalCent,
        /* O sinal é por produto e o modo de pagamento é por pedido; o cesto misto
           está em aberto. Até haver sinal em algum produto, paga-se tudo. */
        modoPagamento: "total",
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
      };

      pedidos.set(pedido.id, pedido);
      porReferencia.set(referencia, pedido.id);
      porChave.set(dados.chaveIdempotencia, pedido.id);
      estado.versao++;
      return { ok: true, pedido };
    },

    async pedidoPorReferencia(referencia) {
      return pedidos.get(porReferencia.get(referencia) ?? "") ?? null;
    },
  };

  return { fonte: { ...loja, ...criarPainelJson(estado, ocupacaoEntre) }, estado };
}
