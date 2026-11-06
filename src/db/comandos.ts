import { count, eq } from "drizzle-orm";
import { definirPinDaEquipa } from "@/lib/sessao-painel/bd";
import type { BaseDeDados } from "./catalogo";
import { casa, produtos } from "./esquema";
import { compararCatalogo, importarCatalogo, origemDosJson } from "./importar-catalogo";
import type { ExecutarLote } from "./lote";

/**
 * # Os comandos que correm na Neon, à mão
 *
 * O que não acontece no site: criar as tabelas, importar o catálogo, definir o
 * PIN da equipa. Corre-se no terminal (`npm run bd:migrar`…), uma vez ou
 * poucas, pela ordem de `docs/loja/ligar-a-neon.md`. A entrada pelo terminal
 * está em `scripts/bd.ts`; aqui está o que cada comando faz, a falar com uma
 * `Conversa` em vez de com o terminal — é o que deixa testá-los no PGlite.
 *
 * ⚠️ **Os que escrevem dizem onde vão escrever, e esperam por um «sim».** É a
 * proteção contra o erro mais fácil: correr em produção com o endereço errado
 * no `.env.local`.
 *
 * Cada comando devolve o código de saída: 0 correu bem, 1 não.
 */

export type Conversa = {
  escrever: (texto: string) => void;
  perguntar: (pergunta: string) => Promise<string>;
  /** Sem mostrar o que se escreve: é para o PIN. */
  perguntarEscondido: (pergunta: string) => Promise<string>;
};

/**
 * O endereço da base de dados, para se ler antes de confirmar: o servidor e o
 * nome da base de dados. ⚠️ **Nunca a palavra-passe**, que vai no próprio
 * endereço e não pode aparecer no ecrã.
 */
export function descreverAlvo(endereco: string): string {
  try {
    const url = new URL(endereco);
    return `${url.hostname} / ${url.pathname.replace(/^\//, "") || "(sem nome)"}`;
  } catch {
    return "(endereço que não se percebe)";
  }
}

async function confirmar(conversa: Conversa, alvo: string, oQue: string): Promise<boolean> {
  conversa.escrever(`\nBase de dados: ${alvo}`);
  conversa.escrever(`Vai ${oQue}.`);
  const resposta = await conversa.perguntar("Escreve «sim» para continuar: ");
  if (resposta.trim().toLowerCase() === "sim") return true;
  conversa.escrever("Cancelado. Nada foi escrito.");
  return false;
}

/** `npm run bd:migrar`: as tabelas, pelas migrações que ainda faltam. */
export async function comandoMigrar(opcoes: {
  alvo: string;
  conversa: Conversa;
  aplicarMigracoes: () => Promise<void>;
}): Promise<number> {
  const { alvo, conversa } = opcoes;
  if (!(await confirmar(conversa, alvo, "aplicar as migrações que faltam (src/db/migracoes)"))) return 1;
  await opcoes.aplicarMigracoes();
  conversa.escrever("Migrações aplicadas. As que já lá estavam ficaram como estavam.");
  return 0;
}

/**
 * `npm run bd:comparar`: a base de dados contra os JSON, sem escrever nada.
 * Serve para confirmar a importação, a qualquer momento.
 */
export async function comandoComparar(opcoes: { db: BaseDeDados; conversa: Conversa }): Promise<number> {
  const diferencas = await compararCatalogo(opcoes.db, await origemDosJson());
  if (diferencas.length === 0) {
    opcoes.conversa.escrever("0 diferenças: a base de dados tem o catálogo dos JSON, campo a campo.");
    return 0;
  }
  opcoes.conversa.escrever(`${diferencas.length} diferenças:`);
  for (const diferenca of diferencas) opcoes.conversa.escrever(`  - ${diferenca}`);
  return 1;
}

/**
 * `npm run bd:importar`: o catálogo dos JSON, uma vez, e a comparação no fim.
 *
 * ⚠️ **Recusa-se sobre uma base de dados com produtos** — depois de 14/10, a
 * gerente edita-os no painel, e uma segunda importação apagava-lhe o trabalho.
 */
export async function comandoImportar(opcoes: {
  db: BaseDeDados;
  alvo: string;
  conversa: Conversa;
}): Promise<number> {
  const { db, alvo, conversa } = opcoes;
  const [{ n }] = await db.select({ n: count() }).from(produtos);
  if (n > 0) {
    conversa.escrever(`\nBase de dados: ${alvo}`);
    conversa.escrever(`Já tem ${n} produtos. A importação só corre sobre uma base de dados vazia.`);
    conversa.escrever("Para ver se bate com os JSON: npm run bd:comparar");
    return 1;
  }
  if (!(await confirmar(conversa, alvo, "importar o catálogo dos JSON (uma vez só)"))) return 1;

  const importado = await importarCatalogo(db, await origemDosJson());
  conversa.escrever(`Importados ${importado.produtos} produtos e ${importado.variantes} variantes. A comparar…`);
  return comandoComparar({ db, conversa });
}

/**
 * `npm run painel:pin`: o PIN da equipa, e o fim das sessões da equipa que
 * houver. É o primeiro PIN, antes de haver gerente com sessão; depois, muda-se
 * no ecrã «Equipa» da gestão (#74). ⚠️ O PIN pede-se depois, escondido e duas vezes — nunca na linha do
 * comando, que fica no histórico do terminal.
 */
export async function comandoPin(opcoes: {
  db: BaseDeDados;
  emLote: ExecutarLote;
  alvo: string;
  conversa: Conversa;
}): Promise<number> {
  const { db, emLote, alvo, conversa } = opcoes;
  const [linha] = await db.select({ id: casa.id }).from(casa).where(eq(casa.id, 1));
  if (!linha) {
    conversa.escrever(`\nBase de dados: ${alvo}`);
    conversa.escrever("Ainda não tem a casa: primeiro npm run bd:migrar e npm run bd:importar.");
    return 1;
  }
  if (!(await confirmar(conversa, alvo, "definir o PIN da equipa e fechar as sessões da equipa abertas"))) return 1;

  const pin = await conversa.perguntarEscondido("PIN (4 ou 6 dígitos): ");
  if (!/^(\d{4}|\d{6})$/.test(pin)) {
    conversa.escrever("O PIN tem 4 ou 6 dígitos, só números. Nada foi mudado.");
    return 1;
  }
  if ((await conversa.perguntarEscondido("O mesmo PIN, outra vez: ")) !== pin) {
    conversa.escrever("Os dois não são iguais. Nada foi mudado.");
    return 1;
  }
  await definirPinDaEquipa(db, emLote, pin);
  conversa.escrever("PIN definido. Os tablets com sessão da equipa vão voltar a pedi-lo.");
  return 0;
}
