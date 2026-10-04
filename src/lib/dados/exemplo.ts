import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { HorarioSemanal, TempoProducao, VagaOcupada } from "@/lib/horarios";
import { emModoDeTeste, type Ambiente } from "@/lib/modo-teste";
import { CATALOGO_JSON, CONFIGURACAO_JSON, criarFonteJson, type OpcoesFonteJson } from "./json";
import type { ConfiguracaoDaCasa, FonteDeDados, Produto } from "./tipos";

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

/**
 * Pedidos por meia hora, de exemplo — a pergunta 3 da mensagem à Andreia. É o
 * que dá cores ao calendário (a afluência conta em percentagem deste limite) e
 * o que enche uma vaga.
 */
export const LIMITE_POR_VAGA_DE_EXEMPLO = 4;

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
  opcoes: OpcoesFonteJson & { pedidosDeExemplo?: boolean } = {},
  ambiente: Ambiente = process.env,
): FonteDeDados {
  recusarEmProducao(ambiente);
  const catalogo = (opcoes.catalogo ?? CATALOGO_JSON).map((produto) => ({
    ...produto,
    tempoProducao: produto.tempoProducao ?? TEMPOS_DE_EXEMPLO[produto.familia],
  }));
  const base = opcoes.configuracao ?? CONFIGURACAO_JSON;
  const configuracao = {
    ...base,
    cozinha: base.cozinha ?? COZINHA_DE_EXEMPLO,
    limitePorVaga: base.limitePorVaga ?? LIMITE_POR_VAGA_DE_EXEMPLO,
  };
  return criarFonteJson({
    ...opcoes,
    catalogo,
    configuracao,
    ...(opcoes.pedidosDeExemplo ? { ocupacaoExtra: pedidosDeExemplo(configuracao) } : {}),
  });
}

// ——— Pedidos de exemplo ———

const DIAS_DA_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;
const LISBOA = { in: tz("Europe/Lisbon") };

/* Um número «ao acaso» que é sempre o mesmo para o mesmo texto (FNV-1a). Não é
   para segurança: é para o calendário de exemplo não mudar a cada visita, e o
   servidor recusar ao enviar exatamente as horas que o calendário mostrou
   cheias. */
const sorteio = (texto: string): number => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  /* ⚠️ A mistura final (a do MurmurHash3). Sem ela, datas seguidas
     («2026-10-20», «2026-10-21»…) davam números vizinhos, e o calendário de
     exemplo saía em blocos: dez dias vermelhos seguidos, nenhum laranja. */
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/**
 * ⚠️ **Pedidos inventados, para o calendário em modo de teste mostrar como fica
 * com procura** — pedido do cliente a 04/10. Cada dia tem uma intensidade ao
 * acaso (dias calmos, dias cheios) e cada meia hora um número de pedidos à
 * volta dela, até ao limite. Contam como pedidos a sério para a ocupação: uma
 * hora cheia de exemplo é recusada ao enviar, como seria uma verdadeira.
 *
 * Só existem com o modo de teste ligado, e a faixa diz que as vagas ocupadas
 * são de exemplo. Os verdadeiros somam-se a estes.
 */
function pedidosDeExemplo(config: ConfiguracaoDaCasa) {
  const limite = config.limitePorVaga ?? LIMITE_POR_VAGA_DE_EXEMPLO;
  return (desde: Date, ate: Date): VagaOcupada[] => {
    const ocupadas: VagaOcupada[] = [];
    for (let dia = desde; dia.getTime() <= ate.getTime() + 86_400_000; dia = addDays(dia, 1, LISBOA)) {
      const data = format(dia, "yyyy-MM-dd", LISBOA);
      const [ano, mes, numDia] = data.split("-").map(Number);
      /* De 0 (calmo) a 3 (cheio): a cor do dia sai daqui. */
      const intensidade = Math.floor(sorteio(data) * 4);
      for (const { abre, fecha } of config.loja[DIAS_DA_SEMANA[getDay(dia, LISBOA)]]) {
        const [ha, ma] = abre.split(":").map(Number);
        const [hf, mf] = fecha.split(":").map(Number);
        for (let m = ha * 60 + ma; m + config.duracaoVagaMinutos <= hf * 60 + mf; m += config.duracaoVagaMinutos) {
          const ruido = Math.round(sorteio(`${data} ${m}`) * 2 - 1);
          const pedidos = Math.max(0, Math.min(limite, intensidade + ruido));
          const inicio = new TZDate(ano, mes - 1, numDia, Math.floor(m / 60), m % 60, "Europe/Lisbon");
          if (pedidos > 0 && inicio >= desde && inicio <= ate) ocupadas.push({ inicio, pedidos });
        }
      }
    }
    return ocupadas;
  };
}

/**
 * A fonte que o site usa, conforme o ambiente: com o modo de teste ligado, a dos
 * JSON com os buracos tapados pelo exemplo; sem ele, a dos JSON como estão —
 * e o calendário diz «indisponível» até haver dados.
 */
export const fonteDoAmbiente = (ambiente: Ambiente = process.env): FonteDeDados =>
  emModoDeTeste(ambiente) ? fonteDeExemplo({ pedidosDeExemplo: true }, ambiente) : criarFonteJson();
