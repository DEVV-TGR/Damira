"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { EtiquetaVegan } from "./Etiquetas";

/**
 * O detalhe de um artigo: **painel encostado ao lado em ecrã largo, folha a subir
 * de baixo no telemóvel.**
 *
 * Não é um modal ao centro, e é uma decisão de polegar: num telemóvel uma caixa
 * centrada põe o botão de fechar longe da mão e tapa a lista inteira. Uma folha
 * que sobe fecha-se com o gesto que a abriu e deixa ver de onde veio.
 *
 * É um `<dialog>` nativo com `showModal()`. O foco preso, o `Esc`, o fundo
 * inerte e a ordem das camadas vêm de borla — são exactamente as quatro coisas
 * que uma reimplementação com `<div role="dialog">` costuma errar. A diferença
 * entre painel e folha é uma *media query*, não dois componentes.
 *
 * ## Não há aqui fotografia, e não é esquecimento
 *
 * O Santo Burga mostrava neste sítio uma imagem de recurso, tirada de uma
 * reserva de fotografia de marca e marcada como ilustrativa. **A Damira não tem
 * reserva nenhuma** — não há uma única fotografia utilizável da casa (ver o
 * README) —, e a alternativa seria fotografia de banco de imagens. Um croissant
 * genérico ao lado do preço de um croissant é uma promessa que a casa não fez.
 *
 * O painel fica então com o que é verdade: nome, preço, descrição, sabores e o
 * aviso dos alergénios. Quando houver fotografia por artigo, entra por
 * `artigo.foto` e este bloco recebe-a — o campo já existe no esquema.
 */
export function PainelArtigo({
  artigo,
  locale,
  aoFechar,
}: {
  artigo: Artigo | null;
  locale: Locale;
  aoFechar: () => void;
}) {
  const t = useTranslations("ementa");
  const caixa = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = caixa.current;
    if (!dialogo) return;
    if (artigo && !dialogo.open) dialogo.showModal();
    if (!artigo && dialogo.open) dialogo.close();
  }, [artigo]);

  return (
    <dialog
      ref={caixa}
      onClose={aoFechar}
      /* Clicar fora fecha: o `::backdrop` não recebe eventos, mas um clique nele
         tem como alvo o próprio `<dialog>`, e o conteúdo vive num filho. */
      onClick={(evento) => {
        if (evento.target === caixa.current) aoFechar();
      }}
      className="painel-artigo bg-papel text-tinta"
      aria-label={artigo?.nome}
    >
      {artigo && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-tinta/15 p-7 pb-5">
            <div className="flex items-baseline gap-4">
              <h2 className="titulo-display text-3xl">
                {locale === "en" ? artigo.nomeEn : artigo.nome}
              </h2>
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label={t("fechar")}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-tinta/20 text-tinta transition-colors hover:bg-tinta hover:text-papel"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-7">
            {artigo.preco !== null && (
              <p className="titulo-display text-3xl tabular-nums">
                {formatarPreco(artigo.preco, locale)}
                {artigo.unidade === "kg" && (
                  <span className="text-sm font-normal text-tinta-suave">
                    {t("porQuilo")}
                  </span>
                )}
              </p>
            )}

            {artigo.variantes && (
              <ul className="space-y-1">
                {artigo.variantes.map((v) => (
                  <li
                    key={v.chave}
                    className="flex items-baseline gap-3 tabular-nums"
                  >
                    <span className="w-16 shrink-0 text-sm text-tinta-suave">
                      {v.chave}
                    </span>
                    <span className="titulo-display text-xl">
                      {formatarPreco(v.preco, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {artigo.vegan && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <EtiquetaVegan />
              </div>
            )}

            {artigo.descricao && (
              <p className="mt-5 leading-relaxed">{artigo.descricao[locale]}</p>
            )}

            {artigo.sabores.length > 0 && (
              <div className="mt-7 border-t border-tinta/15 pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                  {t("sabores")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm">
                  {artigo.sabores.map((sabor) => (
                    <li
                      key={sabor}
                      className="rounded-full border border-tinta/20 px-2.5 py-0.5"
                    >
                      {sabor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-7 text-xs text-tinta-suave">{t("notas.alergenios")}</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
