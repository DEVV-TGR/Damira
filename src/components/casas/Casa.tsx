import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  DIAS_DA_SEMANA,
  moradaCompleta,
  urlDirecoes,
  type Restaurante,
} from "@/data/restaurantes";

/**
 * O bloco de uma casa. **O nome vem antes da fotografia**, e é o ponto todo
 * desta secção: quem chega ao site com duas moradas na cabeça precisa de saber
 * qual das duas está a ver antes de decidir para onde vai. Uma galeria bonita
 * sem etiqueta obriga a adivinhar pela paisagem.
 */
export function Casa({ casa }: { casa: Restaurante }) {
  const t = useTranslations("casas");

  const entregas = [
    { chave: "uberEats", href: casa.entregas.uberEats },
    { chave: "glovo", href: casa.entregas.glovo },
    { chave: "boltFood", href: casa.entregas.boltFood },
  ].filter((e): e is { chave: string; href: string } => e.href !== null);

  const capa = casa.fotos[0];

  return (
    <article className="surgir">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
        {capa ? (
          <Image
            src={capa}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          /* Sem fotografia, um bloco assumido em vez de uma imagem cinzenta de
             marcador: assim vê-se que falta uma peça, em vez de parecer que a
             casa não tem nada para mostrar. */
          <div className="bloco-turquesa grid h-full place-items-center p-6 text-center text-sm font-bold uppercase tracking-widest">
            {t("semFotos")}
          </div>
        )}

        {/* A etiqueta assenta sobre a fotografia, num canto escuro e opaco — não
            translúcida. Uma etiqueta em vidro sobre uma foto clara é ilegível, e
            esta é a única coisa da secção que tem mesmo de se ler. */}
        <p className="absolute left-4 top-4 rounded-full bg-tinta px-4 py-2 text-xs font-bold uppercase tracking-widest text-papel">
          {casa.cidade}
        </p>
      </div>

      <h3 className="titulo-display mt-7 text-[clamp(1.75rem,3.5vw,2.5rem)]">
        {casa.nome}
      </h3>

      <dl className="mt-6 space-y-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("direcoes")}
          </dt>
          <dd className="mt-1">
            <a
              href={urlDirecoes(casa)}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-magenta decoration-2 underline-offset-4 hover:text-magenta-forte"
            >
              {moradaCompleta(casa)}
            </a>
          </dd>
        </div>

        {casa.telefone && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("telefone")}
            </dt>
            <dd className="mt-1">
              <a
                href={`tel:${casa.telefone.replace(/\s/g, "")}`}
                className="underline underline-offset-4"
              >
                {casa.telefone}
              </a>
            </dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("horario")}
          </dt>
          <dd className="mt-1">
            {casa.horarios === null ? (
              <p className="text-tinta-suave">{t("semHorario")}</p>
            ) : (
              <ul className="max-w-xs tabular-nums">
                {DIAS_DA_SEMANA.map((dia) => {
                  const horario = casa.horarios![dia];
                  return (
                    <li key={dia} className="flex justify-between gap-4 py-0.5">
                      <span>{t(`dias.${dia}`)}</span>
                      <span className={horario ? "" : "text-tinta-suave"}>
                        {horario ? `${horario.abre}–${horario.fecha}` : t("encerrado")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      {entregas.length > 0 && (
        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            {t("entregaTitulo")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {entregas.map((entrega) => (
              <li key={entrega.chave}>
                <a
                  href={entrega.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full border border-tinta/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-tinta hover:text-papel"
                >
                  {t(entrega.chave)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
