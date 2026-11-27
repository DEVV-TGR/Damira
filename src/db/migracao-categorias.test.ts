import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { eq, getTableColumns, type Table } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, describe, expect, it } from "vitest";
import { criarFonteBd } from "@/lib/dados/bd";
import { EsquemaProduto, type OrdemEmenta } from "@/lib/dados/tipos";
import { casaParaLinha, lerCatalogo, produtoParaLinhas } from "./catalogo";
import { categoriasDoCatalogo } from "./categorias";
import { casa, categorias, familias, produtos, variantes } from "./esquema";
import { importarCatalogo, origemDosJson, type OrigemDoCatalogo } from "./importar-catalogo";
import { loteEmTransacao } from "./lote";
import { baseDeTeste, catalogoDeTeste, recusado } from "./teste";

/**
 * # A migração `0008` e as categorias da gerente (#124)
 *
 * A conta das categorias existe duas vezes: em SQL, na `0008`, para os produtos
 * que já estão na Neon; e em TypeScript (`categorias.ts`), para a importação e
 * para o painel até a fronteira ler as colunas novas. Aqui o catálogo entra
 * pelos dois caminhos — uma base parada na `0007` que depois migra, e uma base
 * migrada que importa — e as duas têm de acabar iguais.
 */

const MIGRACOES = fileURLToPath(new URL("./migracoes", import.meta.url));

/* Uma cópia da pasta das migrações que acaba na `0007`, como no teste da `0005`. */
const ate0007 = await mkdtemp(join(tmpdir(), "migracoes-"));
await cp(MIGRACOES, ate0007, { recursive: true });
const diario = join(ate0007, "meta", "_journal.json");
const lido = JSON.parse(await readFile(diario, "utf8")) as {
  entries: { tag: string }[];
};
lido.entries = lido.entries.slice(
  0,
  lido.entries.findIndex((e) => e.tag.startsWith("0008_")),
);
await writeFile(diario, JSON.stringify(lido));

afterAll(() => rm(ate0007, { recursive: true, force: true }));

const ORIGEM = await origemDosJson();

/**
 * Uma linha em SQL, só com as colunas que a tabela tinha antes da `0008`. ⚠️ Não
 * pelo `db.insert`: o Drizzle já conhece as colunas novas e escrevia-as numa
 * tabela que ainda não as tem.
 */
