import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { HorarioSemanal } from "@/lib/horarios";
import { casa, produtos, variantes } from "./esquema";

/**
 * # As regras que a base de dados faz cumprir
 *
 * Corre as migrações verdadeiras (`src/db/migracoes/`) num PGlite — um Postgres
 * dentro do Node, sem conta nem rede — e confirma os dois lados: o que é válido
 * entra, e cada `CHECK` recusa o que é para recusar. Se alguém mudar o esquema
 * e uma regra desaparecer, é aqui que se dá por isso.
 *
 * Cada teste corre dentro de uma transação desfeita no fim: começam todos com
 * as tabelas vazias, sem criar uma base de dados por teste.
 */

const cliente = new PGlite();
const db = drizzle(cliente);

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("./migracoes", import.meta.url)) });
});
afterAll(() => cliente.close());
beforeEach(() => cliente.exec("begin"));
afterEach(() => cliente.exec("rollback"));

/* O Drizzle embrulha o erro do Postgres; o nome da regra que falhou está na
   causa. Confirmar o nome, e não só que falhou, é o que garante que foi esta
   regra a recusar — e não outra coisa partida pelo caminho. */
async function recusado(escrita: Promise<unknown>): Promise<string> {
  try {
    await escrita;
  } catch (erro) {
    const causa = (erro as { cause?: { constraint?: string } }).cause;
    return causa?.constraint ?? `sem regra: ${String(erro)}`;
  }
  throw new Error("a base de dados aceitou o que devia recusar");
}

// ——— O que se grava ———

const NATA = {
  id: "nata",
  posicao: 1,
  origem: "ementa",
  familia: "ementa",
  nomePt: "Pastel de nata",
  nomeEn: "Custard tart",
  carta: "casa",
  categoria: "doces",
  unidade: "un",
  quantidadeMinima: 6,
  multiplo: 6,
  aVendaOnline: true,
  apareceNaEmenta: true,
} satisfies typeof produtos.$inferInsert;

const KIT = {
  id: "festa-premium",
  posicao: 2,
  origem: "encomendas",
  familia: "festa",
  nomePt: "Kit Premium",
  unidade: "un",
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: true,
  apareceNaEmenta: false,
} satisfies typeof produtos.$inferInsert;

const ABERTA = [{ abre: "08:00", fecha: "19:00" }];
const SEMANA: HorarioSemanal = {
  domingo: [],
  segunda: ABERTA,
  terca: ABERTA,
  quarta: ABERTA,
  quinta: ABERTA,
  sexta: ABERTA,
  sabado: ABERTA,
};

const CASA = {
  horarioLoja: SEMANA,
  duracaoVagaMinutos: 30,
  diasAFrente: 30,
  limiarLivre: 25,
  limiarMedia: 50,
  ordemEmenta: { cartas: ["casa"], categorias: ["doces"], subcategorias: [] },
} satisfies typeof casa.$inferInsert;

// ——— O que entra ———

describe("o que é válido entra", () => {
  it("um artigo da ementa, com a variante única", async () => {
    await db.insert(produtos).values(NATA);
    await db.insert(variantes).values({ produtoId: "nata", id: "unica", posicao: 0, precoCent: 140 });

    const [lido] = await db.select().from(produtos).where(eq(produtos.id, "nata"));
    expect(lido.quantidadeMinima).toBe(6);
    expect(lido.escolhas).toEqual([]);
    expect(lido.arquivado).toBe(false);
  });

  it("os alergénios guardam os três estados, sem confundir «por responder» com «sem nenhum»", async () => {
    await db.insert(produtos).values([
      { ...NATA, id: "por-responder", alergenios: null },
      { ...NATA, id: "sem-nenhum", alergenios: [] },
      { ...NATA, id: "com-lista", alergenios: ["gluten", "ovo"] },
    ]);

    const lidos = await db.select({ id: produtos.id, alergenios: produtos.alergenios }).from(produtos);
    expect(Object.fromEntries(lidos.map((p) => [p.id, p.alergenios]))).toEqual({
      "por-responder": null,
      "sem-nenhum": [],
      "com-lista": ["gluten", "ovo"],
    });
  });

  it("ao quilo, meio quilo continua a ser meio quilo", async () => {
    await db.insert(produtos).values({ ...NATA, id: "bolo-vegan", unidade: "kg", quantidadeMinima: 0.5, multiplo: 0.5 });

    const [lido] = await db.select().from(produtos).where(eq(produtos.id, "bolo-vegan"));
    expect(lido.quantidadeMinima).toBe(0.5);
  });

  it("um kit com escalões, a composição inteira e um sob orçamento", async () => {
    await db.insert(produtos).values(KIT);
    const composicao = [
      { grupo: "salgados" as const, linhas: [{ nome: { pt: "Rissóis", en: null }, quantidade: { pt: "20", en: null } }] },
    ];
    await db.insert(variantes).values([
      { produtoId: "festa-premium", id: "20", posicao: 0, pessoas: 20, precoCent: 33500, composicao },
      /* `NULL` é sob orçamento, e tem de entrar — não é zero. */
      { produtoId: "festa-premium", id: "70", posicao: 1, pessoas: 70, precoCent: null },
    ]);

    const lidas = await db.select().from(variantes).orderBy(variantes.posicao);
    expect(lidas.map((v) => v.precoCent)).toEqual([33500, null]);
    expect(lidas[0].composicao).toEqual(composicao);
  });

  it("à venda online com os alergénios por responder entra, de propósito", async () => {
    /* É uma regra de gravar no painel, e não de todas as linhas: 70 artigos
       estão hoje assim, e a migração tem de os trazer (ver `esquema.ts`). */
    await db.insert(produtos).values({ ...NATA, aVendaOnline: true, alergenios: null });
  });

  it("a casa, com a cozinha ainda por dar", async () => {
    await db.insert(casa).values(CASA);

    const [lida] = await db.select().from(casa);
    expect(lida.id).toBe(1);
    expect(lida.horarioCozinha).toBeNull();
    expect(lida.horarioLoja).toEqual(SEMANA);
    expect(lida.versaoPedidos).toBe(0);
  });
});

