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
 * a tijolo, que tem o mesmo contraste. No índice das encomendas cola-se com
 * o cabeçalho. A altura é reservada em `globals.css` para o texto poder mudar
 * de linha com a fonte sem deslocar a página nem alterar as âncoras.
 */
export function FaixaDesconto() {
  const t = useTranslations("desconto");
  if (DESCONTO_PERCENTAGEM === 0) return null;

  return (
    <div className="faixa-desconto grid place-items-center px-4 text-center text-xs font-semibold leading-5 sm:text-sm">
      <p className="text-balance">
        {t.rich("faixa", {
          n: DESCONTO_PERCENTAGEM,
          destaque: (texto) => (
            <span className="faixa-desconto__destaque mx-0.5 inline-block whitespace-nowrap rounded-full px-2 font-bold uppercase tracking-wide sm:px-2.5">
              {texto}
            </span>
          ),
        })}
      </p>
    </div>
  );
}
