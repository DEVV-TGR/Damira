import type { HorarioSemanal, TempoProducao } from "@/lib/horarios";
import { CATALOGO_JSON, CONFIGURACAO_JSON, criarFonteJson, type OpcoesFonteJson } from "./json";
import type { FonteDeDados, Produto } from "./tipos";

/**
 * # ⚠️ Valores de exemplo — **não são da casa**
 *
 * A Damira ainda não deu o horário da cozinha nem os tempos de produção, e o
 * calendário não se constrói sem eles. Estes números existem para o cesto, o
 * calendário e o checkout poderem ser feitos e testados **enquanto** ela não
 * responde. São plausíveis e são inventados.
 *
 * Por isso vivem aqui e não no catálogo: o `json.ts` diz a verdade (`null`, por
 * preencher), e só quem pede o exemplo de propósito o recebe — os testes, e o
 * desenvolvimento com `DADOS_DE_EXEMPLO=1` no `.env.local`.
 *
 * ⚠️ **Recusa-se a correr em produção.** Um prazo inventado no site no ar é um
 * cliente que aparece na quinta para um bolo que ninguém disse que estava
 * pronto na quinta. Se um dia isto rebentar na Vercel, a correção é preencher
 * os dados — não é tirar a guarda.
 */

/** Por família. A carta conta-se em horas de cozinha; o resto, em dias. */
export const TEMPOS_DE_EXEMPLO: Record<Produto["familia"], TempoProducao> = {
  ementa: { unidade: "horas", valor: 24 },
  festa: { unidade: "dias", valor: 2 },
  bolo: { unidade: "dias", valor: 3 },
  medida: { unidade: "dias", valor: 5 },
  box: { unidade: "dias", valor: 1 },
};

const oitoAsDezoito = [{ abre: "08:00", fecha: "18:00" }];

export const COZINHA_DE_EXEMPLO: HorarioSemanal = {
  segunda: oitoAsDezoito,
  terca: oitoAsDezoito,
  quarta: oitoAsDezoito,
  quinta: oitoAsDezoito,
  sexta: oitoAsDezoito,
  sabado: oitoAsDezoito,
  domingo: oitoAsDezoito,
};

const recusarEmProducao = () => {
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "src/lib/dados/exemplo.ts: os valores de exemplo não correm em produção. " +
        "Preencher os tempos e a cozinha, e tirar DADOS_DE_EXEMPLO do ambiente.",
    );
  }
};

/**
 * A fonte dos JSON com os buracos tapados pelo exemplo. **Só** preenche o que
 * está `null` — um tempo que a casa já tenha dado nunca é trocado pelo de
 * exemplo.
 */
export function fonteDeExemplo(opcoes: OpcoesFonteJson = {}): FonteDeDados {
  recusarEmProducao();
  const catalogo = (opcoes.catalogo ?? CATALOGO_JSON).map((produto) => ({
    ...produto,
    tempoProducao: produto.tempoProducao ?? TEMPOS_DE_EXEMPLO[produto.familia],
  }));
  const base = opcoes.configuracao ?? CONFIGURACAO_JSON;
  return criarFonteJson({
    ...opcoes,
    catalogo,
    configuracao: { ...base, cozinha: base.cozinha ?? COZINHA_DE_EXEMPLO },
  });
}
