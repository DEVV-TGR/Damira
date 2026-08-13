"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { porId, type Artigo, type Categoria } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { fotoDoArtigo } from "@/lib/fotos-ilustrativas";
import { EtiquetaPao, EtiquetaVegetariano, SeloBestSeller } from "./Etiquetas";

/**
 * As categorias onde o impresso **garante** o acompanhamento.
 *
 * A nota da carta diz "todos os hambúrgueres são acompanhados por batata".
 * `vegetariano-saladas` fica de fora de propósito: mistura três hambúrgueres com
 * três saladas e **não há campo que os distinga**. Deduzir pela descrição era
 * inventar o que vem no prato — e o que vem no prato é do cliente, não nosso.
 * O README pergunta à casa; quando responderem, esta lista muda numa linha.
 *
 * O `menu-infantil` também fica de fora porque já tem nota própria, com a bebida
 * incluída e o limite de idade.
 */
const CATEGORIAS_COM_BATATA: readonly Categoria[] = [
  "santos-novilho",
  "carnes-maturadas",
  "para-os-corajosos",
  "santos-frango",
  "outros-santos",
];

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

  const foto = artigo ? fotoDoArtigo(artigo) : null;
  const batataDoce = porId("batata-doce");
  const levaBatata = artigo ? CATEGORIAS_COM_BATATA.includes(artigo.categoria) : false;

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
          <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-tinta">
            {foto && (
              <Image
                src={foto.src}
                /* Decorativa: não descreve o prato. Ver `fotos-ilustrativas.ts`. */
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 28rem"
              />
            )}
            {foto?.ilustrativa && (
              <p className="absolute bottom-3 left-3 rounded-full bg-tinta/75 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-papel">
                {t("ilustrativa")}
              </p>
            )}
            <button
              type="button"
              onClick={aoFechar}
              aria-label={t("fechar")}
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-papel/90 text-tinta transition-colors hover:bg-papel"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="titulo-display text-3xl">{artigo.nome}</h2>
              <p className="titulo-display shrink-0 text-2xl tabular-nums">
                {formatarPreco(artigo.preco, locale)}
              </p>
            </div>

            {artigo.variantes && (
              <p className="mt-1.5 text-sm tabular-nums text-tinta-suave">
                {artigo.variantes
                  .map((v) => `${t(`variantes.${v.chave}`)} ${formatarPreco(v.preco, locale)}`)
                  .join(" · ")}
              </p>
            )}

            {(artigo.bestSeller || artigo.vegetariano || artigo.paes.length > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {artigo.bestSeller && <SeloBestSeller />}
                {artigo.paes.map((pao) => (
                  <EtiquetaPao key={pao} pao={pao} />
                ))}
                {artigo.vegetariano && <EtiquetaVegetariano />}
              </div>
            )}

            {artigo.descricao && (
              <p className="mt-5 leading-relaxed">{artigo.descricao[locale]}</p>
            )}

            {levaBatata && (
              <div className="mt-7 border-t border-tinta/15 pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                  {t("acompanhamento")}
                </p>
                <p className="mt-2 text-sm">{t("acompanhamentoTexto")}</p>
                {/* O preço vem do próprio `ementa.json` — é um extra com preço e
                    muda com a carta. Escrevê-lo à mão aqui era criar uma segunda
                    verdade que ninguém se lembra de actualizar. */}
                {batataDoce && (
                  <p className="mt-1 text-sm text-tinta-suave">
                    {t("batataDoce")} — {formatarPreco(batataDoce.preco, locale)}
                  </p>
                )}
              </div>
            )}

            <p className="mt-7 text-xs text-tinta-suave">{t("notas.alergenios")}</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
