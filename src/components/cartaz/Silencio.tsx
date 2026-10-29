import { useTranslations } from "next-intl";

/**
 * O silêncio, e **é intencional** — está declarado no `BRIEF.md` para a
 * verificação o saber distinguir de rolagem morta.
 *
 * Meia altura de ecrã com uma linha só. O `feel.md` §2 diz que o pico tem de
 * ter de onde chegar, e foi para isso que nasceu: o vazio daqui dava ao pão a
 * diferença. Um ecrã vazio que se quis lê-se como expectativa; um que sobrou
 * lê-se como página avariada, e os dois dão a mesma captura.
 *
 * Não é uma secção sem nada: tem uma frase, e a frase anuncia o pão.
 *
 * ⚠️ **Desde 12/10/2026 o que vem a seguir é o vegan, e não o pão** (#79): a
 * casa pediu o capítulo vegan logo depois desta frase. A frase ficou igual
 * porque foi a casa que a quis aqui; se alguém a achar órfã, é com a casa que
 * se fala, não com o ficheiro.
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
