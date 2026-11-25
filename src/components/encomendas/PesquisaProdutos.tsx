"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { paraProcura } from "@/lib/vista";

/**
 * # Procurar um produto na página das encomendas (pedido de 25/11)
 *
 * Filtra os cartões **que já estão na página**, sem perguntar nada ao
 * servidor: a página continua estática, e procurar «croissant» é instantâneo
 * mesmo com rede fraca. Cada cartão traz o texto onde se procura
 * (`data-procura`, os dois nomes sem acentos), e cada secção ou categoria que
 * fique sem cartões à vista esconde-se com ele (`data-grupo-procura`).
 *
 * ⚠️ **Mexe no DOM e não no estado do React**, de propósito: os cartões são
 * componentes de servidor, e trazê-los para o cliente só para os filtrar metia
 * o catálogo inteiro no bundle do browser (ver `AGENTS.md`, «As páginas de
 * produto»). O que se toca é só o atributo `hidden`, que o React não escreve
 * nesses elementos — não há nada para ele desfazer.
 *
 * ⚠️ Ao procurar, as secções e categorias **abrem-se**: um resultado dentro de
 * uma secção minimizada era um resultado que ninguém via.
 */
export function PesquisaProdutos() {
  const t = useTranslations("encomendas.procura");
  const [texto, setTexto] = useState("");
  const [encontrados, setEncontrados] = useState<number | null>(null);

  useEffect(() => {
    const termo = paraProcura(texto);
    const cartoes = [...document.querySelectorAll<HTMLElement>("li[data-procura]")];
    for (const cartao of cartoes) cartao.hidden = termo !== "" && !(cartao.dataset.procura ?? "").includes(termo);
    for (const grupo of document.querySelectorAll<HTMLElement>("[data-grupo-procura]")) {
      grupo.hidden = termo !== "" && ![...grupo.querySelectorAll<HTMLElement>("li[data-procura]")].some((c) => !c.hidden);
      if (termo !== "" && !grupo.hidden) {
        for (const detalhes of grupo.querySelectorAll("details")) detalhes.open = true;
      }
    }
    // Contar o que ficou à vista é ler o DOM que este efeito acabou de mudar: é
    // um sistema de fora a avisar o React, que é para isso que o efeito serve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEncontrados(termo === "" ? null : cartoes.filter((c) => !c.hidden).length);
  }, [texto]);

  const termo = texto.trim();

  return (
    <div className="envolvente pt-10 sm:pt-12">
      <div role="search" className="max-w-xl">
        <label htmlFor="procurar-produto" className="text-sm font-semibold">
          {t("rotulo")}
        </label>
        <div className="relative mt-2">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave"
          >
            <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13 13 4.25 4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="procurar-produto"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t("exemplo")}
            autoComplete="off"
            className="[&::-webkit-search-cancel-button]:appearance-none min-h-12 w-full rounded-full border border-tinta/20 bg-papel py-3 pl-12 pr-24 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded-full px-4 text-xs font-semibold uppercase tracking-widest hover:bg-tinta/5"
            >
              {t("limpar")}
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-tinta-suave">
          {encontrados === null
            ? ""
            : encontrados === 0
              ? t("nenhum", { texto: termo })
              : t("resultados", { n: encontrados, texto: termo })}
        </p>
      </div>
    </div>
  );
}
