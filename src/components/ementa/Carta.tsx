"use client";

import { useState } from "react";
import { categoriasComArtigos, type Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { NavegacaoEmenta } from "./NavegacaoEmenta";
import { SeccaoEmenta } from "./SeccaoEmenta";
import { PainelArtigo } from "./PainelArtigo";

/**
 * A carta inteira, e o painel que se abre por cima dela.
 *
 * É um componente de cliente porque o estado do artigo aberto tem de viver
 * algures acima das doze secções. Os dados são o `ementa.json` já validado — vão
 * para o cliente uma vez, e daí em diante abrir um artigo não pede nada ao
 * servidor.
 *
 * **Sem JavaScript continua a ler-se tudo:** as secções são marcação normal e
 * cada artigo tem a sua âncora. O painel é um acréscimo, não a única forma de
 * ler a carta.
 */
export function Carta({ locale }: { locale: Locale }) {
  const [aberto, setAberto] = useState<Artigo | null>(null);
  const categorias = categoriasComArtigos();

  return (
    <>
      <NavegacaoEmenta categorias={categorias} />

      {categorias.map((categoria, indice) => (
        <SeccaoEmenta
          key={categoria}
          categoria={categoria}
          indice={indice}
          locale={locale}
          aoAbrir={setAberto}
        />
      ))}

      {/* O `<dialog>` devolve o foco ao elemento que o abriu quando fecha — é
          comportamento nativo e é por isso que não há aqui um `ref` a guardá-lo. */}
      <PainelArtigo artigo={aberto} locale={locale} aoFechar={() => setAberto(null)} />
    </>
  );
}
