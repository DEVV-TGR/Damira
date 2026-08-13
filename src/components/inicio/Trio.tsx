import Image from "next/image";
import { useTranslations } from "next-intl";
import { TRES_CARNES, oDoSelo, type Artigo } from "@/data/ementa";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatarPreco } from "@/lib/preco";
import { fotosDistintas, type FotoDeArtigo } from "@/lib/fotos-ilustrativas";

/**
 * Três carnes, três santos.
 *
 * ## Porque são três e não uma fila
 *
 * Aqui esteve um carrossel dos doze do selo, e depois cinco filas — uma por
 * família de santos. As cinco filas eram trinta e um cartões: **cinco secções
 * disfarçadas de uma**, e a homepage passava a ser a ementa outra vez.
 *
 * A homepage abre o apetite; a ementa é que serve a carta. Três cartões grandes
 * dizem *o que é isto* — novilho, carne maturada, frango — e mandam para lá. Não
 * há nada para arrastar, nada a andar, e a secção cabe num ecrã.
 *
 * ## Quem escolhe os três é o `ementa.json`
 *
 * Não há aqui nenhum `id` escrito à mão: cada cartão é o artigo com selo daquela
 * família (ver `oDoSelo`). Marcar outro artigo como `bestSeller` troca o
 * destaque sem tocar neste ficheiro, e tirar um da carta não deixa a homepage a
 * mostrar um prato que já não se serve.
 *
 * O `filter(Boolean)` não é defensivo por hábito: `oDoSelo` devolve `undefined`
 * numa família sem selo, e é o que impede a secção de rebentar se a casa
 * desmarcar o único best seller de uma delas.
 */
export function Trio({ locale }: { locale: Locale }) {
  const t = useTranslations("inicio.trio");
  const nomeFamilia = useTranslations("ementa.categorias");

  /* O tipo sai de `TRES_CARNES` e não de `Categoria`: o `as const` na fonte
     torna-o um tuplo de três literais, e alargá-lo aqui fazia o predicado
     prometer mais do que o `map` entrega. */
  type Carne = (typeof TRES_CARNES)[number];

  const trio = TRES_CARNES.map((categoria) => ({
    categoria,
    artigo: oDoSelo(categoria),
  })).filter(
    (par): par is { categoria: Carne; artigo: Artigo } => par.artigo !== undefined,
  );

  /* As três fotografias pedem-se de uma vez, e não uma a uma dentro do cartão:
     a reserva dos hambúrgueres tem quatro imagens e a escolha por `id` não sabe
     quem está ao lado de quem — dois destes três saíam iguais. Ver
     `fotosDistintas`. */
  const fotos = fotosDistintas(trio.map(({ artigo }) => artigo));

  return (
    <section aria-labelledby="trio" className="seccao">
      <div className="envolvente">
        <h2 id="trio" className="titulo-display titulo-beta max-w-[16ch]">
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[46ch] text-tinta-suave">{t("texto")}</p>

        {/* Três colunas iguais em ecrã largo; uma só no telemóvel. Sem
            `auto-fit`: são exactamente três e a grelha deve dizê-lo — com
            `auto-fit`, um quarto artigo com selo entrava sozinho e partia a
            ideia da secção, que é *uma carne de cada*. */}
        <ul className="mt-12 grid gap-5 sm:grid-cols-3">
          {trio.map(({ categoria, artigo }, indice) => (
            <Cartao
              key={artigo.id}
              artigo={artigo}
              foto={fotos[indice]}
              familia={nomeFamilia(categoria)}
              locale={locale}
            />
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/ementa"
            className="premivel rounded-full bg-tinta px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
          >
            {t("verTudo")}
          </Link>
          {/*
            ⚠️ **O aviso está aqui uma vez, e não em cada cartão.**

            As fotografias vêm de `src/lib/fotos-ilustrativas.ts`: são imagens da
            casa, não do prato — o campo `foto` está a `null` nos 122 artigos, e
            o aviso existe para que isso não passe por promessa. O carrossel que
            aqui esteve punha um selo em cima de cada fotografia; três selos em
            três cartões era mais aviso do que carta.
          */}
          <p className="max-w-[38ch] text-xs text-tinta-suave">
            {t("ilustrativas")}
          </p>
        </div>
      </div>
    </section>
  );
}

function Cartao({
  artigo,
  foto,
  familia,
  locale,
}: {
  artigo: Artigo;
  foto: FotoDeArtigo | null;
  familia: string;
  locale: Locale;
}) {
  return (
    <li className="relative flex flex-col justify-end overflow-hidden rounded-2xl bg-tinta text-papel">
      {foto && (
        <Image
          src={foto.src}
          /* Decorativa: **não descreve o prato**. Descrevê-la seria afirmar que
             a fotografia é daquele hambúrguer, que é exactamente o que não se
             sabe. */
          alt=""
          fill
          /* ⚠️ **Descer o `object-position` aqui não faz nada** — já foi tentado.
             O cartão é quase quadrado e as reservas são 4:3, por isso o `cover`
             escala pela altura e o que sobra é **largura**: o recorte é lateral
             e o eixo vertical não tem folga nenhuma para deslocar. Quem quiser
             mudar o que se vê tem de mudar a proporção do cartão, não isto. */
          className="object-cover"
          /* Três colunas de 78 rem no máximo: cada cartão nunca passa dos
             ~400 px, e as fotografias de recurso têm 1083 px ou mais. */
          sizes="(max-width: 40rem) 100vw, 26rem"
          loading="lazy"
        />
      )}

      {/* Véu de baixo para cima: é o que dá contraste ao texto sobre a
          fotografia. Ver `.veu-cartao` em `globals.css`. */}
      <div aria-hidden className="veu-cartao absolute inset-0" />

      {/* A altura vem daqui e não de uma proporção fixa: com `aspect-[4/5]` os
          três cartões ficavam iguais ao píxel e a descrição do mais comprido
          era cortada. Assim o mais alto manda, e a grelha iguala os outros. */}
      <div className="relative flex min-h-[clamp(20rem,42vw,24rem)] flex-col justify-end p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">
          {familia}
        </p>

        <h3 className="titulo-display mt-2 text-[clamp(1.6rem,3.2vw,2.1rem)]">
          <Link
            href={`/ementa#${artigo.id}`}
            /* O cartão inteiro é a área de clique: o `::after` cobre o `<li>`,
               que é o `relative` mais próximo. Uma ligação só no nome dava um
               alvo de dois centímetros num cartão de dez. */
            className="after:absolute after:inset-0 after:content-['']"
          >
            {artigo.nome}
          </Link>
        </h3>

        {artigo.descricao && (
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-papel/85">
            {artigo.descricao[locale]}
          </p>
        )}

        <p className="titulo-display mt-4 text-2xl tabular-nums">
          {formatarPreco(artigo.preco, locale)}
        </p>
      </div>
    </li>
  );
}
