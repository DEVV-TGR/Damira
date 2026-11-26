"use server";

import * as dados from "@/lib/dados";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  arquivarProduto,
  cancelarPedido,
  criarProduto,
  editarProduto,
  guardarDefinicoes,
  guardarHorarios,
  guardarOpcoesDoBolo,
  guardarOrdemCategorias,
  listarPedidos,
  pedidoDoPainel,
  reagendarPedido,
  reembolsarPedido,
  responderPedido,
  tratarAviso,
} from "@/lib/dados";
import { ESTADOS_PEDIDO, type AvisoTratavel, type EstadoPedido } from "@/lib/dados/tipos";
import { apagarFotos, fotosQueSairam } from "@/lib/fotos";
import { intervaloDeDias } from "@/lib/painel";
import { comSessao, contextoDoPainel } from "@/lib/painel-servidor";
import { sessao } from "@/lib/sessao-painel";
import { horasDaLoja } from "@/lib/vagas-servidor";
import { caminhoDaProposta } from "@/lib/proposta";
import { enviarDepois } from "@/lib/emails/depois";
import { URL_SITE } from "@/lib/site";

/**
 * # As ações da gestão (`painel-gerente.md`)
 *
 * Passam pelo `comSessao` (o papel sai da sessão, no servidor) e pela fronteira,
 * que as recusa a quem não é gerente (`src/lib/dados/papeis.ts`). As leituras de
 * pedidos são dos dois papéis na fronteira; aqui, a lista com filtros é da
 * gestão, e o balcão tem a sua (`acoes-balcao.ts`).
 */

export type FiltroGestao = {
  estado: EstadoPedido | "todos";
  /** `"2026-10-07"`, dia de Lisboa, ou vazio. */
  desde: string;
  ate: string;
  texto: string;
  cursor: string | null;
};

/** A lista de pedidos da gestão: por estado, por dias de levantamento, por nome ou referência. */
export async function pedidosDaGestao(filtro: FiltroGestao) {
  return comSessao(async (ctx) => {
    if (ctx.papel !== "gerente") return { ok: false, erro: "sem-permissao" } as const;
    const estado = ESTADOS_PEDIDO.includes(filtro.estado as EstadoPedido) ? (filtro.estado as EstadoPedido) : null;
    const dias = intervaloDeDias(filtro.desde || null, filtro.ate || null);
    const texto = filtro.texto.trim();
    return listarPedidos(
      {
        ...(estado ? { estados: [estado] } : {}),
        ...(dias.desde ? { levantamentoDesde: dias.desde } : {}),
        ...(dias.ate ? { levantamentoAte: dias.ate } : {}),
        ...(texto.length >= 2 ? { texto } : {}),
        ordem: "recentes",
        cursor: filtro.cursor,
        limite: 25,
      },
      ctx,
    );
  });
}

export async function detalheDoPedido(id: string) {
  return comSessao((ctx) => pedidoDoPainel(id, ctx));
}

export async function gravarHorarios(entrada: unknown) {
  return comSessao((ctx) => guardarHorarios(entrada, ctx));
}

export async function gravarDefinicoes(entrada: unknown) {
  return comSessao((ctx) => guardarDefinicoes(entrada, ctx));
}

// ——— As decisões da gerente (`pedidos.md`) ———
// Todas mudam um pedido: avisam o polling, e o balcão vê-as na volta seguinte.

/**
 * Pede o envio da fila depois de uma decisão que pode ter gravado emails, e só se
 * ficou gravada: a fronteira põe-nos na fila na mesma instrução que muda o pedido,
 * e um email nunca sai de uma mudança que falhou. Sem emails novos, o emissor lê a
 * fila e não envia nada — a base já estava acordada pela decisão.
 *
 * O cancelar e o reagendar ainda não gravam emails (o T11, o T12 e o T09 são da
 * fonte, `fluxo-do-pedido.md` › 6, ponto 5); ficam já ligados para esse PR só ter
 * de mexer na fronteira.
 */
async function eEnviaEmails<T extends { ok: boolean }>(resultado: Promise<T>): Promise<T> {
  const lido = await resultado;
  if (lido.ok) enviarDepois();
  return lido;
}

/** «Aceitar», «manter neste dia», «já devolvi»: o facto fica, o aviso sai. */
export async function tratar(id: string, tipo: AvisoTratavel) {
  return comSessao((ctx) => tratarAviso(id, tipo, ctx), true);
}

export async function reagendar(id: string, levantamentoEm: string) {
  return eEnviaEmails(comSessao((ctx) => reagendarPedido(id, levantamentoEm, ctx), true));
}

export async function cancelar(id: string, reembolsoCent: number) {
  return eEnviaEmails(comSessao((ctx) => cancelarPedido(id, reembolsoCent, ctx), true));
}

export async function reembolsar(id: string, valorCent: number) {
  return comSessao((ctx) => reembolsarPedido(id, valorCent, ctx), true);
}

/**
 * A resposta a um pedido que espera pela casa: confirmar, ou propor preço e hora
 * (`responderPedido`). A fronteira deixa o balcão confirmar e só a gerente propor.
 */
export async function responder(id: string, entrada: unknown) {
  return eEnviaEmails(comSessao((ctx) => responderPedido(id, entrada, ctx), true));
}

