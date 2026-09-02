"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * O atalho para as encomendas, flutuante no canto.
 *
 * ## Porque existe
 *
 * Porque é a acção de maior valor do site — uma encomenda de festa vale
 * trezentos euros e um croissant vale um — e até aqui só se lá chegava pelo
 * herói, pelo cabeçalho ou pelo fim da página. Quem está a meio da ementa, que
 * é onde as pessoas passam mais tempo, não tem nada à mão.
 *
 * ## As duas regras que o impedem de ser um estorvo
 *
 * ⚠️ **Não aparece no primeiro ecrã.** O herói já tem um botão de encomendas a
 * dois centímetros; um terceiro por cima seria a mesma acção repetida três
 * vezes no mesmo campo de visão. Só entra depois de o herói sair — e é por isso
 * que aparecer é informação: quer dizer "já andaste, e isto continua aqui".
 *
 * ⚠️ **Não aparece na própria página de encomendas.** Um botão a apontar para a
 * página onde já se está não é atalho, é ruído — e é o erro que faz um site
 * parecer montado por peças em vez de composto.
 *
 * ## Como decide que o herói saiu
 *
 * Por posição de scroll e não por `IntersectionObserver` sobre o herói: este
 * botão vive no *layout* e existe em todas as páginas, e o herói só existe na
 * homepage. Observar um elemento que às vezes não está lá dava um observador
 * que falha em silêncio em duas das três páginas.
 *
 * O ouvinte é `passive`, que é o que impede o browser de esperar por nós antes
 * de desenhar o quadro seguinte — sem isso, um ouvinte de scroll é das formas
 * mais fáceis de tornar uma página lenta a sério.
 */
export function BotaoEncomendar() {
  const t = useTranslations("nav");
  const caminho = usePathname();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    /* 85% da altura da janela: o herói ocupa quase um ecrã, e este valor faz o
       botão entrar mesmo antes de ele acabar, em vez de esperar pelo fim e
       aparecer com atraso sobre a secção seguinte. */
    const limiar = () => window.innerHeight * 0.85;
    const verificar = () => setVisivel(window.scrollY > limiar());

    verificar();
    window.addEventListener("scroll", verificar, { passive: true });
    window.addEventListener("resize", verificar, { passive: true });
    return () => {
      window.removeEventListener("scroll", verificar);
      window.removeEventListener("resize", verificar);
    };
  }, []);

  if (caminho === "/encomendas") return null;

  return (
    <Link
      href="/encomendas"
      /* `aria-hidden` e `tabIndex` quando está escondido: sem isso, o botão
         continua a receber foco por teclado enquanto está invisível, e quem
         tabula cai num link que não vê. A opacidade sozinha não tira nada do
         documento. */
      aria-hidden={!visivel}
      tabIndex={visivel ? undefined : -1}
      /* Gancho para o CSS o poder tirar de uma página. A página inicial é um
         cartaz em capítulos e a gramática dela não admite chrome flutuante por
         cima da estampa — ver `cartaz.css`. Um atributo é mais estável do que
         apanhar isto por uma classe de utilitário, que muda ao primeiro
         retoque no desenho do botão. */
      data-flutuante="encomendas"
      className={`premivel fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-tijolo py-3.5 pl-5 pr-6 text-sm font-semibold uppercase tracking-widest text-papel shadow-lg shadow-tinta/25 ${
        visivel
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {/* O símbolo da casa, reduzido ao pão. É o desenho que a marca tem, e a
          esta escala ainda se lê — abaixo disto usar-se-iam as ondas. */}
      <span
        aria-hidden
        className="traco size-5 shrink-0"
        style={{
          maskImage: "url(/marca/simbolo.svg)",
          WebkitMaskImage: "url(/marca/simbolo.svg)",
        }}
      />
      {t("encomendas")}
    </Link>
  );
}
