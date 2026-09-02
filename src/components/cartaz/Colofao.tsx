import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { casa, moradaCompleta, telefoneMarcavel, urlDirecoes } from "@/data/casa";
import { VaporMarca } from "./Vapor";

/* O horário é igual nos sete dias. Sai daqui e não de uma frase escrita à mão
   para o dia em que a casa mudar de hora não haver duas verdades no site. */
const SEGUNDA = casa.horarios?.segunda ?? null;

/**
 * # Capítulo VI: **o colofão**. E é aqui que o vapor assenta.
 *
 * A gramática editorial fecha em colofão: corpo pequeno, e a chamada escrita
 * como **linha de texto corrido** e não como um botão sozinho no meio do ecrã.
 * Uma peça em capítulos que acabasse num botão gordo estaria a mudar de
 * registo na última página.
 *
 * ## O fecho do movimento de assinatura
 *
 * As três ondas que correram a margem da página inteira desenham-se aqui à
 * escala do logótipo, e o traçado é conduzido pelo `--sc-p` deste acto: **a
 * marca desenha-se sozinha à medida que a página acaba**. É CSS puro contra o
 * progresso que o motor já publica, sem uma linha de JavaScript.
 *
 * É o quarto papel do vapor, e é o que fecha a ideia: o fio que desenhou a
 * página era a marca o tempo todo.
 *
 * ## As duas regras de deixa que só valem aqui
 *
 * ⚠️ **Este é o único acto da página que pode segurar.** As deixas de um valor
 * entram e ficam até ao fim, e é isso que impede o último ecrã de ficar vazio.
 * Em qualquer acto do meio isto seria um defeito; aqui é a regra.
 *
 * ⚠️ **E precisa de chão.** Um palco preso fica visível cerca de um ecrã antes
 * de o progresso sair do zero. O chão aqui é a tinta e o desenho da marca, que
 * já lá estão quando a primeira deixa ainda não abriu.
 */
export function Colofao() {
  const t = useTranslations("cartaz.colofao");

  return (
    <section
      id="cap-colofao"
      className="cap cap--colofao"
      data-capitulo
      data-sc-act="pin"
      data-sc-span="1.3"
      aria-labelledby="colofao"
    >
      <div data-sc-stage className="colofao__palco">
        <VaporMarca className="colofao__marca" />

        <div className="colofao__caixa">
          <p className="cap__olho" data-sc-cue="0 1 0 0">
            <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
          </p>

          <h2 id="colofao" className="cap__titulo" data-sc-cue="0.06">
            {t("titulo")}
          </h2>

          <p className="colofao__corrido" data-sc-cue="0.16">
            {/* ⚠️ **A cidade não entra aqui.** O `moradaCompleta()` já traz o
                código postal e a localidade, e interpolar `{cidade}` a seguir
                dava "4445-397 Ermesinde, em Ermesinde" — que passou o `build`,
                passou o `lint`, e só se apanhou a olhar para a captura. */}
            {t.rich("correr", {
              morada: moradaCompleta(),
              /* ⚠️ **A ligação é etiqueta e não valor.** O `t.rich` só aceita
                 texto, número ou data como valor de um `{campo}` — um elemento
                 de React ali rebenta a compilação de tipos. Quem quer marcação
                 usa uma etiqueta, e a etiqueta pode envolver o valor.

                 A morada leva o mapa porque é a única coisa que a antiga
                 secção de contactos fazia e o colofão tinha de continuar a
                 fazer: quem lê "venha cá" num telemóvel quer o caminho, não o
                 texto da rua. */
              mapa: (partes) => (
                <a href={urlDirecoes()} target="_blank" rel="noopener noreferrer">
                  {partes}
                </a>
              ),
              ementa: (partes) => <Link href="/ementa">{partes}</Link>,
              encomendas: (partes) => <Link href="/encomendas">{partes}</Link>,
            })}
          </p>

          {SEGUNDA && (
            <p className="colofao__horario" data-sc-cue="0.26">
              {t("horario", { abre: SEGUNDA.abre, fecha: SEGUNDA.fecha })}
            </p>
          )}

          {/* ⚠️ **O telefone é anulável no esquema da casa**, e por isso saiu
              da frase corrida: uma frase que o interpolasse escrevia "O
              telefone é o null" no dia em que alguém o apagasse do JSON. Aqui
              a linha inteira desaparece com ele, que é o comportamento certo,
              e o `build` obriga a que se pense nisto. */}
          <p className="colofao__fim" data-sc-cue="0.34">
            {casa.telefone && (
              <>
                <a href={`tel:${telefoneMarcavel()}`}>{casa.telefone}</a>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{t("fim")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
