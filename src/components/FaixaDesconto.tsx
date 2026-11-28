import { useTranslations } from "next-intl";
import { DESCONTO_PERCENTAGEM } from "@/lib/desconto";

/**
 * A faixa do desconto da loja (10 % em toda a loja, decidido a 27/11), no topo
 * de todas as páginas. Com o desconto a `0` (`src/lib/desconto.ts`), não aparece.
 *
 * Fica **por baixo do cabeçalho**, e não no lugar da faixa do modo de teste:
 * aquela é a que impede o site de afirmar um prazo que a casa não deu, e não se
 * apaga enquanto o interruptor estiver ligado (`src/lib/modo-teste.ts`).
 *
 * A tijolo com texto a papel — sobre tijolo é a única cor legível (6,87:1;
 * tinta dá 2,36:1). O destaque é o inverso, uma pastilha a papel com o número
 * a tijolo, que tem o mesmo contraste. No fluxo da página, como a outra, para
 * não mudar as alturas de que as âncoras dependem. As cores vivem em
 * `globals.css` (`.faixa-desconto`): sobre um herói a tijolo, a faixa passa a
 * tinta.
 */
export function FaixaDesconto() {
  const t = useTranslations("desconto");
  if (DESCONTO_PERCENTAGEM === 0) return null;

  /* No telemóvel a letra desce a 12 px e o `text-balance` reparte o texto em
     linhas de largura parecida: cabe numa linha a partir de ~390 px e, abaixo
     disso, em duas iguais, em vez de uma linha cheia e uma palavra sozinha. */
  return (
    <div className="faixa-desconto px-4 py-2 text-center text-xs font-semibold leading-relaxed text-balance sm:text-sm">
      {t.rich("faixa", {
        n: DESCONTO_PERCENTAGEM,
        destaque: (texto) => (
          <span className="faixa-desconto__destaque mx-0.5 inline-block whitespace-nowrap rounded-full px-2 py-px font-bold uppercase tracking-wide sm:px-2.5 sm:py-0.5">
            {texto}
          </span>
        ),
      })}
    </div>
  );
}
