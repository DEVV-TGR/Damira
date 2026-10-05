import { isDeepStrictEqual } from "node:util";
import { count } from "drizzle-orm";
import { CATALOGO_JSON, CONFIGURACAO_JSON, criarFonteJson } from "@/lib/dados/json";
import { EsquemaProduto, type Produto } from "@/lib/dados/tipos";
import {
  casaParaLinha,
  lerCasa,
  lerCatalogo,
  produtoParaLinhas,
  type BaseDeDados,
  type DadosDaCasa,
} from "./catalogo";
import { casa, produtos, variantes } from "./esquema";

/**
 * # A migração do catálogo, JSON → base de dados (#28)
 *
 * Corre **uma vez**: grava o catálogo e a casa numa base de dados vazia, e
 * depois compara o que ficou lá com o que entrou, campo a campo.
 *
 * O que entra é o `CATALOGO_JSON` do `json.ts` — o catálogo que o site mostra
 * hoje, já em cêntimos. A conversão de euros fez-a ele, e rebenta em vez de
 * arredondar; os testes dele comparam-no com os JSON crus. A cadeia fica
 * fechada: JSON cru → `CATALOGO_JSON` (testado lá) → base de dados → lido de
 * volta = `CATALOGO_JSON` (testado aqui).
 *
 * ⚠️ **Os dados de exemplo nunca entram** (`docs/loja/base-de-dados.md`): a
 * configuração é a do `CONFIGURACAO_JSON`, com a cozinha a `null`, e não a do
 * modo de teste.
 */

export type OrigemDoCatalogo = {
  catalogo: readonly Produto[];
  casa: DadosDaCasa;
};

/**
 * O que sai dos JSON de hoje: o catálogo, a configuração sem cozinha, as
 * definições por defeito (tudo desligado) e a ordem da ementa. Lido pela fonte
 * dos JSON, pela mesma interface que as páginas usam.
 */
export async function origemDosJson(): Promise<OrigemDoCatalogo> {
  const fonte = criarFonteJson();
  return {
    catalogo: CATALOGO_JSON,
    casa: {
      configuracao: CONFIGURACAO_JSON,
      definicoes: await fonte.definicoesLoja(),
      ordem: await fonte.ordemDaEmenta(),
    },
  };
}

/**
 * Grava o catálogo e a casa, tudo ou nada.
 *
 * ⚠️ **Recusa-se a correr sobre uma base de dados com produtos.** A partir de
 * 14/10 a gerente edita os produtos no painel; uma segunda importação apagava
 * o que ela fez sem ninguém dar por isso. Se for mesmo preciso recomeçar, é um
 * ramo novo da Neon, vazio — nunca por cima.
 *
 * Usa uma transação interativa (ler se está vazia, depois escrever). Serve a
 * uma tarefa que corre uma vez, à mão: na Neon corre com o driver de
 * WebSockets, e não com o HTTP do site, que não as faz.
 */
export async function importarCatalogo(db: BaseDeDados, origem: OrigemDoCatalogo) {
  const catalogo = EsquemaProduto.array().parse(origem.catalogo);
  const linhas = catalogo.map((produto, i) => produtoParaLinhas(produto, i));

  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(produtos);
    const [{ n: casas }] = await tx.select({ n: count() }).from(casa);
    if (n > 0 || casas > 0) {
      throw new Error(
        `src/db/importar-catalogo.ts: a base de dados já tem ${n} produtos e ${casas} casa — ` +
          "a importação só corre sobre uma base de dados vazia.",
      );
    }

    await tx.insert(produtos).values(linhas.map((l) => l.produto));
    await tx.insert(variantes).values(linhas.flatMap((l) => l.variantes));
    await tx.insert(casa).values(casaParaLinha(origem.casa));

    return { produtos: linhas.length, variantes: linhas.reduce((soma, l) => soma + l.variantes.length, 0) };
  });
}

/**
 * O que difere entre a base de dados e a origem, uma linha por diferença.
 * Vazio é a migração certa. Compara a ordem, cada campo de cada produto, e a
 * casa — o mesmo que as páginas vão ler.
 */
export async function compararCatalogo(db: BaseDeDados, origem: OrigemDoCatalogo): Promise<string[]> {
  const diferencas: string[] = [];
  const lidos = await lerCatalogo(db);
  const porId = new Map(lidos.map((p) => [p.id, p]));

  for (const esperado of origem.catalogo) {
    const lido = porId.get(esperado.id);
    if (!lido) {
      diferencas.push(`${esperado.id}: não está na base de dados`);
      continue;
    }
    for (const campo of Object.keys(esperado) as (keyof Produto)[]) {
      if (!isDeepStrictEqual(lido[campo], esperado[campo])) {
        diferencas.push(`${esperado.id}.${campo}: ${JSON.stringify(lido[campo])} ≠ ${JSON.stringify(esperado[campo])}`);
      }
    }
  }
  const esperados = new Set(origem.catalogo.map((p) => p.id));
  for (const lido of lidos) {
    if (!esperados.has(lido.id)) diferencas.push(`${lido.id}: está na base de dados e não na origem`);
  }
  /* A ordem também é um dado: é a do catálogo, que as páginas mostram. */
  if (diferencas.length === 0 && !isDeepStrictEqual(lidos.map((p) => p.id), origem.catalogo.map((p) => p.id))) {
    diferencas.push("a ordem dos produtos não é a da origem");
  }

  const casaLida = await lerCasa(db);
  if (!casaLida) {
    diferencas.push("casa: não está na base de dados");
  } else {
    for (const parte of ["configuracao", "definicoes", "ordem"] as const) {
      if (!isDeepStrictEqual(casaLida[parte], origem.casa[parte])) diferencas.push(`casa.${parte} difere`);
    }
  }
  return diferencas;
}
