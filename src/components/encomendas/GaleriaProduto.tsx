"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { FotoProduto } from "./FotoProduto";

/**
 * # As fotografias de um produto, na página dele (decidido a 26/11)
 *
 * A gerente pode pôr mais do que uma fotografia num produto, e cada escolha de
 * uma variância pode ter a sua (o bolo de morango, o de chocolate). A galeria
 * mostra uma grande e as outras em miniatura; **escolher um sabor que tem
 * fotografia mostra-a**, e tocar numa miniatura volta a mandar quem olha.
 *
 * ⚠️ Só as fotografias que a gerente pôs. Nenhuma se vai buscar a outro produto
 * nem a um banco de imagens (`AGENTS.md` › a regra da fotografia): sem nenhuma,
 * fica o espaço guardado da `FotoProduto`.
 *
 * O contexto existe porque a galeria e a compra são irmãs na página — uma em
 * cada coluna —, e o que se escolhe numa muda o que a outra mostra.
 */

type Estado = { foto: string | null; mostrar: (foto: string | null) => void };

const FotoEscolhida = createContext<Estado | null>(null);

/** Envolve as duas colunas da página. */
export function ComFotoEscolhida({ children }: { children: React.ReactNode }) {
  const [foto, mostrar] = useState<string | null>(null);
  return <FotoEscolhida.Provider value={{ foto, mostrar }}>{children}</FotoEscolhida.Provider>;
}

/** Para a compra mostrar a foto da escolha. Fora da página, não faz nada. */
export const useMostrarFoto = (): ((foto: string | null) => void) => useContext(FotoEscolhida)?.mostrar ?? (() => {});

export function GaleriaProduto({ fotos, alt }: { fotos: readonly string[]; alt: string }) {
  const t = useTranslations("produto");
  const estado = useContext(FotoEscolhida);
  /* Sem escolha, a primeira — a principal, que a gerente pôs à frente. */
  const atual = estado?.foto && fotos.includes(estado.foto) ? estado.foto : (estado?.foto ?? fotos[0] ?? null);

  if (fotos.length <= 1 && !estado?.foto) return <FotoProduto foto={fotos[0] ?? null} alt={alt} proporcao="3 / 2" />;

  return (
    <div>
      <FotoProduto foto={atual} alt={alt} proporcao="3 / 2" />
      {fotos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("fotografias")}>
          {fotos.map((foto, i) => (
            <li key={foto} className="shrink-0">
              <button
                type="button"
                onClick={() => estado?.mostrar(foto)}
                aria-label={t("verFotografia", { n: i + 1, total: fotos.length })}
                aria-current={foto === atual ? "true" : undefined}
                className={`relative block size-16 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo sm:size-20 ${
                  foto === atual ? "border-tijolo" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image src={foto} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
