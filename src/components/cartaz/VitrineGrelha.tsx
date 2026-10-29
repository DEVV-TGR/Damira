"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type FotoDaVitrine = {
  ficheiro: string;
  /** Já traduzido: quem traduz é a `Vitrine`, que é de servidor. */
  alt: string;
  larga: boolean;
};

/**
 * A grelha da vitrine, **com as primeiras fotografias à vista e o resto atrás
 * de um «Ver mais»** (#80, reunião com a casa a 12/10/2026).
 *
 * ## Porque seis
 *
 * ⚠️ **Seis fecham duas linhas inteiras no computador**, e não é coincidência:
 * com o padrão de larguras da `Vitrine` (larga, estreita, estreita · estreita,
 * larga, estreita), as seis primeiras somam oito colunas, duas linhas de
 * quatro. Com cinco ou sete o botão ficava por baixo de uma linha com um
 * buraco. No telemóvel a célula larga não ocupa duas colunas, portanto seis
 * são três linhas de duas. Quem mexer na ordem das `FOTOS` mexe nisto.
 *
 * ## As fotografias novas não nascem invisíveis, e podiam
 *
 * ⚠️ O motor esconde **todos** os filhos de um `[data-sc-stagger]` até lhes
 * pôr a classe `sc-in`, e só a põe uma vez, quando a grelha entra no ecrã.
 * Uma célula que chega depois disso nunca a recebia e ficava a `opacity: 0`
 * — o botão desaparecia e não aparecia nada. Por isso a classe é posta aqui,
 * pelo React, um quadro depois de as células existirem (para a transição do
 * motor ter de onde partir) e com o mesmo escalonamento de 40 ms.
 *
 * ## O foco vai para a primeira fotografia nova
 *
 * O botão some-se depois de usado, e um foco num elemento que deixou de existir
 * cai no `<body>`: quem usa teclado ou leitor de ecrã voltava ao topo da página.
 * A primeira célula nova recebe `tabIndex={-1}` — focável por código, fora da
 * ordem de tabulação — e o foco vai lá.
 */
export function VitrineGrelha({
  fotos,
  visiveis,
  rotuloMais,
}: {
  fotos: FotoDaVitrine[];
  visiveis: number;
  rotuloMais: string;
}) {
  const [aberta, setAberta] = useState(false);
  const [entraram, setEntraram] = useState(false);
  const primeiraNova = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!aberta) return;
    primeiraNova.current?.focus();
    const quadro = requestAnimationFrame(() => setEntraram(true));
    return () => cancelAnimationFrame(quadro);
  }, [aberta]);

  const mostradas = aberta ? fotos : fotos.slice(0, visiveis);
  const haMais = fotos.length > visiveis;

  return (
    <>
      <ul id="vitrine-grelha" className="vitrine__grelha" data-sc-in data-sc-stagger="40">
        {mostradas.map((foto, i) => {
          const nova = i >= visiveis;
          return (
            <li
              key={foto.ficheiro}
              ref={i === visiveis ? primeiraNova : undefined}
              tabIndex={i === visiveis ? -1 : undefined}
              /* ⚠️ As seis primeiras ficam com o `className` de sempre: o
                 motor já lhes escreveu o `sc-in` directamente no DOM, e um
                 `className` que mudasse aqui apagava-o. */
              className={nova && entraram ? "vitrine__celula sc-in" : "vitrine__celula"}
              style={nova ? { transitionDelay: `${(i - visiveis) * 40}ms` } : undefined}
              data-larga={foto.larga ? "" : undefined}
            >
              <Image
                src={`/vitrine/${foto.ficheiro}.webp`}
                alt={foto.alt}
                width={1400}
                height={875}
                loading="lazy"
                /* ⚠️ 46vw e não 90vw no telemóvel: a grelha é de duas colunas,
                   cada célula tem meio ecrã de largura, e pedir uma imagem de
                   ecrã inteiro a 3× (1170 px) para uma célula de 170 px era
                   descodificar as fotografias com quatro vezes os píxeis
                   necessários. É o custo mais pesado que um telemóvel paga
                   nesta página. */
                sizes="(max-width: 48rem) 46vw, (max-width: 72rem) 45vw, 30vw"
              />
            </li>
          );
        })}
      </ul>

      {haMais && !aberta && (
        <p className="vitrine__mais">
          <button
            type="button"
            className="cap__accao"
            aria-controls="vitrine-grelha"
            aria-expanded={false}
            onClick={() => setAberta(true)}
          >
            {rotuloMais}
          </button>
        </p>
      )}
    </>
  );
}