async function inserirComoAntes(cliente: PGlite, tabela: Table, linha: Record<string, unknown>) {
  const colunas = getTableColumns(tabela);
  /* As da `0008` e as da `0011` (#88), que a base parada na `0007` ainda não tem. */
  const pares = Object.entries(linha).filter(([chave]) => !["categoriaId", "tipo", "opcoes", "ativa"].includes(chave));
  const nomes = pares.map(([chave]) => `"${colunas[chave].name}"`).join(", ");
  const marcas = pares.map((_, i) => `$${i + 1}`).join(", ");
  /* Os `jsonb` vão em texto: é como o Postgres os recebe. */
  const valores = pares.map(([chave, valor]) =>
    colunas[chave].getSQLType() === "jsonb" ? JSON.stringify(valor) : valor,
  );
  const nome = (tabela as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")];
  await cliente.query(`insert into "${nome}" (${nomes}) values (${marcas})`, valores);
}

/** O catálogo numa base parada na `0007`, e depois a `0008` por cima — como na Neon. */
async function pelaMigracao(origem: OrigemDoCatalogo) {
  const cliente = new PGlite();
  const db = drizzle(cliente);
  await migrate(db, { migrationsFolder: ate0007 });
  for (const [i, produto] of origem.catalogo.entries()) {
    const linhas = produtoParaLinhas(produto, i);
    await inserirComoAntes(cliente, produtos, linhas.produto);
    for (const variante of linhas.variantes) await inserirComoAntes(cliente, variantes, variante);
  }
  await inserirComoAntes(cliente, casa, casaParaLinha(origem.casa));
  await migrate(db, { migrationsFolder: MIGRACOES });
  return { db, cliente };
}

/** O catálogo importado numa base já migrada — a importação e o painel. */
async function pelaImportacao(origem: OrigemDoCatalogo) {
  const { db, cliente } = await baseDeTeste();
  await importarCatalogo(db, origem);
  return { db, cliente };
}

async function oQueFicou(cliente: PGlite) {
  const lidas = await cliente.query<{
    id: string;
    nome_pt: string;
    nome_en: string | null;
    posicao: number;
    arquivada: boolean;
  }>("select * from categorias order by posicao, id");
  const deProdutos = await cliente.query<{
    id: string;
    categoria_id: string;
    tipo: string;
  }>("select id, categoria_id, tipo from produtos order by id");
  return { categorias: lidas.rows, produtos: deProdutos.rows };
}

async function osDoisCaminhos(origem: OrigemDoCatalogo) {
  const migrada = await pelaMigracao(origem);
  const importada = await pelaImportacao(origem);
  try {
    const daMigracao = await oQueFicou(migrada.cliente);
    expect(daMigracao).toEqual(await oQueFicou(importada.cliente));
    return daMigracao;
  } finally {
    await migrada.cliente.close();
    await importada.cliente.close();
  }
}

/* O mesmo catálogo com a ordem que a gerente pode ter gravado (#87). */
const comOrdem = (ordem: Partial<OrdemEmenta>): OrigemDoCatalogo => ({
  ...ORIGEM,
  casa: { ...ORIGEM.casa, ordem: { ...ORIGEM.casa.ordem, ...ordem } },
});

describe("a 0008 sobre os 107 produtos", () => {
  it("dá as mesmas categorias e os mesmos tipos que a importação", async () => {
    const { categorias: lidas, produtos: deProdutos } = await osDoisCaminhos(ORIGEM);

    /* O inventário da #124: doze categorias, as da `/encomendas` à frente. */
    expect(lidas.map((c) => [c.id, c.nome_pt, c.nome_en])).toEqual([
      ["festas", "Kit Festas", "Party Kits"],
      ["kits-bolo", "Bolo e mesa decorada", "Cake and decorated table"],
      ["boxes", "Boxes para dias especiais", "Boxes for special days"],
      ["casa-pausa", "Para uma pausa", "Light bites"],
      ["casa-salgados", "Salgados", "Savouries"],
      ["casa-doces", "Doces", "Pastries"],
      ["casa-bebidas", "Bebidas", "Drinks"],
      ["fim-de-semana-pratos", "Pratos de fim de semana", "Weekend plates"],
      ["vegan-salgados", "Salgados vegan", "Vegan savouries"],
      ["vegan-doces", "Doces vegan", "Vegan pastries"],
      ["vegan-bolos-inteiros", "Bolos inteiros vegan", "Vegan whole cakes"],
      ["chocolate-formatos", "Chocolate do Dubai", "Dubai Chocolate"],
    ]);
    expect(lidas.map((c) => c.posicao)).toEqual([...lidas.keys()]);

    /* Compostos são os onze kits e boxes; o bolo por medida é simples (as massas
       e os recheios dele são escolhas, que a #88 passa a grupos de opções). */
    const compostos = deProdutos.filter((p) => p.tipo === "composto").map((p) => p.id);
    expect(compostos).toHaveLength(11);
    expect(compostos).not.toContain("bolo-por-medida");
    expect(deProdutos.find((p) => p.id === "bolo-por-medida")?.categoria_id).toBe("kits-bolo");
  });

  it("segue a ordem que a gerente gravou, e não a do impresso", async () => {
    const { categorias: lidas } = await osDoisCaminhos(
      comOrdem({
        categorias: ["doces", "bebidas", "salgados", "pausa", "pratos", "bolos-inteiros", "formatos"],
      }),
    );
    expect(lidas.slice(3, 7).map((c) => c.id)).toEqual(["casa-doces", "casa-bebidas", "casa-salgados", "casa-pausa"]);
  });

  it("um artigo numa carta e categoria que só ele usa ganha a sua, com nome", async () => {
    /* O que a gerente pode ter feito no editor: o bolo de cenoura nos bolos
       inteiros da carta da casa. */
    const catalogo = ORIGEM.catalogo.map((p) =>
      p.id === "bolo-de-cenoura" ? EsquemaProduto.parse({ ...p, categoria: "bolos-inteiros" }) : p,
    );
    const { categorias: lidas } = await osDoisCaminhos({ ...ORIGEM, catalogo });
    expect(lidas.find((c) => c.id === "casa-bolos-inteiros")).toMatchObject({
      nome_pt: "Bolos inteiros",
      nome_en: "Whole cakes",
    });
  });
});

describe("as regras da tabela", () => {
  const categoria = { id: "natal", nomePt: "Natal", nomeEn: null, posicao: 20, familiaId: "da-ementa" };

  it("recusa um nome em branco, comprido demais, ou igual ao de outra em uso", async () => {
    const { db, cliente } = await pelaImportacao(ORIGEM);
    try {
      expect(await recusado(db.insert(categorias).values({ ...categoria, nomePt: "  " }))).toBe("categorias_nome_pt");
      expect(await recusado(db.insert(categorias).values({ ...categoria, nomePt: "x".repeat(61) }))).toBe(
        "categorias_nome_pt",
      );
      expect(await recusado(db.insert(categorias).values({ ...categoria, nomeEn: "" }))).toBe("categorias_nome_en");
      expect(await recusado(db.insert(categorias).values({ ...categoria, id: "Natal" }))).toBe("categorias_id_formato");
      expect(await recusado(db.insert(categorias).values({ ...categoria, posicao: -1 }))).toBe("categorias_posicao");
      /* «doces» é o «Doces» da carta da casa, sem distinguir maiúsculas. */
      expect(await recusado(db.insert(categorias).values({ ...categoria, nomePt: "doces" }))).toBe(
        "categorias_nome_unico",
      );
      /* Noutra família, o mesmo nome entra (26/11): uns «Doces» no Natal. */
      await db.insert(categorias).values({ ...categoria, nomePt: "Doces", familiaId: "natal" });
      expect(await recusado(db.insert(categorias).values({ ...categoria, id: "outra", familiaId: "nao-existe" }))).toBe(
        "categorias_familia_id_familias_id_fk",
      );
    } finally {
      await cliente.close();
    }
  });

  it("uma arquivada não ocupa o nome, e uma com produtos não se apaga", async () => {
    const { db, cliente } = await pelaImportacao(ORIGEM);
    try {
      await db.insert(categorias).values({ ...categoria, arquivada: true });
      await db.insert(categorias).values({ ...categoria, id: "natal-2027" });
      expect(await recusado(db.delete(categorias).where(eq(categorias.id, "festas")))).toBe(
        "produtos_categoria_id_categorias_id_fk",
      );
      /* Uma sem produtos apaga-se. */
      await db.delete(categorias).where(eq(categorias.id, "natal"));
    } finally {
      await cliente.close();
    }
  });

  it("um produto não tem outro tipo nem uma categoria que não existe", async () => {
    const { db, cliente } = await pelaImportacao(ORIGEM);
    try {
      expect(await recusado(db.update(produtos).set({ tipo: "kit" }).where(eq(produtos.id, "vegan-nata")))).toBe(
        "produtos_tipo",
      );
      expect(
        await recusado(db.update(produtos).set({ categoriaId: "nao-existe" }).where(eq(produtos.id, "vegan-nata"))),
      ).toBe("produtos_categoria_id_categorias_id_fk");
    } finally {
      await cliente.close();
    }
  });
});

describe("a 0012 e as famílias (26/11)", () => {
  it("dá as mesmas famílias que a importação, com as âncoras de hoje e o Natal vazio", async () => {
    const migrada = await pelaMigracao(ORIGEM);
    const importada = await pelaImportacao(ORIGEM);
    try {
      const ler = async (cliente: PGlite) => ({
        familias: (await cliente.query("select * from familias order by posicao, id")).rows,
        categorias: (await cliente.query("select id, familia_id from categorias order by id")).rows,
      });
      const daMigracao = await ler(migrada.cliente);
      expect(daMigracao).toEqual(await ler(importada.cliente));

      expect(daMigracao.familias.map((f) => (f as { id: string }).id)).toEqual([
        "festas",
        "kits-bolo",
        "boxes",
        "da-ementa",
        "natal",
      ]);
      const familiaDe = new Map(
        daMigracao.categorias.map((c) => [(c as { id: string }).id, (c as { familia_id: string }).familia_id]),
      );
      expect(familiaDe.get("festas")).toBe("festas");
      expect(familiaDe.get("kits-bolo")).toBe("kits-bolo");
      expect(familiaDe.get("boxes")).toBe("boxes");
      expect(familiaDe.get("vegan-doces")).toBe("da-ementa");
      expect([...familiaDe.values()]).not.toContain("natal");
    } finally {
      await migrada.cliente.close();
      await importada.cliente.close();
    }
  });

  it("não mexe no nome nem na posição de nenhuma categoria", async () => {
    /* O que a `0008` deixou é o que fica: a `0012` só acrescenta a família. */
    const { categorias: lidas } = await osDoisCaminhos(ORIGEM);
    expect(lidas.map((c) => c.posicao)).toEqual([...lidas.keys()]);
  });

  it("recusa um nome de família em branco ou repetido, e uma família com categorias não se apaga", async () => {
    const { db, cliente } = await pelaImportacao(ORIGEM);
    const familia = { id: "pascoa", nomePt: "Páscoa", nomeEn: null, posicao: 5 };
    try {
      expect(await recusado(db.insert(familias).values({ ...familia, nomePt: " " }))).toBe("familias_nome_pt");
      expect(await recusado(db.insert(familias).values({ ...familia, nomePt: "NATAL" }))).toBe("familias_nome_unico");
      expect(await recusado(db.insert(familias).values({ ...familia, id: "Páscoa" }))).toBe("familias_id_formato");
      expect(await recusado(db.delete(familias).where(eq(familias.id, "festas")))).toBe(
        "categorias_familia_id_familias_id_fk",
      );
      /* O Natal não tem categorias: apaga-se. */
      await db.delete(familias).where(eq(familias.id, "natal"));
    } finally {
      await cliente.close();
    }
  });

  it("o código de antes da 0012 ainda grava uma categoria da carta, que vai para a da-ementa", async () => {
    /* Entre a migração no production e o deploy, o `categoriaNova` antigo
       insere sem `familia_id` (revisão do Sobral ao #161). SQL e não o
       `db.insert`: o Drizzle de hoje já conhece a coluna e escrevia-a. */
    const { db, cliente } = await pelaImportacao(ORIGEM);
    try {
      await cliente.query(
        `insert into categorias (id, nome_pt, nome_en, posicao) values ('casa-bolos-inteiros', 'Bolos inteiros', 'Whole cakes', 12)
         on conflict (id) do nothing`,
      );
      const [lida] = await db.select().from(categorias).where(eq(categorias.id, "casa-bolos-inteiros"));
      expect(lida.familiaId).toBe("da-ementa");
    } finally {
      await cliente.close();
    }
  });
});

const modelo = await catalogoDeTeste();
afterAll(() => modelo.fechar());

describe("o painel, até a fronteira ler as categorias", () => {
  it("pôr um artigo numa carta e categoria nova cria a categoria, no fim", async () => {
    const { db, cliente } = await modelo.copia();
    try {
      const fonte = criarFonteBd(db, loteEmTransacao(db));
      const atual = (await lerCatalogo(db)).find((p) => p.id === "bolo-de-cenoura")!;
      /* O que a gerente vê ao abrir o produto: sem o id e os interruptores do balcão. */
      const entrada = EsquemaProduto.omit({
        id: true,
        arquivado: true,
        foraDeVenda: true,
        esgotadoNoDia: true,
      }).parse(atual);
      const editado = await fonte.editarProduto(
        "bolo-de-cenoura",
        {
          ...entrada,
          alergenios: entrada.alergenios ?? [],
          categoria: "bolos-inteiros",
        },
        { papel: "gerente", agora: new Date() },
      );
      expect(editado.ok).toBe(true);

      const lidas = await db.select().from(categorias).orderBy(categorias.posicao);
      expect(lidas.at(-1)).toMatchObject({
        id: "casa-bolos-inteiros",
        nomePt: "Bolos inteiros",
        posicao: 12,
      });
      const [produto] = await db.select().from(produtos).where(eq(produtos.id, "bolo-de-cenoura"));
      expect(produto.categoriaId).toBe("casa-bolos-inteiros");

      /* Voltar atrás não cria nada nem mexe na que ficou. */
      await fonte.editarProduto(
        "bolo-de-cenoura",
        { ...entrada, alergenios: entrada.alergenios ?? [] },
        { papel: "gerente", agora: new Date() },
      );
      expect(await db.$count(categorias)).toBe(13);
    } finally {
      await cliente.close();
    }
  });

  it("a importação e a conta em TypeScript dão as mesmas posições", () => {
    expect(categoriasDoCatalogo(ORIGEM.catalogo, ORIGEM.casa.ordem).map((c) => c.posicao)).toEqual([
      ...Array(12).keys(),
    ]);
  });
});