// ——— O que se recusa ———

describe("cada regra recusa o que é para recusar", () => {
  it.each([
    ["um código com maiúsculas", { id: "Nata" }, "produtos_id_formato"],
    /* Com a família de fora da ementa, para só esta regra falhar: um artigo da
       ementa com outra origem também partia a `produtos_familia_da_origem`. */
    ["uma origem que não existe", { origem: "vitrine", familia: "festa" }, "produtos_origem"],
    ["uma família que não existe", { familia: "pao" }, "produtos_familia"],
    ["a família da ementa com a origem das encomendas", { origem: "encomendas" }, "produtos_familia_da_origem"],
    ["um artigo da ementa sem carta", { carta: null }, "produtos_ementa_com_carta"],
    ["uma unidade que não existe", { unidade: "duzia" }, "produtos_unidade"],
    ["uma descrição só em inglês", { descricaoEn: "Only English" }, "produtos_descricao_pt"],
    ["um tempo de produção sem valor", { tempoProducaoUnidade: "horas" }, "produtos_tempo_producao_par"],
    ["um tempo de produção sem unidade", { tempoProducaoValor: 3 }, "produtos_tempo_producao_par"],
    ["um tempo em semanas", { tempoProducaoUnidade: "semanas", tempoProducaoValor: 1 }, "produtos_tempo_producao"],
    ["um tempo negativo", { tempoProducaoUnidade: "dias", tempoProducaoValor: -1 }, "produtos_tempo_producao"],
    ["um mínimo de zero", { quantidadeMinima: 0 }, "produtos_minimo_e_multiplo"],
    ["um sinal de 0 %", { sinalPercent: 0 }, "produtos_sinal"],
    ["um sinal acima de 100 %", { sinalPercent: 101 }, "produtos_sinal"],
    ["um limite sem modo", { limiteQuantidade: 30 }, "produtos_limite_par"],
    ["um limite de zero", { limiteQuantidade: 0, limiteModo: "porDia" }, "produtos_limite"],
    ["um limite por semana", { limiteQuantidade: 30, limiteModo: "porSemana" }, "produtos_limite"],
  ] as const)("produto: %s", async (_, mudanca, regra) => {
    expect(await recusado(db.insert(produtos).values({ ...NATA, ...mudanca }))).toBe(regra);
  });

  it.each([
    ["um preço negativo", { precoCent: -1 }, "variantes_preco"],
    ["um escalão de zero pessoas", { pessoas: 0 }, "variantes_pessoas"],
    ["um rótulo só em inglês", { rotuloEn: "20 people" }, "variantes_rotulo_pt"],
  ] as const)("variante: %s", async (_, mudanca, regra) => {
    await db.insert(produtos).values(KIT);
    const variante = { produtoId: "festa-premium", id: "20", posicao: 0, ...mudanca };
    expect(await recusado(db.insert(variantes).values(variante))).toBe(regra);
  });

  it("variante: a de um produto que não existe", async () => {
    const orfa = db.insert(variantes).values({ produtoId: "nao-existe", id: "unica", posicao: 0 });
    expect(await recusado(orfa)).toBe("variantes_produto_id_produtos_id_fk");
  });

  it("variante: a mesma duas vezes no mesmo produto", async () => {
    await db.insert(produtos).values(KIT);
    await db.insert(variantes).values({ produtoId: "festa-premium", id: "20", posicao: 0 });
    const repetida = db.insert(variantes).values({ produtoId: "festa-premium", id: "20", posicao: 1 });
    expect(await recusado(repetida)).toBe("variantes_produto_id_id_pk");
  });

  it.each([
    ["uma segunda casa", { id: 2 }, "casa_uma_so"],
    ["vagas de 3 minutos", { duracaoVagaMinutos: 3 }, "casa_duracao_vaga"],
    ["um limite por vaga de zero", { limitePorVaga: 0 }, "casa_limite_por_vaga"],
    ["um calendário de 400 dias", { diasAFrente: 400 }, "casa_dias_a_frente"],
    ["o verde a acabar depois do amarelo", { limiarLivre: 60, limiarMedia: 50 }, "casa_limiares"],
    ["um valor mínimo negativo", { valorMinimoCent: -100 }, "casa_valor_minimo"],
  ] as const)("casa: %s", async (_, mudanca, regra) => {
    expect(await recusado(db.insert(casa).values({ ...CASA, ...mudanca }))).toBe(regra);
  });
});
