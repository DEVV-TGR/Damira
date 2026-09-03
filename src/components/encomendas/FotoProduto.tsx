import { useTranslations } from "next-intl";

/**
 * O lugar da fotografia de um produto.
 *
 * ## ⚠️ Porque é que isto é um espaço reservado e não uma imagem qualquer
 *
 * Há dezanove fotografias da casa em `public/`, e **nenhuma é deste kit ou
 * desta box**. Numa página de produto qualquer imagem se lê como sendo o
 * produto: pôr ali a montra vista da rua, ou um prato bonito, é anunciar uma
 * coisa e entregar outra — e o cliente só descobre ao levantar a encomenda.
 * Vale aqui a mesma regra que proíbe banco de imagens no resto do site.
 *
 * O que este componente faz é **guardar o sítio**, com o motivo da marca e uma
 * frase a dizer que a fotografia está por chegar. Assim a página tem a forma que
 * vai ter, o cliente vê onde a fotografia entra, e ninguém fica com a ideia de
 * que aquilo é o produto.
 *
 * No dia em que houver fotografia, é preencher `produto.foto` e isto passa a
 * mostrá-la — uma linha, sem mexer no desenho.
 */
export function FotoProduto({
  foto,
  alt,
  proporcao = "4 / 3",
  discreta = false,
}: {
  foto: string | null;
  alt: string;
  /** As grelhas usam 4/3; a página de produto usa 3/2, que dá mais altura. */
  proporcao?: string;
  /**
   * Sem a frase, só o motivo.
   *
   * ⚠️ **Para os setenta cartões da carta por encomenda.** «Fotografia por
   * chegar da casa» escrito setenta vezes numa grelha ocupa mais espaço do que
   * o nome do artigo e deixa de se ler à terceira — e num cartão estreito a
   * frase enche a caixa toda. A explicação fica onde ela conta: nos cartões
   * grandes e nas páginas de produto, que é onde alguém pára para olhar.
   */
  discreta?: boolean;
}) {
  const t = useTranslations("produto");

  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={alt}
        style={{ aspectRatio: proporcao }}
        className="w-full rounded-2xl object-cover"
      />
    );
  }

  return (
    <div
      style={{ aspectRatio: proporcao }}
      className="relative flex w-full items-end overflow-hidden rounded-2xl border border-tinta/12 bg-papel-fundo"
    >
      {/* O símbolo da marca em marca-d'água, cortado pelo canto: enche o espaço
          sem competir com o nome do produto, que é o que ali se lê primeiro. */}
      <span
        aria-hidden
        className="traco pointer-events-none absolute -right-[12%] top-1/2 h-[130%] w-[70%] -translate-y-1/2 opacity-[0.09]"
        style={{
          maskImage: "url(/marca/simbolo.svg)",
          WebkitMaskImage: "url(/marca/simbolo.svg)",
        }}
      />
      {!discreta && (
        <p className="relative m-4 max-w-[24ch] text-xs uppercase tracking-widest text-tinta-suave">
          {t("semFoto")}
        </p>
      )}
    </div>
  );
}
