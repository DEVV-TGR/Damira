import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Capítulo do vegan: **«Opções 100% vegan»**, o texto pedido no Notion.
 *
 * ## O «100%» enche-se; não se conta
 *
 * ⚠️ Esteve aqui um contador de 0 a 100. Um contador é uma afirmação com
 * movimento (`devices.md` › count), e a meio do percurso afirmava «37% vegan» —
 * durante quase toda a secção, porque contava até 0,9 do progresso. O número
 * está agora **sempre certo**: começa em contorno e enche-se de papel, de baixo
 * para cima, com a rolagem (`--raro-enche`, em `cartaz.css`). O movimento diz o
 * mesmo que a frase — cheio, todo — sem nunca escrever um valor que a casa não
 * deu.
 *
 * ## Chão, e só depois deixas
 *
 * É um acto preso, e um palco preso fica à vista cerca de um ecrã **antes** de
 * o progresso sair do zero. Por isso o título não tem deixa: é o chão, já lá
 * quando o verde chega. O que entra com deixas é o texto, em escada, depois de
 * o número encher. E nenhuma deixa segura até ao fim — só o último acto da
 * página o pode fazer —, por isso todas fecham a 1, com uma saída curta.
 */
export function Raro() {
  const t = useTranslations("cartaz.raro");

  return (
    <section
      id="cap-raro"
      className="cap cap--raro"
      data-capitulo
      data-sc-act="pin"
      /* 2,2 ecrãs: 1,2 de curso. Chega para o número encher (0,04 → 0,38) e
         o texto entrar (0,3 → 0,6) com o `dwell` a assentar a meio; com 2,5 e
         nada a acontecer depois do contador, sobrava um ecrã de verde parado. */
      data-sc-span="2.2"
      data-sc-dwell="0.3"
      aria-labelledby="raro"
    >
      <div data-sc-stage className="raro__palco">
        <div className="raro__caixa">
          {/* O `aria-label` dá a frase inteira: o «100%» desenhado está duas
              vezes (contorno e enchimento), e um leitor de ecrã ouvia-o duas. */}
          <h2 id="raro" className="raro__titulo" aria-label={t("titulo")}>
            {t.rich("tituloAnimado", {
              antes: (texto) => <span className="raro__linha">{texto}</span>,
              depois: (texto) => <span className="raro__linha">{texto}</span>,
              cem: () => (
                <span className="raro__cem" aria-hidden="true">
                  <span className="raro__cem-contorno">100%</span>
                  <span className="raro__cem-cheio">100%</span>
                </span>
              ),
            })}
          </h2>

          <p className="cap__texto raro__texto" data-sc-cue="0.3 1 0.25 0.06">
            {t("texto")}
          </p>
          <p className="cap__texto" data-sc-cue="0.38 1 0.25 0.06">
            {t("exemplo")}
          </p>
          <p className="raro__acao" data-sc-cue="0.46 1 0.25 0.06">
            {/* ⚠️ **`#da-ementa`, e não uma âncora da carta vegan.** Desde as
                famílias da gerente (#162) só as famílias têm `id`; as
                categorias não, de propósito (armadilha 8). Um `#carta-vegan`
                aterrava no topo da página sem aviso. */}
            <Link href="/encomendas#da-ementa" className="cap__ligacao">
              {t("ligacao")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
