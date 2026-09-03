"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ListaHistorico } from "@/components/encomendas/ListaHistorico";
import type { Locale } from "@/i18n/routing";
import { useConta } from "./ProvedorConta";

/**
 * O que a conta mostra — e o que ela **não** mostra.
 *
 * ## ⚠️ Não há histórico de encomendas, e diz-se com todas as letras
 *
 * É a pergunta que toda a gente faz nesta página, e a resposta honesta é que
 * não há: as encomendas saem daqui por email e **não ficam guardadas em lado
 * nenhum nosso** (ver `autenticacao.ts` — não há base de dados). Uma página de
 * conta silenciosa sobre isso deixa a pessoa a procurar um separador que não
 * existe, e a concluir que o site está avariado.
 *
 * Escrever a limitação é também o que impede que ela se esqueça: no dia em que a
 * casa quiser histórico, é este parágrafo que sai.
 *
 * ## Para que serve, então
 *
 * Para não voltar a escrever o nome e o email a cada pedido, e para o cesto não
 * se misturar com o de outra pessoa no mesmo telemóvel. É pouco, e é verdade.
 */
export function PainelConta({ locale }: { locale: Locale }) {
  const t = useTranslations("conta");
  const { utilizador, aCarregar, sair, modo } = useConta();

  if (aCarregar) return <Caixa>{<p className="text-tinta-suave">{t("aCarregar")}</p>}</Caixa>;

  /* ⚠️ **Sem sessão, isto não é um erro — é um convite.** Quem chega a `/conta`
     sem ter entrado escreveu o endereço ou guardou o link; um 404 aqui era
     castigar alguém por ter feito exactamente o que devia. */
  if (!utilizador) {
    return (
      <Caixa>
        <h1 className="titulo-display titulo-beta">{t("entrarTitulo")}</h1>
        <p className="mt-4 text-tinta-suave">{t("naoEntrou")}</p>
        <Link
          href="/entrar"
          className="premivel mt-8 inline-flex min-h-12 items-center rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {t("entrar")}
        </Link>
      </Caixa>
    );
  }

  return (
    <Caixa>
      <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">
        {t("olho")}
      </p>
      <h1 className="titulo-display titulo-beta mt-4">
        {t("ola", { nome: utilizador.nome?.split(/\s+/)[0] ?? "" })}
      </h1>

      <dl className="mt-10 divide-y divide-tinta/12 border-y border-tinta/12">
        <div className="flex flex-wrap justify-between gap-2 py-4">
          <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("nome")}
          </dt>
          <dd>{utilizador.nome ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 py-4">
          <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("email")}
          </dt>
          <dd className="break-all">{utilizador.email ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-6 text-sm text-tinta-suave">{t("paraQueServe")}</p>

      {/* ⚠️ **A demonstração diz-se também aqui e não só na entrada.** Quem
          chega a esta página por um link já não passou pelo aviso da entrada, e
          o que vê é um perfil com o seu nome — que parece uma conta a sério. */}
      {modo === "demonstracao" && (
        <p className="mt-3 text-sm text-tinta-suave">{t("demonstracao.naConta")}</p>
      )}

      {/* ⚠️ **Aqui esteve um aviso a dizer que não havia histórico nenhum.**
          Passou a haver — o do browser — e o aviso saiu. O que **não** saiu foi
          a ressalva: continua dentro da `ListaHistorico`, por cima da lista,
          porque isto são os pedidos feitos neste browser e não os pedidos que a
          casa tem. Quando a lista está vazia, a `ListaHistorico` não renderiza
          nada e fica o convite abaixo. */}
      <div className="mt-10">
        <ListaHistorico locale={locale} mostrarVazio />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/encomendas"
          className="premivel alvo-toque inline-flex min-h-12 items-center rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {t("encomendar")}
        </Link>
        <button
          type="button"
          /* Nos fornecedores, o `sair` do contexto leva à página inicial: ficar
             em `/conta` depois de sair mostrava o ecrã de «entre na sua conta»
             no sítio onde a pessoa acabou de sair, o que se lê como se a saída
             não tivesse funcionado. Em demonstração fica-se aqui, e o ecrã que
             aparece é o convite a entrar — que é a leitura certa, porque não
             houve redirecção nenhuma. */
          onClick={sair}
          className="premivel alvo-toque inline-flex min-h-12 items-center rounded-full border-2 border-tinta px-7 text-sm font-semibold uppercase tracking-widest hover:bg-tinta hover:text-papel"
        >
          {t("sair")}
        </button>
      </div>
    </Caixa>
  );
}

/**
 * A moldura dos três estados desta página.
 *
 * ⚠️ **A largura não se aperta na própria `.envolvente`.** Um `max-w-[34rem]`
 * escrito ao lado dela resolve para 1248 px e não para 544: perde para a classe
 * de `@layer components`, em silêncio e sem erro nenhum — é a armadilha nº 6 do
 * AGENTS.md, desta vez do lado da largura. A medida vive no `<div>` de dentro.
 *
 * E vive aqui, num sítio só, porque a página tem três saídas (a carregar, sem
 * sessão, com sessão) e três cópias da mesma moldura são duas que ficam para
 * trás na primeira alteração.
 */
function Caixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="seccao">
      <div className="envolvente">
        <div className="max-w-[34rem]">{children}</div>
      </div>
    </div>
  );
}
