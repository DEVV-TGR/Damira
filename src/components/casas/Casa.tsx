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
 * qual das duas está a ver antes de decidir para onde vai.
 *
 * ## Porque a fotografia é pequena
 *
 * ⚠️ **A fotografia de Leça tem 588 px de largura.** Estava a ser servida num
 * bloco de meia página com `sizes="…50vw"`, o que num ecrã de 1440 a dupla
 * densidade pede 1440 px — uma **ampliação de 2,4×**, já em produção e sem
 * ninguém dar por ela.
 *
 * A correção não é aumentar a `sizes`: é reconhecer o que a fotografia faz aqui.
 * Nesta secção a imagem **identifica** a casa — serve para saber qual das duas se
 * está a ler — e não para dar vontade de comer; disso trata o mosaico, com
 * fotografia de 1286 px. Travada nos 320 px, a de Leça fica a 1,09× num ecrã de
 * dupla densidade e a do Porto (1280 px) sobra.
 *
 * A linha inteira por casa, em vez de duas colunas lado a lado, é o que dá à
 * secção o peso de fecho que lhe faltava.
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
    <article className="surgir grid gap-8 sm:grid-cols-[clamp(9rem,26vw,20rem)_1fr] sm:gap-10">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        {capa ? (
          <Image
            src={capa}
            alt=""
            fill
            className="object-cover"
            /* Nunca acima da origem — ver o comentário do componente. */
            sizes="(max-width: 40rem) 100vw, 20rem"
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
        <p className="absolute left-3 top-3 rounded-full bg-tinta px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-papel">
          {casa.cidade}
        </p>
      </div>

      <div>
        <h3 className="titulo-display titulo-gama">{casa.nome}</h3>

        <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("direcoes")}
            </dt>
            <dd className="mt-1">
              <a
                href={urlDirecoes(casa)}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-magenta decoration-2 underline-offset-4 transition-colors duration-200 hover:text-magenta-forte"
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

          {/* Sem `col-span`: hoje não há telefone nos dados, e forçar o horário
              a ocupar a linha inteira deixava metade da primeira linha em branco
              ao lado das direções. Assim as duas primeiras entradas — sejam
              quais forem — ficam lado a lado e a terceira desce sozinha. */}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("horario")}
            </dt>
            <dd className="mt-1">
              {casa.horarios === null ? (
                /**
                 * ⚠️ **A frase depende de haver telefone.** Estava escrita a
                 * dizer "o mais seguro é telefonar" e o `telefone` é `null` nas
                 * duas casas — a secção mandava telefonar e não dava número
                 * nenhum. Assim volta sozinha no dia em que o número entrar no
                 * `restaurantes.json`.
                 */
                <p className="max-w-[42ch] text-tinta-suave">
                  {casa.telefone ? t("semHorarioComTelefone") : t("semHorario")}
                </p>
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
                    className="premivel inline-block rounded-full border border-tinta/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-tinta hover:text-papel"
                  >
                    {t(entrega.chave)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
