import type { HorarioSemanal, TempoProducao } from "@/lib/horarios";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
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
 * **modo de teste** (`LOJA_EM_TESTE=1`, ver `src/lib/modo-teste.ts`), em local
 * ou no ar.
 *
 * ⚠️ **No ar, só com o modo de teste ligado.** Um prazo inventado no site no ar
 * é um cliente que aparece na quinta para um bolo que ninguém disse que estava
 * pronto na quinta — a não ser que o site diga, numa faixa à vista, que os
 * prazos são de exemplo. É isso que o interruptor garante: liga os dois ao
 * mesmo tempo. Se um dia isto rebentar na Vercel, a correção é preencher os
 * dados ou ligar o modo de teste — não é tirar a guarda.
 *
 * ⚠️ **São só o que falta, nunca o que manda.** A gerente vai editar o horário e
 * os tempos no painel (#40, #45); esses valores chegam pela base de dados e este
 * ficheiro só tapa o que ainda estiver `null`.
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

const recusarEmProducao = (ambiente: Ambiente) => {
  if (ambiente.VERCEL_ENV === "production" && !emModoDeTeste(ambiente)) {
    throw new Error(
      "src/lib/dados/exemplo.ts: os valores de exemplo só correm no ar com o modo " +
        "de teste ligado (LOJA_EM_TESTE=1), que mostra a faixa a dizê-lo.",
    );
  }
};

/**
 * A fonte dos JSON com os buracos tapados pelo exemplo. **Só** preenche o que
 * está `null` — um tempo que a casa já tenha dado nunca é trocado pelo de
 * exemplo.
 */
export function fonteDeExemplo(
  opcoes: OpcoesFonteJson = {},
  ambiente: Ambiente = process.env,
): FonteDeDados {
  recusarEmProducao(ambiente);
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

/**
 * A fonte que o site usa, conforme o ambiente: com o modo de teste ligado, a dos
 * JSON com os buracos tapados pelo exemplo; sem ele, a dos JSON como estão —
 * e o calendário diz «indisponível» até haver dados.
 */
export const fonteDoAmbiente = (ambiente: Ambiente = process.env): FonteDeDados =>
  emModoDeTeste(ambiente) ? fonteDeExemplo({}, ambiente) : criarFonteJson();
