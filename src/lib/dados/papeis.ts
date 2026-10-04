import type { ContextoPainel, FontePainel, Papel, ResultadoPainel } from "./tipos";

/**
 * # Quem pode chamar cada função do painel
 *
 * ⚠️ **Esconder um botão não é proteger** (regra 8 do AGENTS.md). O papel
 * verifica-se aqui, **antes** de a fonte ser chamada — por isso a implementação
 * sobre a base de dados não o pode esquecer: com o papel errado, nem chega a
 * ser chamada. O `index.ts` embrulha a fonte com isto; os testes também.
 *
 * O `papel` do contexto sai da sessão do painel (#33), nunca do formulário.
 */

const SO_GERENTE: readonly Papel[] = ["gerente"];
/* O balcão esgota, tira de venda e pausa (`painel-balcao.md`); não mexe em
   preços, produtos, horários nem definições. */
const EQUIPA: readonly Papel[] = ["funcionario", "gerente"];

const SEM_PERMISSAO = { ok: false, erro: "sem-permissao" } as const;

/* As funções do painel recebem o contexto em último lugar. */
type Escrita<A extends unknown[], T> = (...args: [...A, ContextoPainel]) => Promise<ResultadoPainel<T>>;

function exigirPapel<A extends unknown[], T>(papeis: readonly Papel[], escrita: Escrita<A, T>): Escrita<A, T> {
  return async (...args) => {
    const ctx = args[args.length - 1] as ContextoPainel;
    return papeis.includes(ctx.papel) ? escrita(...args) : SEM_PERMISSAO;
  };
}

export function protegerPainel(fonte: FontePainel): FontePainel {
  return {
    /* Ler os produtos é dos dois: o balcão precisa deles para os esgotar. */
    produtosDoPainel: (ctx) => fonte.produtosDoPainel(ctx),
    criarProduto: exigirPapel(SO_GERENTE, (entrada: unknown, ctx) => fonte.criarProduto(entrada, ctx)),
    editarProduto: exigirPapel(SO_GERENTE, (id: string, entrada: unknown, ctx) =>
      fonte.editarProduto(id, entrada, ctx),
    ),
    arquivarProduto: exigirPapel(SO_GERENTE, (id: string, arquivado: boolean, ctx) =>
      fonte.arquivarProduto(id, arquivado, ctx),
    ),
    marcarEsgotadoHoje: exigirPapel(EQUIPA, (id: string, esgotado: boolean, ctx) =>
      fonte.marcarEsgotadoHoje(id, esgotado, ctx),
    ),
    tirarDeVenda: exigirPapel(EQUIPA, (id: string, fora: boolean, ctx) => fonte.tirarDeVenda(id, fora, ctx)),
    guardarHorarios: exigirPapel(SO_GERENTE, (entrada: unknown, ctx) => fonte.guardarHorarios(entrada, ctx)),
    guardarDefinicoes: exigirPapel(SO_GERENTE, (entrada: unknown, ctx) => fonte.guardarDefinicoes(entrada, ctx)),
    pausarLoja: exigirPapel(EQUIPA, (ate: Date | null, ctx) => fonte.pausarLoja(ate, ctx)),
  };
}
