import { useTranslations } from "next-intl";

/**
 * O silêncio, e **é intencional** — está declarado no `BRIEF.md` para a
 * verificação o saber distinguir de rolagem morta.
 *
 * Meia altura de ecrã com uma linha só. O `feel.md` §2 diz que o pico tem de
 * ter de onde chegar: a seguir a isto o pão toma o ecrã inteiro, e é o vazio
 * daqui que lhe dá a diferença. Um ecrã vazio que se quis lê-se como
 * expectativa; um que sobrou lê-se como página avariada, e os dois dão a mesma
 * captura.
 *
 * Não é uma secção sem nada: tem uma frase, e a frase é a que abre o capítulo
 * seguinte antes de ele existir.
 */
export function Silencio() {
  const t = useTranslations("cartaz");

  return (
    <section className="cap cap--silencio" data-sc-act="flow" aria-hidden={false}>
      <p className="silencio__linha" data-sc-in>
        {t("silencio")}
      </p>
    </section>
  );
}
