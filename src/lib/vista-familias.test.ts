import { describe, expect, it } from "vitest";
import { CATALOGO_JSON } from "@/lib/dados/json";
import type { Familia, Produto } from "@/lib/dados/tipos";
import { familiasComProdutos } from "./vista";

/*
 * O que a `/encomendas` e o menu do cabeçalho desenham (26/11): as famílias e
 * as categorias da gerente, pela ordem dela, só com o que tem produtos.
 */

const produto = (id: string, categoriaId: string): Produto => ({
  ...CATALOGO_JSON.find((p) => p.origem === "encomendas")!,
  id,
  categoriaId,
});

const texto = (pt: string) => ({ pt, en: null });

const ARVORE: Familia[] = [
  { id: "natal", nome: texto("Natal"), categorias: [{ id: "bolos-de-natal", nome: texto("Bolos de Natal"), familiaId: "natal", seccoes: [] }] },
  { id: "vazia", nome: texto("Vazia"), categorias: [{ id: "sem-nada", nome: texto("Sem nada"), familiaId: "vazia", seccoes: [] }] },
  {
    id: "festas",
    nome: texto("Kit Festas"),
    categorias: [
      { id: "festas", nome: texto("Kit Festas"), familiaId: "festas", seccoes: [] },
      { id: "festas-vazia", nome: texto("Vazia"), familiaId: "festas", seccoes: [] },
    ],
  },
];

describe("familiasComProdutos", () => {
  it("segue a ordem da gerente e deixa de fora o que está vazio", () => {
    const seccoes = familiasComProdutos(ARVORE, [produto("kit-a", "festas"), produto("bolo-rei", "bolos-de-natal")]);
    expect(seccoes.map((s) => s.familia.id)).toEqual(["natal", "festas"]);
    expect(seccoes[1].categorias.map((c) => c.categoria.id)).toEqual(["festas"]);
    expect(seccoes[0].categorias[0].produtos.map((p) => p.id)).toEqual(["bolo-rei"]);
  });

  it("um produto numa categoria que não está na árvore não aparece", () => {
    expect(familiasComProdutos(ARVORE, [produto("perdido", "arquivada")])).toEqual([]);
  });
});
