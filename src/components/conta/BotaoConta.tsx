"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useConta } from "./ProvedorConta";

/**
 * A entrada da conta no cabeçalho.
 *
 * ## ⚠️ Aparece sempre, porque a conta existe sempre
 *
 * Isto **não renderizava nada** sem chaves do Google ou do Facebook, e por isso a
 * funcionalidade não existia na instalação que está no ar — nem para o cliente
 * que a devia ver. Hoje, sem chaves, a conta corre em demonstração e o botão
 * aparece. Ver `conta.ts`.
 *
 * ## ⚠️ E não pisca enquanto a sessão carrega
 *
 * A sessão é lida no cliente, portanto há um instante em que ainda não se sabe
 * quem é. Nesse instante mostra-se um espaço da largura certa e não o botão de
 * entrar: quem já tem sessão iniciada via «Entrar» aparecer e desaparecer em
 * todas as páginas, e isso lê-se como ter sido expulso.
 */
export function BotaoConta() {
  const t = useTranslations("conta");
  const { utilizador, aCarregar } = useConta();
  const caminho = usePathname();

  if (aCarregar) {
    return <span aria-hidden className="mx-1 size-9 shrink-0 rounded-full bg-tinta/8 sm:mx-0 sm:size-11" />;
  }

  if (!utilizador) {
    return (
      <Link
        href={{ pathname: "/entrar", query: { voltar: caminho } }}
        className="alvo-toque controlo-cabecalho flex size-11 shrink-0 items-center justify-center rounded-full border border-tinta/25 transition-colors hover:bg-tinta hover:text-papel sm:w-auto sm:px-3.5"
        aria-label={t("entrar")}
      >
        {/* ⚠️ **A palavra «Entrar» não cabe a 390 px.** Com ela, o cabeçalho
            passava a ter 403 px de conteúdo e a página inteira ganhava rolagem
            horizontal — o defeito nº 11 do AGENTS.md a acontecer outra vez, e
            outra vez invisível para quem só olha ao computador. Abaixo do `sm`
            fica o símbolo; a partir daí, a palavra. */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-4 sm:hidden"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
        <span aria-hidden className="hidden sm:inline">
          {t("entrar")}
        </span>
      </Link>
    );
  }

  /* O primeiro nome e não o nome todo: no cabeçalho de um telemóvel, «Maria
     Fernanda Oliveira» empurra o seletor de idioma para fora do ecrã. */
  const primeiro = utilizador.nome?.trim().split(/\s+/)[0] ?? t("aMinhaConta");

  return (
    <Link
      href="/conta"
      className="alvo-toque controlo-cabecalho flex size-11 shrink-0 items-center justify-center rounded-full border border-tinta/25 transition-colors hover:bg-tinta hover:text-papel sm:w-auto sm:gap-2 sm:pl-1 sm:pr-3"
      aria-label={t("aMinhaConta")}
    >
      {/* ⚠️ `<img>` e não `next/image`: a fotografia vem do Google ou do
          Facebook, que são domínios que o `next.config` teria de autorizar um a
          um — e o dia em que um deles mudar de domínio é o dia em que a imagem
          rebenta o `build` em vez de simplesmente não aparecer. */}
      {utilizador.imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={utilizador.imagem}
          alt=""
          width={28}
          height={28}
          className="size-6 rounded-full object-cover sm:size-7"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-tijolo text-[0.7rem] text-papel sm:size-7"
        >
          {primeiro.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-24 truncate sm:inline">{primeiro}</span>
    </Link>
  );
}
