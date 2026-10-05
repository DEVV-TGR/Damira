/**
 * # Os comandos da base de dados, pelo terminal
 *
 *   npm run bd:migrar      as tabelas (as migrações que faltam)
 *   npm run bd:importar    o catálogo dos JSON — uma vez só
 *   npm run bd:comparar    a base de dados contra os JSON, sem escrever
 *   npm run painel:pin     o PIN da equipa
 *
 * A ordem, e quando, está em `docs/loja/ligar-a-neon.md`. O que cada um faz
 * está em `src/db/comandos.ts`; isto só liga o terminal e a base de dados.
 *
 * O endereço vem do `DATABASE_URL_UNPOOLED` — do ambiente, ou do `.env.local`.
 * ⚠️ **É ele que decide em que base de dados se escreve**, e cada comando que
 * escreve mostra-o e pede um «sim» antes.
 *
 * Com `-- --ensaio`, corre num PGlite em memória em vez da Neon: para ver um
 * comando a funcionar sem conta. Nada do que faz fica guardado.
 */
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import type { BaseDeDados } from "@/db/catalogo";
import {
  comandoComparar,
  comandoImportar,
  comandoMigrar,
  comandoPin,
  descreverAlvo,
  type Conversa,
} from "@/db/comandos";
import { loteEmTransacao } from "@/db/lote";

const MIGRACOES = "src/db/migracoes";
const COMANDOS = ["migrar", "importar", "comparar", "pin"] as const;
type Comando = (typeof COMANDOS)[number];

// ——— O terminal ———

/*
 * Uma linha de cada vez, tecla a tecla, com o que chega a mais guardado para a
 * pergunta seguinte. ⚠️ Não se usa o `readline` para umas perguntas e outra
 * coisa para as outras: o `readline` lê adiantado, e o que alguém escrevesse
 * depressa — um PIN colado — perdia-se ao fechá-lo.
 */
let pendente = "";

function lerLinha(pergunta: string, mostrar: boolean): Promise<string> {
  process.stdout.write(pergunta);
  const entrada = process.stdin;
  return new Promise((resolve) => {
    const tentar = () => {
      const fimDeLinha = pendente.search(/\r?\n|\r/);
      if (fimDeLinha === -1) return false;
      const linha = pendente.slice(0, fimDeLinha);
      pendente = pendente.slice(fimDeLinha).replace(/^(\r\n|\r|\n)/, "");
      entrada.off("data", aoTeclar);
      entrada.setRawMode?.(false);
      entrada.pause();
      if (!mostrar) process.stdout.write("\n");
      resolve(linha);
      return true;
    };
    const aoTeclar = (teclas: string) => {
      for (const tecla of teclas) {
        if (tecla === "\u0003") process.exit(130); // Ctrl+C
        if (tecla === "\u007f") {
          pendente = pendente.slice(0, -1); // apagar
          continue;
        }
        pendente += tecla;
        /* Num terminal (modo «raw») o eco é nosso: mostra-se o que se escreve,
           menos o que é escondido. */
        if (mostrar && entrada.isTTY) process.stdout.write(tecla === "\r" ? "\n" : tecla);
      }
      tentar();
    };
    if (tentar()) return;
    entrada.setEncoding("utf8");
    entrada.setRawMode?.(true);
    entrada.on("data", aoTeclar);
    entrada.resume();
  });
}

const conversa: Conversa = {
  escrever: (texto) => console.log(texto),
  perguntar: (pergunta) => lerLinha(pergunta, true),
  /* O PIN não fica no ecrã nem no histórico do terminal. */
  perguntarEscondido: (pergunta) => lerLinha(pergunta, false),
};

// ——— A base de dados ———

type Ligacao = {
  db: BaseDeDados;
  alvo: string;
  aplicarMigracoes: () => Promise<void>;
  fechar: () => Promise<void>;
};

/* A Neon, com o driver de WebSockets: a importação e o PIN usam transações, que
   o driver HTTP do site não faz. É uma ligação de um comando que corre à mão,
   e fecha-se no fim — não a do site (`robustez.md`). */
function ligarNeon(): Ligacao | null {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* Sem `.env.local`, vale o que estiver no ambiente. */
  }
  const endereco = process.env.DATABASE_URL_UNPOOLED;
  if (!endereco) return null;
  const pool = new Pool({ connectionString: endereco });
  const db = drizzle(pool) as unknown as BaseDeDados;
  return {
    db,
    alvo: descreverAlvo(endereco),
    aplicarMigracoes: () => migrate(drizzle(pool), { migrationsFolder: MIGRACOES }),
    fechar: () => pool.end(),
  };
}

/* O ensaio: um PGlite em memória, com o que o comando precisa para ter alguma
   coisa a fazer (as tabelas, e o catálogo para comparar e para o PIN). */
async function ligarEnsaio(comando: Comando): Promise<Ligacao> {
  const { baseDeTeste } = await import("@/db/teste");
  const { importarCatalogo, origemDosJson } = await import("@/db/importar-catalogo");
  const { db, cliente } = await baseDeTeste();
  if (comando === "comparar" || comando === "pin") await importarCatalogo(db, await origemDosJson());
  console.log("ENSAIO — num PGlite em memória, que desaparece no fim. Nada disto toca na Neon.");
  return {
    db,
    alvo: "ensaio (PGlite em memória)",
    aplicarMigracoes: async () => {},
    fechar: () => cliente.close(),
  };
}

// ——— O comando ———

async function principal(): Promise<number> {
  const comando = process.argv[2] as Comando;
  if (!COMANDOS.includes(comando)) {
    console.error(`Comando desconhecido: ${process.argv[2] ?? "(nenhum)"}. Os que há: ${COMANDOS.join(", ")}.`);
    return 1;
  }

  const ligacao = process.argv.includes("--ensaio") ? await ligarEnsaio(comando) : ligarNeon();
  if (!ligacao) {
    console.error(
      "Falta o DATABASE_URL_UNPOOLED (no ambiente ou no .env.local). Ver docs/loja/ligar-a-neon.md, ponto 3.",
    );
    return 1;
  }

  try {
    const { db, alvo } = ligacao;
    switch (comando) {
      case "migrar":
        return await comandoMigrar({ alvo, conversa, aplicarMigracoes: ligacao.aplicarMigracoes });
      case "importar":
        return await comandoImportar({ db, alvo, conversa });
      case "comparar":
        return await comandoComparar({ db, conversa });
      case "pin":
        return await comandoPin({ db, emLote: loteEmTransacao(db), alvo, conversa });
    }
  } finally {
    await ligacao.fechar();
  }
}

principal().then(
  (codigo) => process.exit(codigo),
  (erro) => {
    console.error(erro);
    process.exit(1);
  },
);
