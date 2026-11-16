import { getTranslations } from "next-intl/server";
import type { Bloco, Seccao } from "@/lib/legal/tipos";

/**
 * O desenho comum das páginas legais (`/privacidade`, `/condicoes`): título,
 * data da última versão, índice e as secções. O texto vem de `src/lib/legal/`.
 *
 * O texto é sempre em português, mesmo na `/en` (ver `tipos.ts`): por isso o
 * `lang="pt"` à volta dele, para os leitores de ecrã o lerem com a voz certa.
 */
export async function PaginaLegal({
  locale,
  titulo,
  atualizadaEm,
  seccoes,
  email,
}: {
  locale: string;
  titulo: string;
  /** `AAAA-MM-DD`. */
  atualizadaEm: string;
  seccoes: Seccao[];
  email: string;
}) {
  const t = await getTranslations({ locale, namespace: "legal" });

  /* A data escreve-se à mão: é uma data de calendário, sem hora, e o `Intl`
     num servidor em UTC já pôs uma no dia anterior uma vez. */
  const [ano, mes, dia] = atualizadaEm.split("-");
  const data = `${dia}/${mes}/${ano}`;

  return (
    <div className="seccao">
      <div className="envolvente">
        {/* A medida num `<div>` por dentro, e não ao lado da `.envolvente`
            (armadilha 14 do AGENTS.md). 42 rem é uma linha de leitura. */}
        <article className="max-w-[42rem]">
          <p className="titulo-display text-xs uppercase tracking-[0.3em] text-tijolo">{t("olho")}</p>
          <h1 className="titulo-display titulo-beta mt-4">{titulo}</h1>
          <p className="mt-4 text-sm text-tinta-suave">{t("atualizadaEm", { data })}</p>

          {locale !== "pt" && (
            <p lang="en" className="mt-6 border-l-4 border-tijolo pl-4 text-tinta-suave">
              {t("apenasPortugues")}
            </p>
          )}

          <nav aria-label={t("indice")} className="mt-10 border-y border-tinta/15 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tinta-suave">{t("indice")}</p>
            <ol className="mt-3 space-y-1 text-sm" lang="pt">
              {seccoes.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="alvo-toque inline-flex min-h-8 items-center underline decoration-tijolo/40 underline-offset-4 hover:decoration-tijolo"
                  >
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div lang="pt">
            {seccoes.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-12 scroll-mt-28">
                <h2 id={`${s.id}-titulo`} className="titulo-display text-2xl leading-tight">
                  {s.titulo}
                </h2>
                <Blocos blocos={s.blocos} />
                {s.subseccoes?.map((sub) => (
                  <div key={sub.titulo} className="mt-6">
                    <h3 className="font-semibold">{sub.titulo}</h3>
                    <Blocos blocos={sub.blocos} />
                  </div>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-14 border-t border-tinta/15 pt-6 text-sm text-tinta-suave">
            {t("contacto")}{" "}
            <a href={`mailto:${email}`} className="font-semibold text-tijolo underline underline-offset-4">
              {email}
            </a>
          </p>
        </article>
      </div>
    </div>
  );
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return blocos.map((b, i) =>
    typeof b === "string" ? (
      <p key={i} className="mt-3 leading-relaxed">
        {b}
      </p>
    ) : (
      <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-tijolo">
        {b.lista.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ),
  );
}
