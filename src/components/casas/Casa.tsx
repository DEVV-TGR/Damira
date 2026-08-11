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

  return (
    <article className="flex flex-col">
      <h3 className="titulo-display text-3xl sm:text-4xl">{casa.nome}</h3>

      <div className="mt-4 overflow-hidden rounded-lg border-2 border-tinta">
        {casa.fotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-0.5 bg-tinta">
            {casa.fotos.slice(0, 4).map((foto, indice) => (
              <div
                key={foto}
                /* A primeira ocupa a largura toda: é a capa da casa e é a que
                   tem de dizer, num relance, se é a sala ou a esplanada. */
                className={`relative aspect-[4/3] ${indice === 0 ? "col-span-2" : ""}`}
              >
                <Image
                  src={foto}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        ) : (
          /* Sem fotografias, um bloco assumido em vez de uma imagem cinzenta de
             marcador: assim vê-se que falta uma peça, em vez de parecer que a
             casa não tem nada para mostrar. */
          <div className="bloco-turquesa flex aspect-[16/10] items-center justify-center p-6 text-center text-sm font-bold uppercase tracking-widest">
            {t("semFotos")}
          </div>
        )}
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="font-bold uppercase tracking-wide">{t("direcoes")}</dt>
          <dd>
            <a
              href={urlDirecoes(casa)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-magenta-forte"
            >
              {moradaCompleta(casa)}
            </a>
          </dd>
        </div>

        {casa.telefone && (
          <div>
            <dt className="font-bold uppercase tracking-wide">{t("telefone")}</dt>
            <dd>
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
          <dt className="font-bold uppercase tracking-wide">{t("horario")}</dt>
          <dd>
            {casa.horarios === null ? (
              <p className="opacity-80">{t("semHorario")}</p>
            ) : (
              <ul className="tabular-nums">
                {DIAS_DA_SEMANA.map((dia) => {
                  const horario = casa.horarios![dia];
                  return (
                    <li key={dia} className="flex justify-between gap-4">
                      <span>{t(`dias.${dia}`)}</span>
                      <span>
                        {horario
                          ? `${horario.abre}–${horario.fecha}`
                          : t("encerrado")}
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
        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-wide">
            {t("entregaTitulo")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {entregas.map((entrega) => (
              <li key={entrega.chave}>
                <a
                  href={entrega.href}
                  target="_blank"
                  rel="noreferrer"
                  className="bloco-magenta-texto inline-block rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
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
