"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

/**
 * # Procurar na ementa
 *
 * ## Porque é que uma carta de papel não tem isto e o site tem
 *
 * São **noventa e cinco artigos em quatro cartas**. No impresso desdobra-se a
 * folha e vê-se tudo de uma vez; num ecrã de telemóvel vê-se um oitavo de uma
 * secção, e quem procura o croissant recheado percorre setenta linhas até dar
 * com ele — ou desiste e telefona a perguntar, que é exactamente o trabalho que
 * este site existe para poupar à casa.
 *
 * A barra de cartas resolve metade do problema: leva a pessoa à carta certa.
 * Não resolve a outra metade, que é encontrar **um** artigo cujo nome já se
 * sabe.
 *
 * ## O que filtra, e porquê assim
 *
 * Filtra por **nome, descrição e sabores**, nas duas línguas ao mesmo tempo. Um
 * inglês que escreva "chocolate" acerta no artigo cujo nome português é
 * *Chocolate do Dubai*; um português que escreva "cookie" acerta no nome
 * inglês. São dados que já estão os dois carregados — filtrar só a língua
 * activa era esconder metade da informação que temos à mão.
 *
 * ⚠️ **Sem acentos e sem maiúsculas.** Quem escreve num telemóvel não põe
 * acentos, e uma procura por "pao" que não encontra *Pão da Aldeia* está
 * avariada aos olhos de quem a usou.
 *
 * ## O «só vegan» é um filtro e não uma decoração
 *
 * Metade da ementa é vegan e a casa assinala-o com uma folha verde. Quem procura
 * essa folha costuma ter uma razão para a procurar, e obrigá-la a ler os
 * noventa e cinco para separar quarenta e nove é fazê-la trabalhar por uma
 * informação que os dados já têm.
 */
export function FiltroEmenta({
  procura,
  aoProcurar,
  soVegan,
  aoAlternarVegan,
  encontrados,
  total,
}: {
  procura: string;
  aoProcurar: (valor: string) => void;
  soVegan: boolean;
  aoAlternarVegan: (valor: boolean) => void;
  encontrados: number;
  total: number;
}) {
  const t = useTranslations("ementa");
  const id = useId();
  const activo = procura.trim().length > 0 || soVegan;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative min-w-0 flex-1 basis-40">
        <label htmlFor={`${id}-procura`} className="sr-only">
          {t("procurar")}
        </label>
        {/* `type="search"` e não `text`: no iOS dá a tecla «procurar» em vez de
            «enter», e o browser oferece o botão de limpar nativo. */}
        <input
          id={`${id}-procura`}
          type="search"
          value={procura}
          onChange={(evento) => aoProcurar(evento.target.value)}
          placeholder={t("procurarDica")}
          className="h-11 w-full rounded-full border-2 border-tinta/20 bg-papel px-4 text-sm text-tinta placeholder:text-tinta-suave focus-visible:border-tijolo focus-visible:outline-none"
        />
      </div>

      {/* Um `<button>` com `aria-pressed` e não uma caixa de verificação: é um
          interruptor que muda a lista à frente da pessoa, não um campo que ela
          submete depois. */}
      <button
        type="button"
        aria-pressed={soVegan}
        onClick={() => aoAlternarVegan(!soVegan)}
        className={`premivel alvo-toque h-11 shrink-0 rounded-full border-2 px-3 text-xs font-semibold uppercase tracking-widest sm:px-4 ${
          soVegan
            ? "border-verde-forte bg-verde-forte text-papel"
            : "border-tinta/20 text-tinta hover:border-verde-forte hover:text-verde-forte"
        }`}
      >
        {t("soVegan")}
      </button>

      {activo && (
        <div className="flex shrink-0 items-center gap-3">
          <p aria-live="polite" className="text-xs tabular-nums text-tinta-suave">
            {t("aMostrar", { n: encontrados, total })}
          </p>
          <button
            type="button"
            onClick={() => {
              aoProcurar("");
              aoAlternarVegan(false);
            }}
            className="premivel alvo-toque h-11 shrink-0 text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
          >
            {t("limpar")}
          </button>
        </div>
      )}
    </div>
  );
}
