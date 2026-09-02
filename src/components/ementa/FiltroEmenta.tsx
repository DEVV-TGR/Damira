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
 * ## ⚠️ Aqui esteve um interruptor «só vegan», e saiu por ser um bug de desenho
 *
 * Ficava ao lado da procura, por cima do separador «Vegan», e os dois liam-se
 * como a mesma coisa. Quem carregava no interruptor à espera de saltar para a
 * carta vegan via os separadores desaparecerem e o cabeçalho verde sumir, e
 * concluía que «não passou». O cliente reportou-o exactamente assim.
 *
 * E era redundante: o `superRefine` da ementa garante que `vegan: true` só
 * existe na carta vegan, portanto «só vegan» era, artigo por artigo, o
 * separador «Vegan». Duas portas para a mesma sala, uma delas a fingir que era
 * outra sala.
 */
export function FiltroEmenta({
  procura,
  aoProcurar,
  encontrados,
  total,
}: {
  procura: string;
  aoProcurar: (valor: string) => void;
  encontrados: number;
  total: number;
}) {
  const t = useTranslations("ementa");
  const id = useId();
  const activo = procura.trim().length > 0;

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

      {activo && (
        <div className="flex shrink-0 items-center gap-3">
          <p aria-live="polite" className="text-xs tabular-nums text-tinta-suave">
            {t("aMostrar", { n: encontrados, total })}
          </p>
          <button
            type="button"
            onClick={() => aoProcurar("")}
            className="premivel alvo-toque h-11 shrink-0 text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
          >
            {t("limpar")}
          </button>
        </div>
      )}
    </div>
  );
}
