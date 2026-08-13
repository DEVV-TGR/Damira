import Image from "next/image";
import { useTranslations } from "next-intl";
import { Reel } from "./Reel";

/**
 * A casa cheia: o mosaico de fotografia e vídeo.
 *
 * ## O que isto substitui
 *
 * Era uma faixa a correr com as mesmas doze imagens que o herói já mostrava —
 * mesma origem, mesmo gesto, mesmas fotografias, seis secções depois. **A página
 * repetia-se**, e a repetição roubava ao herói o que ele tinha de próprio.
 *
 * Agora está parada e é a maior secção da página. O movimento vem dos reels, que
 * são conteúdo, e não de a grelha andar.
 *
 * ## Só material em alta resolução
 *
 * ⚠️ **Nenhum recorte do `public/instagram/` entra aqui.** Têm 356 px e a esta
 * largura de coluna seriam ampliados para o dobro num ecrã de dupla densidade —
 * ver-se-ia o grão da compressão do Instagram numa secção que, ao lado, mostra
 * fotografia de 1286 px. O sítio deles é o herói, em ladrilho pequeno.
 *
 * A alternância entre vídeo e fotografia é deliberada: dois reels lado a lado
 * leem-se como um só clip partido em dois.
 */

/**
 * A proporção de cada ladrilho é a da origem, não uma decisão de composição: as
 * fotografias vêm a 4:5 (é o formato de publicação) e os reels a 9:16. É essa
 * diferença que dá o desencontro das colunas sem ninguém o desenhar.
 */
const LADRILHOS = [
  { reel: "02" },
  { foto: "06" },
  { foto: "03" },
  { reel: "01" },
  { foto: "05" },
  { reel: "03" },
  { foto: "07" },
  { foto: "04" },
] as const;

/**
 * Quatro colunas num ecrã de 1440 dão ~350 px por ladrilho. As fotografias têm
 * 1286 px e os reels 720 px: nunca se pede mais do que existe.
 */
const MEDIDAS = "(max-width: 48rem) 50vw, (max-width: 64rem) 33vw, 25vw";

export function CasaCheia() {
  const t = useTranslations("inicio.casaCheia");

  return (
    <section aria-labelledby="casa-cheia" className="seccao bg-papel-fundo">
      <div className="envolvente">
        <h2 id="casa-cheia" className="titulo-display titulo-alfa max-w-[16ch]">
          {t("titulo")}
        </h2>
      </div>

      {/* A sangrar: é a única secção que ignora a goteira, e é o que lhe dá o
          peso que a faixa antiga não tinha. */}
      <div className="mosaico surgir mt-12 px-[clamp(0.25rem,0.8vw,0.5rem)]">
        {LADRILHOS.map((ladrilho) =>
          "reel" in ladrilho ? (
            <Reel
              key={`reel-${ladrilho.reel}`}
              video={`/reels/${ladrilho.reel}.mp4`}
              cartaz={`/reels/${ladrilho.reel}.webp`}
              sizes={MEDIDAS}
              className="aspect-[9/16] w-full"
            />
          ) : (
            <div
              key={`foto-${ladrilho.foto}`}
              className="relative aspect-[4/5] w-full overflow-hidden"
            >
              <Image
                src={`/fotos/${ladrilho.foto}.webp`}
                /* Decorativas: são momentos da casa e não descrevem prato
                   nenhum. Legendá-las era afirmar o que não se sabe. */
                alt=""
                fill
                sizes={MEDIDAS}
                className="object-cover"
                /* Explícito e para todas: esta é a sexta secção da página, e
                   nenhuma destas imagens é vista sem percorrer meio site.
                   (Escrever `undefined` "para as três primeiras serem ansiosas"
                   não faz nada — o `undefined` do `next/image` já é `lazy`.) */
                loading="lazy"
              />
            </div>
          ),
        )}
      </div>

      <p className="envolvente mt-8 text-xs text-tinta-suave">{t("credito")}</p>
    </section>
  );
}
