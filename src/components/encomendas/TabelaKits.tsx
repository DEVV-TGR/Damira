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
  /**
   * O escalão escolhido **e de que lado o conteúdo novo entra**, num estado só.
   *
   * `direcao` é `1` a subir de escalão (entra de baixo, como o número que
   * cresce) e `-1` a descer.
   *
   * ⚠️ **Os dois juntos, e não dois `useState`.** Não é arrumação: são um par
   * que nunca pode ser lido desirmanado. Separados, qualquer render que
   * apanhasse o escalão novo com a direção velha desenhava a entrada para o lado
   * errado — e um `useRef` para a direção, que foi a primeira tentativa, é pior
   * ainda: ler um ref durante o render é precisamente o que o React não garante.
   */
  const [escolha, setEscolha] = useState({
    pessoas: escaloes[0],
    direcao: 1,
    /**
     * ⚠️ **A animação não corre na primeira pintura**, e isto é o que a trava.
     *
     * Com `animation-fill-mode: both` e um atraso por coluna, os cartões nascem
     * invisíveis e só aparecem 40 e 80 ms depois — quem chega à página vê as
     * três colunas a entrar sem ter feito nada, e numa captura de ecrã o Kit
     * Premium **não aparece de todo**. Foi assim que este defeito se apanhou.
     *
     * A animação existe para explicar uma troca. Sem troca não há nada para
     * explicar, e movimento sem informação é só ruído a atrasar a leitura.
     */
    trocou: false,
  });
  const { pessoas, direcao, trocou } = escolha;

  const escolher = (n: number) =>
    setEscolha({ pessoas: n, direcao: n > pessoas ? 1 : -1, trocou: true });

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
                onClick={() => escolher(n)}
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

      {/* `items-start` para cada cartão ter a altura do seu conteúdo. Esticados
          todos à altura do maior, o Kit Básico — que tem nove linhas contra as
          dezanove do Premium — ficava com meio cartão de branco por baixo, e um
          vazio desses lê-se como conteúdo em falta. O que alinha a comparação
          são os títulos e os preços, que ficam à mesma altura de qualquer
          maneira. */}
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
        {encomendas.kitsFesta.map((kit, indice) => {
          const escalao = escalaoDe(kit, pessoas);
          /* Uma gama pode não servir um escalão. Hoje servem todas as três, mas
             o dia em que a casa deixar de fazer o Premium de setenta não pode
             ser o dia em que esta coluna rebenta. */
          if (!escalao) return null;

          return (
            <article
              /* A `key` inclui o escalão de propósito: é o que faz o React
                 substituir o cartão em vez de o actualizar, e é a substituição
                 que reinicia a animação de entrada. Com a `key` só no `kit.id`,
                 o conteúdo mudava dentro do mesmo nó e a animação nunca voltava
                 a correr — que é como isto estava. */
              key={`${kit.id}-${escalao.pessoas}`}
              className={`flex flex-col rounded-2xl border border-tinta/15 p-7 ${
                trocou ? "escalao" : ""
              }`}
              style={
                {
                  "--direcao": direcao,
                  /* Um atraso mínimo por coluna: as três entram quase juntas,
                     mas não em uníssono. Acima de ~60 ms lê-se como três coisas
                     a acontecer em fila, que é mais lento sem ser mais claro. */
                  animationDelay: `${indice * 40}ms`,
                } as React.CSSProperties
              }
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
