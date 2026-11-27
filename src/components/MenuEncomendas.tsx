"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * As secções vêm das famílias da gerente (26/11), pelo layout: as mesmas, com o
 * mesmo nome e pela mesma ordem da `/encomendas` (`familiasDaLoja`). Escritas
 * aqui, o Natal nunca entrava no menu, e uma família apagada ficava com um link
 * para lado nenhum.
 */
export type SeccaoDoMenu = { id: string; nome: string };

export function MenuEncomendas({ actual, seccoes }: { actual: boolean; seccoes: SeccaoDoMenu[] }) {
  const t = useTranslations("nav");
  const tc = useTranslations("encomendas.cesto");
  const caminho = usePathname();
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const painel = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const idPainel = useId();
  const idTitulo = useId();

  /* O diálogo nativo centra o cartão na janela e mantém o foco dentro dele,
     mesmo quando o cabeçalho está fixo ou a página já rolou. */
  useEffect(() => {
    const dialogo = painel.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
      lista.current?.querySelector("a")?.focus();
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  const fechar = () => setAbertoEm(null);
  const teclas = (evento: KeyboardEvent<HTMLUListElement>) => {
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    const links = Array.from(evento.currentTarget.querySelectorAll("a"));
    const indice = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (indice === -1) return;
    evento.preventDefault();
    const passo = evento.key === "ArrowDown" ? 1 : -1;
    links[(indice + passo + links.length) % links.length]?.focus();
  };

  return (
    <div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-current={actual ? "page" : undefined}
        onClick={() => setAbertoEm(caminho)}
        onKeyDown={(evento) => {
          if (evento.key !== "ArrowDown") return;
          evento.preventDefault();
          setAbertoEm(caminho);
        }}
        className={`flex items-center gap-1.5 py-3.5 font-semibold uppercase ${
          actual || aberto ? "text-tijolo" : "hover:text-tijolo"
        } ${actual ? "underline decoration-tijolo decoration-2 underline-offset-[6px]" : ""}`}
      >
        {t("encomendas")}
        <svg aria-hidden viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="hidden size-2.5 sm:block">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      <dialog
        ref={painel}
        id={idPainel}
        aria-labelledby={idTitulo}
        onClose={fechar}
        onClick={(evento) => {
          if (evento.target === painel.current) fechar();
        }}
        className="cartao-cesto menu-encomendas bg-papel text-tinta normal-case tracking-normal"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={idTitulo} className="titulo-display titulo-gama">{t("encomendas")}</h2>
            <button
              type="button"
              onClick={fechar}
              aria-label={tc("fechar")}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-tinta/20 transition-colors hover:bg-tinta hover:text-papel"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <ul ref={lista} onKeyDown={teclas} className="grid gap-1">
            <li>
              <Link
                href="/encomendas"
                onClick={fechar}
                aria-current={actual ? "page" : undefined}
                className="mb-2 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-tijolo px-4 text-sm font-semibold text-papel transition-colors hover:bg-tinta"
              >
                {t("todosProdutos")}
                <span aria-hidden>→</span>
              </Link>
            </li>
            {seccoes.map((seccao) => (
              <li key={seccao.id} className="border-t border-tinta/10">
                <Link
                  href={{ pathname: "/encomendas", hash: seccao.id }}
                  onClick={fechar}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-papel-fundo hover:text-tijolo"
                >
                  {seccao.nome}
                  <span aria-hidden className="text-tinta-suave">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </div>
  );
}
