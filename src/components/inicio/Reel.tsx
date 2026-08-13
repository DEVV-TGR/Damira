"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Um reel do Instagram a tocar dentro do desenho.
 *
 * ## É isto que dá movimento à página sem o forçar
 *
 * A página tinha cinco coisas a andar sozinhas — duas filas no herói, duas fitas
 * e um carrossel — e nenhuma delas se referia ao que estava a dizer: eram
 * **interface a mexer**. Ficaram três gestos, e este é o que faz o trabalho:
 * comida a ser servida, molho a cair, quatro mãos a levantar hambúrgueres. É
 * conteúdo em movimento, que é a única espécie de movimento que ninguém acha a
 * mais.
 *
 * ## A fotografia está sempre lá por baixo
 *
 * O `<video>` **não** usa o atributo `poster`: por baixo dele há um `<Image>`
 * verdadeiro, servido pelo optimizador do Next no tamanho certo para cada ecrã.
 * O `poster` nativo serviria sempre o mesmo ficheiro a toda a gente.
 *
 * Daí sai tudo o resto de graça: se o vídeo não carregar, se o browser recusar
 * o arranque automático, ou se quem visita pediu menos movimento — vê-se a
 * fotografia, e não um rectângulo preto. O vídeo entra por cima com um fundido
 * curto quando começa mesmo a tocar, e não quando *devia* ter começado.
 *
 * ## `preload="none"` e só toca no ecrã
 *
 * ⚠️ **Quatro reels a descarregar ao carregar a página são 2,3 MB que ninguém
 * pediu.** Nada é descarregado até o elemento entrar no ecrã, e pára quando sai.
 * Num telemóvel a olhar só para o herói, o custo é zero.
 *
 * Com `prefers-reduced-motion: reduce` o `<video>` **nem chega a existir** no
 * documento — não é escondido, não é pausado, não é descarregado.
 */
export function Reel({
  video,
  cartaz,
  sizes,
  className = "",
  prioridade = false,
}: {
  /** Caminho do `.mp4` em `public/reels/`. */
  video: string;
  /** A fotografia por baixo. Nem sempre é o cartaz gerado pelo script: onde
   *  houver uma fotografia do mesmo momento em alta resolução, é essa que entra. */
  cartaz: string;
  sizes: string;
  className?: string;
  prioridade?: boolean;
}) {
  const elemento = useRef<HTMLVideoElement>(null);
  const [aTocar, setATocar] = useState(false);
  const [comMovimento, setComMovimento] = useState(false);

  /**
   * ⚠️ **Subscrever a preferência, não a ler uma vez.** Ler no arranque e nunca
   * mais deixava o vídeo a tocar a quem ligasse a redução de movimento a meio da
   * visita — e é exactamente aí que alguém a liga: quando o movimento já o
   * incomodou.
   */
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setComMovimento(!consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    const alvo = elemento.current;
    if (!alvo) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          /* Pode ser recusado — política de arranque automático, poupança de
             bateria, sem rede. Fica a fotografia, que é um fim aceitável. */
          alvo.play().catch(() => {});
        } else {
          alvo.pause();
        }
      },
      /* Um quarto visível: baixo que chegue para já estar a tocar quando o
         elemento fica à vista, alto que chegue para não arrancar por causa de
         uma nesga na margem do ecrã. */
      { threshold: 0.25 },
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [comMovimento]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={cartaz}
        /* Decorativa, como todas as fotografias do site: são momentos da casa e
           não descrevem um prato. */
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
        priority={prioridade}
      />

      {comMovimento && (
        <video
          ref={elemento}
          /* `muted` não é opção: um vídeo com som não arranca sozinho em browser
             nenhum. E o ficheiro já vem sem faixa de áudio — ver
             `scripts/preparar-reels.mjs`. */
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setATocar(true)}
          onPause={() => setATocar(false)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
            aTocar ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionTimingFunction: "var(--ease-saida)" }}
        >
          <source src={video} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
