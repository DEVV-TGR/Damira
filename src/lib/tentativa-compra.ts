import { linhasDoCesto, normalizarCesto, type ItemCesto } from "./cesto";

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type TentativaCompra = { pessoa: string; chave: string; dados: Record<string, string>; itens: ItemCesto[] };
const NOME = "damira:compra:tentativa";

/** Só a tentativa sem resposta: atravessa um reload ou login, sem a recriar. */
export function lerTentativa(local: Armazenamento | null): TentativaCompra | null {
  try {
    const lida = JSON.parse(local?.getItem(NOME) ?? "null");
    if (!lida || typeof lida.pessoa !== "string" || typeof lida.chave !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(lida.chave) || !lida.dados || Array.isArray(lida.dados) ||
        typeof lida.dados !== "object" || !Object.values(lida.dados).every((v) => typeof v === "string") ||
        typeof lida.dados.levantamento !== "string" || typeof lida.dados.linhas !== "string" || !Array.isArray(lida.itens)) return null;
    const itens = normalizarCesto(lida.itens);
    return itens.length ? { pessoa: lida.pessoa, chave: lida.chave, dados: lida.dados, itens } : null;
  } catch { return null; }
}

export function guardarTentativa(local: Armazenamento | null, tentativa: TentativaCompra): void {
  try { local?.setItem(NOME, JSON.stringify(tentativa)); } catch { /* Continua em memória. */ }
}

export function apagarTentativa(local: Armazenamento | null, chave: string): void {
  try { if (lerTentativa(local)?.chave === chave) local?.removeItem(NOME); } catch { /* O pedido já foi resolvido. */ }
}

/** Recuperar A nunca apaga B, nem o cesto de outra pessoa no mesmo aparelho. */
export function podeEsvaziarCesto(tentativa: TentativaCompra, cesto: ItemCesto[], pessoa: string): boolean {
  if (tentativa.pessoa !== "visitante" && tentativa.pessoa !== pessoa) return false;
  try {
    const enviadas = JSON.parse(tentativa.dados.linhas);
    const atuais = linhasDoCesto(cesto);
    return Array.isArray(enviadas) && enviadas.length === atuais.length && atuais.every((linha, i) => {
      const enviada = enviadas[i];
      return enviada && linha.produtoId === enviada.produtoId && linha.varianteId === enviada.varianteId &&
        linha.quantidade === enviada.quantidade && linha.notas === (enviada.notas ?? null) &&
        JSON.stringify(linha.escolhas) === JSON.stringify(enviada.escolhas ?? []);
    });
  } catch { return false; }
}
