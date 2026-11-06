import type { BaseDeDados } from "@/db/catalogo";
import type { ExecutarLote } from "@/db/lote";
import { baseDaNeon } from "@/lib/dados/bd-neon";
import type { Ambiente } from "@/lib/modo-teste";
import { criarSessaoBd } from "./bd";
import { enviadorDoResend } from "./email-codigo";
import { criarSessaoProvisoria } from "./provisoria";
import type { FonteSessao, LojaDeCookies } from "./tipos";

/**
 * # Que entrada tem o painel
 *
 * - **Com base de dados (`DATABASE_URL`): a verdadeira** (#33) — o PIN com
 *   *hash*, o código da gerente por email, as sessões na base de dados. É a
 *   mesma variável que liga a fonte dos dados (`fonteDoAmbiente`): as duas
 *   entram juntas, e o painel nunca fica a gravar a sério com o PIN público.
 * - **Sem ela: a provisória**, como até aqui — e só com o modo de teste.
 *
 * O que a verdadeira lê do ambiente:
 * - `EMAILS_GERENTE`: quem pode ser gerente. ⚠️ **Sem valor por defeito**: a
 *   provisória cai no email da equipa, que está no código; aqui, sem a lista,
 *   ninguém é gerente.
 * - `RESEND_API_KEY` e `EMAIL_REMETENTE`: o envio do código. Sem a chave, a
 *   entrada da gerente diz que não está disponível — o código nunca vai para o
 *   ecrã. A do PIN funciona na mesma.
 *
 * Ver `docs/loja/ligar-a-neon.md` › 8.
 */
export function entradaDoAmbiente(opcoes: {
  ambiente: Ambiente;
  cookies: () => Promise<LojaDeCookies>;
  /** O `user-agent` de quem entra, para a lista de sessões da gerente. */
  dispositivo: () => Promise<string | null>;
  /* Por argumento, para os testes porem um PGlite e um envio de mentira. */
  ligarBaseDeDados?: (endereco: string) => { db: BaseDeDados; emLote: ExecutarLote };
  enviador?: (chave: string, remetente: string) => (email: string, codigo: string) => Promise<void>;
}): FonteSessao {
  const { ambiente, cookies } = opcoes;
  const endereco = ambiente.DATABASE_URL;
  if (!endereco) return criarSessaoProvisoria({ ambiente, cookies });

  const { db, emLote } = (opcoes.ligarBaseDeDados ?? baseDaNeon)(endereco);
  const chave = ambiente.RESEND_API_KEY?.trim();
  const remetente = ambiente.EMAIL_REMETENTE?.trim() || "onboarding@resend.dev";
  return criarSessaoBd({
    db,
    emLote,
    cookies,
    gerentes: (ambiente.EMAILS_GERENTE ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    enviarCodigo: chave ? (opcoes.enviador ?? enviadorDoResend)(chave, remetente) : null,
    dispositivo: opcoes.dispositivo,
    producao: ambiente.NODE_ENV === "production",
  });
}
