"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useConta } from "./ProvedorConta";

/**
 * A entrada da conta no cabeçalho.
 *
 * ## ⚠️ Não aparece quando não há conta
 *
 * Sem chaves configuradas, `ativa` é `false` e isto não renderiza nada — nem um
 * botão desligado, nem um aviso. Um «Entrar» que dá erro é pior do que não haver
 * «Entrar» nenhum.
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
  const { ativa, utilizador, aCarregar } = useConta();
  const caminho = usePathname();

  if (!ativa) return null;

  if (aCarregar) {
    return <span aria-hidden className="h-9 w-9 rounded-full bg-tinta/8" />;
  }

  if (!utilizador) {
    return (
      <Link
        href={{ pathname: "/entrar", query: { voltar: caminho } }}
        className="alvo-toque flex items-center rounded-full border border-tinta/25 px-2 py-2 transition-colors hover:bg-tinta hover:text-papel sm:px-3.5"
        /* ⚠️ **O nome acessível vem daqui e não do que está escrito**, porque no
           telemóvel não está escrito nada — está um símbolo. É a mesma regra do
           botão de idioma, que mostra «en» e se anuncia «English». */
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
      className="alvo-toque flex items-center gap-2 rounded-full border border-tinta/25 py-1 pl-1 pr-3 transition-colors hover:bg-tinta hover:text-papel"
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
          className="size-7 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-tijolo text-[0.7rem] text-papel"
        >
          {primeiro.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-24 truncate sm:inline">{primeiro}</span>
    </Link>
  );
}
