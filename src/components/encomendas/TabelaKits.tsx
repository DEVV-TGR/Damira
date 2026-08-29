"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { encomendas, escaloesDisponiveis, escalaoDe } from "@/data/encomendas";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/**
 * Os três kits de festa, comparados lado a lado no escalão que se escolher.
 *
 * ## Porque a escolha é o número de pessoas e não a gama
 *
 * Porque é essa a primeira pergunta que alguém faz a si próprio — *somos
 * quantos?* — e a única a que sabe responder de imediato. A gama vem depois, e
 * só faz sentido comparada: entre o Básico de 20 (180 €) e o Premium de 20
 * (335 €) há 155 € de diferença, e o que os separa são camarão, mini
 * hambúrgueres e mais quatro linhas — coisa que só se percebe com as três
 * colunas à frente.
 *
 * O impresso não pode fazer isto: tem sete páginas, uma por gama e escalão, e
 * comparar duas obriga a folhear. É a única coisa que este site faz melhor do
 * que o papel de onde veio, e por isso é o centro da página.
 *
 * ## Sem JavaScript
 *
 * ⚠️ **Fica o primeiro escalão, e é tudo.** É uma perda real e assumida: o
 * conteúdo dos outros dois está no HTML de nenhum lado. A alternativa —
 * imprimir os nove escalões e esconder seis com CSS — carregava três vezes o
 * conteúdo para o leitor de ecrã ter de o percorrer todo. Quem chegar sem
 * JavaScript vê os kits de vinte pessoas e o telefone da casa, que é o que
 * interessa.
 */
export function TabelaKits({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.festas");
  const escaloes = escaloesDisponiveis();
  const [pessoas, setPessoas] = useState(escaloes[0]);

  return (
    <div className="envolvente mt-10">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
          {t("quantasPessoas")}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {escaloes.map((n) => {
            const activo = n === pessoas;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPessoas(n)}
                aria-pressed={activo}
                /* Utilitários e não `.bloco-tijolo`: o Tailwind v4 não aplica
                   variantes a classes de `@layer components`. */
                className={`premivel titulo-display rounded-full border px-6 py-2.5 text-sm tabular-nums ${
                  activo
                    ? "border-tijolo bg-tijolo text-papel"
                    : "border-tinta/25 hover:bg-tinta hover:text-papel"
                }`}
              >
                {t("pessoas", { n })}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {encomendas.kitsFesta.map((kit) => {
          const escalao = escalaoDe(kit, pessoas);
          /* Uma gama pode não servir um escalão. Hoje servem todas as três, mas
             o dia em que a casa deixar de fazer o Premium de setenta não pode
             ser o dia em que esta coluna rebenta. */
          if (!escalao) return null;

          return (
            <article
              key={kit.id}
              className="flex flex-col rounded-2xl border border-tinta/15 p-7"
            >
              <h3 className="titulo-display titulo-gama">{kit.nome[locale]}</h3>
              <p className="titulo-display mt-4 text-4xl tabular-nums text-tijolo">
                {formatarPreco(escalao.preco, locale)}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">
                {t("paraPessoas", { n: escalao.pessoas })}
              </p>

              <Bloco titulo={t("salgados")} linhas={escalao.salgados} locale={locale} />
              <Bloco titulo={t("doces")} linhas={escalao.doces} locale={locale} />
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  linhas,
  locale,
}: {
  titulo: string;
  linhas: { nome: { pt: string; en: string }; quantidade: { pt: string; en: string } }[];
  locale: Locale;
}) {
  return (
    <div className="mt-7">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        {titulo}
      </h4>
      <ul className="mt-2.5 space-y-1.5 text-sm">
        {linhas.map((linha) => (
          <li key={linha.nome.pt} className="flex justify-between gap-4">
            <span>{linha.nome[locale]}</span>
            <span className="shrink-0 tabular-nums text-tinta-suave">
              {linha.quantidade[locale]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
