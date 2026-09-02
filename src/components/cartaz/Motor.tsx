"use client";

import Script from "next/script";
import { useCallback } from "react";

/** O que o motor expõe em `window`. É um script clássico, não um módulo. */
type MotorGlobal = { ScrollCraft?: { mount: (raiz: Element) => void } };

/**
 * Carrega e monta o motor do scrollcraft.
 *
 * ## Porque é um `<Script>` e não um `import`
 *
 * O ficheiro em `public/scrollcraft/scrollcraft.js` está **byte a byte igual**
 * ao da skill, e é para ficar assim: é o mecanismo, e a regra da skill é que
 * nunca se edita. Um `import` obrigava a envolvê-lo num módulo — o que já é
 * editá-lo. Servido de `public/`, continua a ser o mesmo ficheiro, e
 * actualizá-lo é um `cp`.
 *
 * ⚠️ **`onReady` e não `onLoad`.** O `onLoad` dispara uma vez, quando o script
 * desce da rede. Quem sai da homepage para a ementa e volta atrás encontra o
 * script já carregado, o `onLoad` não repete, e a página volta sem actos
 * nenhuns — as secções ficam paradas e a rolagem não faz nada. O `onReady`
 * corre também nessas voltas.
 *
 * Monta-se na `<section>` do cartaz e não no `document.body` como o exemplo da
 * skill: o cabeçalho e o rodapé do sítio não têm `data-sc-*` nenhum, e dar-lhe
 * a árvore inteira é dar-lhe mais para percorrer sem nada para encontrar.
 */
export function Motor() {
  const montar = useCallback(() => {
    const motor = (window as unknown as MotorGlobal).ScrollCraft;
    const raiz = document.getElementById("cartaz");
    if (motor && raiz) motor.mount(raiz);
  }, []);

  return (
    <Script
      src="/scrollcraft/scrollcraft.js"
      strategy="afterInteractive"
      onReady={montar}
    />
  );
}
