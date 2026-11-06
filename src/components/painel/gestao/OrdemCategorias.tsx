"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { gravarOrdemCategorias } from "@/app/painel/acoes-gestao";
import type { OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { moverNaLista } from "@/lib/ordenar";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # A ordem das categorias (`painel-gerente.md` › Ordem das categorias, #87)
 *
 * A gerente escolhe por que ordem as categorias aparecem na ementa e nas
 * encomendas; dentro de cada uma, os artigos vão por ordem alfabética, e isso
 * não se escolhe aqui.
 *
 * ⚠️ **Subir e descer, e não arrastar.** Arrastar num telemóvel briga com a
 * rolagem da página, não se faz com o teclado e pede uma biblioteca; sete
 * categorias arrumam-se em meia dúzia de toques. A ordem muda num rascunho e só
 * vai para o site ao gravar — um toque a mais não mexe na ementa de ninguém.
 */
export function OrdemCategorias({
  ordem,
  produtos,
  nomes,
}: {
  ordem: OrdemEmenta;
  /** Para contar os artigos de cada categoria: ajuda a reconhecê-la. */
  produtos: Produto[];
  /** O nome que o site lhe dá; sem ele, o identificador. */
  nomes: Record<string, string>;
}) {
  const router = useRouter();
  const [gravada, setGravada] = useState(ordem.categorias);
  const [rascunho, setRascunho] = useState(ordem.categorias);
  /* ⚠️ Compara-se o conteúdo, e não o objeto: o painel faz `router.refresh` a
     cada pedido novo, e cada volta traz uma lista nova com as mesmas
     categorias — comparar a referência apagava o rascunho a meio. Só uma ordem
     de facto diferente (gravada noutro aparelho) entra, e o rascunho só se
     substitui se não houver nada por gravar. */
  const doServidor = ordem.categorias.join("\n");
  const [base, setBase] = useState(doServidor);
  /* ⚠️ **Uma conta só para «há alterações por gravar».** Eram duas — um `join`
     aqui e um `some` mais abaixo —, e a do `some` não via uma lista mais curta
     do que a outra. */
  const mudou = diferentes(rascunho, gravada);
  if (base !== doServidor) {
    setBase(doServidor);
    setGravada(ordem.categorias);
    if (!mudou) setRascunho(ordem.categorias);
  }
  const [anuncio, setAnuncio] = useState("");
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aGravar, iniciar] = useTransition();
  const botoes = useRef(new Map<string, HTMLButtonElement | null>());

  const nomeDe = (categoria: string) => nomes[categoria] ?? categoria;
  const quantos = (categoria: string) =>
    produtos.filter((p) => !p.arquivado && p.familia === "ementa" && p.categoria === categoria).length;

  const mover = (i: number, sentido: -1 | 1) => {
    const categoria = rascunho[i];
    const nova = moverNaLista(rascunho, i, sentido);
    const destino = i + sentido;
    setRascunho(nova);
    setMensagem(null);
    /* Quem usa leitor de ecrã não vê a lista mexer: diz-se para onde foi. */
    setAnuncio(`${nomeDe(categoria)} passou para ${destino + 1}.º lugar de ${nova.length}.`);
    /* O foco acompanha a categoria, para se poder subir três vezes seguidas
       sem a voltar a procurar. Na ponta o botão desliga-se, e o foco passa
       para o do outro sentido. */
    const naPonta = destino === 0 || destino === nova.length - 1;
    const proximo = naPonta ? (sentido === -1 ? "descer" : "subir") : sentido === -1 ? "subir" : "descer";
    requestAnimationFrame(() => botoes.current.get(`${categoria}:${proximo}`)?.focus());
  };

  const gravar = () =>
    iniciar(async () => {
      const resultado = await gravarOrdemCategorias(rascunho);
      if (resultado.ok) {
        setGravada(resultado.valor.categorias);
        setRascunho(resultado.valor.categorias);
        /* Sem «a ementa já mostra esta ordem»: na implementação provisória a
           ordem vive na memória de uma instância, e a página pode ser gerada
           noutra. Com a base de dados volta a poder dizer-se. */
        setMensagem({ ok: true, texto: "Gravado." });
        setAnuncio("Ordem gravada.");
        router.refresh();
      } else {
        setMensagem({ ok: false, texto: MENSAGENS[resultado.erro] });
        setAnuncio(MENSAGENS[resultado.erro]);
      }
    });

  const botao =
    "inline-flex size-12 items-center justify-center rounded-xl border border-tinta/20 bg-papel text-lg disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";

  return (
    <section aria-labelledby="ordem-categorias" className="rounded-2xl border border-tinta/15 bg-papel p-5">
      <h3 id="ordem-categorias" className="titulo-display text-xl">
        Ordem das categorias
      </h3>
      <p className="mt-2 text-tinta-suave">
        A ordem em que as categorias aparecem na ementa e nas encomendas. Dentro de cada categoria, os produtos ficam por
        ordem alfabética.
      </p>

      <ol className="mt-4 divide-y divide-tinta/10 rounded-2xl border border-tinta/15">
        {rascunho.map((categoria, i) => (
          <li key={categoria} className="flex items-center gap-3 px-4 py-2">
            <span aria-hidden className="w-6 text-right tabular-nums text-tinta-suave">
              {i + 1}
            </span>
            <span className="mr-auto min-w-0">
              <strong>{nomeDe(categoria)}</strong>
              <span className="block text-sm text-tinta-suave">
                {quantos(categoria) === 1 ? "1 produto" : `${quantos(categoria)} produtos`}
              </span>
            </span>
            <button
              type="button"
              ref={(el) => {
                botoes.current.set(`${categoria}:subir`, el);
              }}
              onClick={() => mover(i, -1)}
              disabled={i === 0 || aGravar}
              aria-label={`Subir ${nomeDe(categoria)}`}
              className={botao}
            >
              <span aria-hidden>↑</span>
            </button>
            <button
              type="button"
              ref={(el) => {
                botoes.current.set(`${categoria}:descer`, el);
              }}
              onClick={() => mover(i, 1)}
              disabled={i === rascunho.length - 1 || aGravar}
              aria-label={`Descer ${nomeDe(categoria)}`}
              className={botao}
            >
              <span aria-hidden>↓</span>
            </button>
          </li>
        ))}
      </ol>
      <p role="status" className="sr-only">
        {anuncio}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={gravar} disabled={!mudou || aGravar} className={`${BOTAO_PRINCIPAL} min-h-14 px-10`}>
          {aGravar ? "A gravar…" : "Gravar ordem"}
        </button>
        {mudou && !aGravar && (
          <button
            type="button"
            onClick={() => {
              setRascunho(gravada);
              setMensagem(null);
              setAnuncio("A ordem voltou à que está gravada.");
            }}
            className={BOTAO_SECUNDARIO}
          >
            Desfazer
          </button>
        )}
        {mensagem ? (
          /* Sem `role`: quem anuncia é a região de cima, sempre montada — uma
             região viva que nasce já com texto muitas vezes não se ouve. */
          <p className={`font-semibold ${mensagem.ok ? "" : "text-tijolo"}`}>
            {mensagem.texto}
          </p>
        ) : (
          mudou && <p className="text-sm text-tinta-suave">Por gravar — o site ainda mostra a ordem antiga.</p>
        )}
      </div>
    </section>
  );
}

const diferentes = (a: readonly string[], b: readonly string[]): boolean =>
  a.length !== b.length || a.some((valor, i) => valor !== b[i]);