/**
 * O link da proposta, para a gerente o mandar ao cliente à mão (WhatsApp, SMS) enquanto o
 * email da proposta não sai sozinho (o emissor ainda não escreve o link: `fluxo-do-pedido.md`
 * › 6, ponto 4). Só a gerente, e só de um pedido à espera do aceite.
 * Assina-o o servidor; o browser nunca vê a chave.
 */
export async function linkDaProposta(id: string) {
  const ctx = await soGerente();
  if (!ctx) return { ok: false as const, erro: "sem-permissao" as const };
  const lido = await pedidoDoPainel(id, ctx);
  if (!lido.ok) return lido;
  if (lido.valor.estado !== "a-aguardar-aceite") return { ok: false as const, erro: "estado-mudou" as const };
  /* Sem a `PROPOSTA_SEGREDO` o link não se assina: o painel não mostra o link, em vez de rebentar. */
  try {
    return { ok: true as const, valor: `${URL_SITE}${caminhoDaProposta(lido.valor.referencia, lido.valor.propostaVersao)}` };
  } catch {
    console.error("[proposta] o link não se assinou: falta a PROPOSTA_SEGREDO?");
    return { ok: false as const, erro: "dados-invalidos" as const };
  }
}

/** As horas da loja num dia, para mudar o levantamento. Só para a gerente. */
export async function horasParaMudar(data: string) {
  const ctx = await contextoDoPainel();
  if (ctx?.papel !== "gerente") return [];
  return horasDaLoja(data, dados, ctx.agora);
}

// ——— Produtos (#40) ———

/**
 * ⚠️ **Mudar um produto tem efeito em três sítios** (`painel-gerente.md`): as
 * páginas são estáticas, e sem revalidar o site mostrava o preço antigo durante
 * horas. O checkout já cobra o novo (lê sempre da fonte), e o cesto de quem já
 * o tinha avisa que o preço mudou.
 */
export async function gravarProduto(id: string | null, entrada: unknown) {
  /* Antes de gravar, para saber que fotos saem. Quem pode gravar decide-o a
     fronteira, a seguir: isto só lê um produto público. */
  const antes = id ? await dados.produtoPorId(id) : null;
  const resultado = await comSessao((ctx) => (id ? editarProduto(id, entrada, ctx) : criarProduto(entrada, ctx)));
  if (resultado.ok) {
    revalidatePath("/", "layout");
    /* Depois de gravar, e nunca antes: um produto a apontar para uma foto apagada
       é pior do que uma foto esquecida no Blob. */
    const sairam = fotosQueSairam(antes?.fotos ?? [], resultado.valor.fotos);
    if (sairam.length > 0) {
      /* ⚠️ Uma foto que uma escolha ainda mostra fica no Blob (#88): a variância
         pode estar ligada a outro produto, que continua a apontar para ela. Só
         se lê o catálogo quando há fotos a apagar. */
      const emUso = new Set(
        (await dados.listarProdutos({ incluirArquivados: true })).flatMap((p) =>
          p.variancias.flatMap((v) => v.escolhas.flatMap((e) => (e.foto ? [e.foto] : []))),
        ),
      );
      await apagarFotos(sairam.filter((foto) => !emUso.has(foto)));
    }
  }
  return resultado;
}

/** «Apagar» no painel. Os pedidos antigos continuam a apontar para ele. */
export async function arquivar(id: string, arquivado: boolean) {
  const resultado = await comSessao((ctx) => arquivarProduto(id, arquivado, ctx));
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}

// ——— A ordem das categorias (#87) ———

/**
 * A ordem por que as categorias aparecem na ementa e nas encomendas. Como um
 * produto, muda páginas estáticas: sem revalidar, o site continuava na ordem
 * antiga até ao próximo deploy.
 */
export async function gravarOrdemCategorias(categorias: string[]) {
  const resultado = await comSessao((ctx) => guardarOrdemCategorias({ categorias }, ctx));
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}

/**
 * As opções do bolo personalizado. A página do bolo é estática: sem revalidar,
 * o site mostrava as opções antigas até ao deploy seguinte.
 */
export async function gravarOpcoesDoBolo(opcoes: unknown) {
  const resultado = await comSessao((ctx) => guardarOpcoesDoBolo(opcoes, ctx));
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}

// ——— Equipa e dispositivos (`painel.md`) ———
// ⚠️ Só a gerente: o papel lê-se da sessão aqui, antes de chegar à entrada.

async function soGerente() {
  const ctx = await contextoDoPainel();
  return ctx?.papel === "gerente" ? ctx : null;
}

export async function sessoesDaEquipa() {
  const ctx = await soGerente();
  if (!ctx) return { ok: false as const, erro: "sem-permissao" as const };
  return { ok: true as const, valor: await sessao.listarSessoes(ctx.agora), provisoria: sessao.provisoria };
}

export async function terminarSessao(id: string) {
  const ctx = await soGerente();
  if (!ctx) return { ok: false as const, erro: "sem-permissao" as const };
  return sessao.terminarSessao(id, ctx.agora);
}

/** Muda o PIN e fecha as sessões da equipa: é assim que se tira o acesso a quem saiu. */
export async function mudarPinDaEquipa(novo: string) {
  const ctx = await soGerente();
  if (!ctx) return { ok: false as const, erro: "sem-permissao" as const };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return sessao.mudarPin(novo, { agora: ctx.agora, ip });
}
