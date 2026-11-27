/**
 * # Como aparece no site — um desenho pequeno para as ajudas «?» (27/11)
 *
 * A gerente arruma a `/encomendas` em três níveis — Família › Categoria ›
 * Secção — e um nome solto («secção», «categoria») não lhe diz onde aquilo cai
 * na página. Este desenho imita a loja em miniatura, com as mesmas cores e a
 * mesma ordem de títulos da `SeccaoFamilia`, e marca o nível de que a ajuda
 * fala. ⚠️ Se a loja mudar de forma, este desenho muda com ela: uma ajuda que
 * mostra outra página ensina errado.
 *
 * Os nomes são exemplos fixos, e não os da casa: uma ajuda não pode depender
 * do que a gerente gravou (seria um exemplo que muda quando ela renomeia).
 */

export type NivelDaLoja = "familia" | "categoria" | "seccao" | "cartao";

export function ExemploLoja({ realce }: { realce: NivelDaLoja }) {
  /* O nível de que se fala, a contorno; os outros ficam esbatidos. */
  const marca = (nivel: NivelDaLoja) =>
    nivel === realce ? "rounded-md outline outline-2 outline-offset-2 outline-tijolo" : "opacity-60";

  return (
    <figure className="mt-3 rounded-xl border border-tinta/15 bg-papel p-3 text-tinta" aria-hidden>
      <p className={`titulo-display text-lg font-bold leading-none ${marca("familia")}`}>Da carta</p>
      <p className={`mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${marca("categoria")}`}>
        <span className="text-tijolo">Da carta</span> · Doces
      </p>
      <p className={`mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-tijolo ${marca("seccao")}`}>Vegan</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {["Pastel de nata", "Bola de Berlim", "Queque"].map((nome, i) => (
          <div
            key={nome}
            className={`rounded-md border border-tinta/15 p-1 ${i === 0 ? marca("cartao") : "opacity-60"}`}
          >
            <div className="h-5 rounded bg-tinta/10" />
            <p className="mt-1 truncate text-[0.55rem] font-semibold">{nome}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-tinta-suave">
        {
          {
            familia: "A família é o título grande, e um link no topo da página e no menu «Encomendas».",
            categoria: "A categoria é o título pequeno que fica colado no topo enquanto se desce, com a família à frente.",
            seccao: "A secção é um título dentro da categoria. Sem secção, o produto aparece logo por baixo da categoria.",
            cartao: "O cartão de cada produto: o que mostra, e o que acontece ao tocar-lhe.",
          }[realce]
        }
      </figcaption>
    </figure>
  );
}
