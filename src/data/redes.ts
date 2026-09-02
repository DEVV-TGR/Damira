import { z } from "zod";
import dados from "./redes.json";
import { erroDeFicheiro } from "./erros";

/**
 * # Os reels da casa
 *
 * A casa publica vídeo no Instagram, tudo em formato reel. Esta lista é o sítio
 * onde eles entram no site.
 *
 * ## Porque é que hoje estão todos vazios
 *
 * ⚠️ **Um espaço vazio é uma decisão, não um esquecimento.** Não temos os
 * endereços dos reels nem as imagens de capa deles, e o `marca.json` tem o
 * Instagram a `null` — nem sequer sabemos a conta. Havia duas saídas: não fazer
 * a secção, ou pô-la com vídeo de outra pessoa. A primeira adiava o trabalho
 * todo para o dia em que os endereços aparecessem; a segunda é a mesma
 * proibição que vale para as fotografias de banco de imagens.
 *
 * Esta é a terceira: **a secção existe, com os lugares desenhados e vazios**,
 * e enche-se um a um à medida que os endereços chegarem. O sítio já está
 * medido, já é acessível e já entra no `build`. Encher um lugar é acrescentar
 * duas linhas a este JSON.
 *
 * ## Como se enche um lugar
 *
 * ```json
 * { "id": "reel-1",
 *   "url": "https://www.instagram.com/reel/XXXXXXXXXXX/",
 *   "poster": "/reels/01.webp" }
 * ```
 *
 * A capa põe-se em `public/reels/`, no formato do reel (9:16), e passa pelo
 * mesmo tratamento das outras:
 *
 * ```bash
 * npm run fotos -- originais/reels public/reels
 * ```
 *
 * ⚠️ **Não se incorpora o reel em `<iframe>`.** O incorporador do Instagram
 * traz *scripts* de terceiros e cookies de seguimento para dentro do site, e
 * este não tem nem uma coisa nem outra. Uma capa nossa que abre o reel no
 * Instagram dá o mesmo ao visitante e não muda o que o site é.
 */
const Reel = z
  .object({
    id: z.string().min(1),
    url: z.url().nullable(),
    poster: z
      .string()
      .regex(/^\/reels\//, "a capa tem de viver em `public/reels/`")
      .nullable(),
  })
  /* ⚠️ Uma capa sem endereço é um cartaz que não abre nada, e um endereço sem
     capa é um retângulo vazio clicável. Os dois campos andam juntos ou não
     andam: o `build` é que tem de dar por isso, e não o visitante. */
  .superRefine((reel, ctx) => {
    if ((reel.url === null) !== (reel.poster === null)) {
      ctx.addIssue({
        code: "custom",
        message: `«${reel.id}»: o endereço e a capa preenchem-se ao mesmo tempo, ou ficam os dois vazios.`,
      });
    }
  });

const EsquemaRedes = z.object({ reels: z.array(Reel) });

const resultado = EsquemaRedes.safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/redes.json", resultado.error, dados.reels);
}

export type Reel = z.infer<typeof Reel>;
export const redes = resultado.data;

/** Um reel está publicado quando tem endereço **e** capa. */
export const publicado = (reel: Reel): boolean => reel.url !== null;
