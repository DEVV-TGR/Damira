import Image from "next/image";
import { useTranslations } from "next-intl";
import { TAMANHOS_FOTO_CARTAO } from "@/lib/vista";

/* Na página do produto a galeria ocupa a .envolvente inteira até ao lg.
   Daí em diante divide-a em duas com um intervalo de 4rem. */
const TAMANHOS_PORMENOR =
  "(min-width: 64rem) calc((min(100vw, 78rem) - 9rem) / 2), calc(100vw - 2 * clamp(1.25rem, 4vw, 2.5rem))";

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
 * A fotografia de cada produto põe-na a gerente no painel (`FotosProduto`, #40),
 * e é só a desse produto. Quando há, isto mostra a primeira (`fotoDe`); quando
 * não há, continua a guardar o espaço.
 */
export function FotoProduto({
  foto,
  alt,
  proporcao = "4 / 3",
  cartao = false,
}: {
  foto: string | null;
  alt: string;
  proporcao?: string;
  /** Na grelha a frase do espaço reservado iria repetir-se em cada cartão. */
  cartao?: boolean;
}) {
  const t = useTranslations("produto");

  if (foto) {
    /* ⚠️ **`next/image`, e nunca um `<img>` direto ao Blob.** A CSP da loja só
       deixa carregar imagens da própria origem (`next.config.ts`); pelo otimizador
       a foto do Blob chega como `/_next/image`, que é a mesma origem — e já
       reduzida para a largura e a densidade de píxeis do ecrã. */
    return (
      <div style={{ aspectRatio: proporcao }} className="relative w-full overflow-hidden rounded-2xl">
        <Image src={foto} alt={alt} fill sizes={cartao ? TAMANHOS_FOTO_CARTAO : TAMANHOS_PORMENOR} className={cartao ? "object-cover" : "object-contain"} />
      </div>
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
      {!cartao && (
        <p className="relative m-4 max-w-[24ch] text-xs uppercase tracking-widest text-tinta-suave">
          {t("semFoto")}
        </p>
      )}
    </div>
  );
}
