import { useTranslations } from "next-intl";
import {
  casa,
  moradaCompleta,
  urlDirecoes,
  telefoneMarcavel,
  horariosAgrupados,
  type DiaDaSemana,
} from "@/data/casa";

/**
 * A morada, o telefone, o horário e o Bolt Food.
 *
 * ## O horário vem agrupado, e é o que faz esta secção caber
 *
 * A Damira abre os sete dias das 7h às 21h. Escrito dia a dia, isso são sete
 * linhas iguais que ninguém lê e que empurram a morada para baixo da dobra. O
 * `horariosAgrupados()` junta os dias com o mesmo horário e escreve
 * "Segunda a domingo, 7h–21h" — e no dia em que o domingo for diferente parte o
 * grupo sozinho, sem ninguém ter de reescrever a tabela. Ver `casa.ts`.
 *
 * ⚠️ **O horário está por confirmar.** Vem do cartão de contactos da casa, que
 * anuncia "07h00 - 21h00" sem dizer a que dias se aplica. Enquanto não for
 * confirmado dia a dia, a nota por baixo diz isso mesmo — mandar alguém a uma
 * porta fechada é o pior erro que uma página de contactos pode cometer.
 */
export function Contactos() {
  const t = useTranslations("casa");
  const dias = useTranslations("casa.dias");
  const grupos = horariosAgrupados();
  const telefone = telefoneMarcavel();

  return (
    <section aria-labelledby="contactos" className="seccao bg-papel-fundo">
      <div className="envolvente">
        <h2 id="contactos" className="titulo-display titulo-beta max-w-[14ch]">
          {t("titulo")}
        </h2>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("morada")}
            </h3>
            <a
              href={urlDirecoes()}
              target="_blank"
              rel="noreferrer"
              className="premivel mt-3 block text-lg leading-relaxed underline decoration-tijolo decoration-2 underline-offset-4"
            >
              {moradaCompleta()}
            </a>
            <p className="mt-2 text-sm text-tinta-suave">{t("direcoes")}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("horario")}
            </h3>
            {grupos ? (
              <>
                <ul className="mt-3 space-y-1 text-lg leading-relaxed">
                  {grupos.map((grupo) => (
                    <li key={grupo.dias[0]}>
                      {nomeDoGrupo(grupo.dias, dias, (primeiro, ultimo) =>
                        t("intervaloDias", { primeiro, ultimo }),
                      )}
                      {" · "}
                      {grupo.horario
                        ? `${grupo.horario.abre}–${grupo.horario.fecha}`
                        : t("encerrado")}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-tinta-suave">
                  {t("horarioPorConfirmar")}
                </p>
              </>
            ) : (
              <p className="mt-3 text-tinta-suave">{t("semHorario")}</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("falarConnosco")}
            </h3>
            <ul className="mt-3 space-y-1 text-lg leading-relaxed">
              {telefone && (
                <li>
                  <a href={telefone} className="premivel alvo-toque underline underline-offset-4">
                    {casa.telefone}
                  </a>
                </li>
              )}
              {casa.email && (
                <li>
                  <a
                    href={`mailto:${casa.email}`}
                    className="premivel alvo-toque break-all underline underline-offset-4"
                  >
                    {casa.email}
                  </a>
                </li>
              )}
            </ul>

            {/* O Bolt Food é o único endereço de entrega confirmado. O Uber Eats
                e o Glovo estão a `null` e o botão simplesmente não aparece —
                melhor do que um link adivinhado que dá 404 a quem tem fome. */}
            {casa.entregas.boltFood && (
              <a
                href={casa.entregas.boltFood}
                target="_blank"
                rel="noreferrer"
                className="premivel mt-6 inline-block rounded-full bg-tinta px-6 py-3 text-sm font-semibold uppercase tracking-widest text-papel"
              >
                {t("boltFood")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Segunda a Domingo" para um grupo seguido, "Domingo" para um dia só.
 *
 * ⚠️ **O intervalo escreve-se por extenso e não com um travessão.** Isto dizia
 * `Segunda – Domingo`, e um traço entre dois dias tanto se lê como "de segunda
 * a domingo" como "segunda e domingo" — que é meia semana de diferença para
 * quem está a decidir se vale a pena a viagem. A palavra não tem esse
 * problema, e é o que o comentário desta secção já dizia que aqui estava.
 *
 * A ligação vem das mensagens (`casa.intervaloDias`) porque **é palavra**: em
 * inglês é "to" e não "a", e um traço escrito no código servia as duas línguas
 * por não dizer nada em nenhuma.
 *
 * Não trata do caso de dois dias soltos ("segunda e quarta") de propósito: os
 * grupos saem sempre seguidos, porque `horariosAgrupados()` percorre a semana
 * por ordem e só corta quando o horário muda.
 */
function nomeDoGrupo(
  grupo: DiaDaSemana[],
  dias: (chave: DiaDaSemana) => string,
  intervalo: (primeiro: string, ultimo: string) => string,
): string {
  const primeiro = dias(grupo[0]);
  if (grupo.length === 1) return primeiro;
  return intervalo(primeiro, dias(grupo[grupo.length - 1]));
}
