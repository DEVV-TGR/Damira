import type { ErroPainel, Pedido } from "@/lib/dados/tipos";

/** O que cada erro do painel quer dizer, para quem está ao balcão. */
export const MENSAGENS: Record<ErroPainel, string> = {
  "sem-permissao": "Sem permissão. Volte a entrar no painel.",
  "dados-invalidos": "Não foi possível — confira e tente outra vez.",
  "nao-existe": "Este pedido já não existe.",
  "estado-mudou": "Este pedido mudou entretanto. A lista foi atualizada.",
  "falta-cobrar": "Falta confirmar que o dinheiro em falta foi cobrado.",
  "fora-do-prazo": "Já passaram os 5 minutos. Só a gerente pode desfazer.",
};

/** «12×» à unidade, «1,5 kg» ao quilo. */
export const quantidade = (linha: Pick<Pedido["linhas"][number], "quantidade" | "unidade">): string =>
  linha.unidade === "kg" ? `${linha.quantidade.toLocaleString("pt-PT")} kg` : `${linha.quantidade}×`;

export const BOTAO =
  "premivel inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold uppercase tracking-widest disabled:opacity-60";
export const BOTAO_PRINCIPAL = `${BOTAO} bg-tijolo text-papel`;
export const BOTAO_SECUNDARIO = `${BOTAO} border border-tinta/20 bg-papel`;
