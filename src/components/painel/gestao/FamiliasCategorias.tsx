"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { gravarFamilias } from "@/app/painel/acoes-gestao";
import type { EntradaFamilias, Familia, Produto } from "@/lib/dados/tipos";
import { moverNaLista } from "@/lib/ordenar";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # Famílias e categorias (pedido de 26/11)
 *
 * Um sítio só para a gerente arrumar a `/encomendas`: **as famílias pela ordem
 * em que aparecem** — Kit Festas, Bolo e mesa decorada, Boxes, Da carta,
 * Natal… — e, dentro de cada uma, **as categorias pela ordem dela**. Cria
 * famílias e categorias, muda-lhes o nome, passa uma categoria para outra
 * família (os produtos vão com ela) e apaga as que estão vazias. Substitui a
 * «Ordem das categorias» (#87), que só ordenava as da carta.
 *
 * - **Subir e descer, e não arrastar**, pela mesma razão da #87: arrastar num
 *   telemóvel briga com a rolagem, não se faz com o teclado e pede uma
 *   biblioteca.
 * - **Tudo num rascunho, gravado de uma vez.** Um toque a mais não mexe na loja
 *   de ninguém, e a gravação é a árvore inteira (`EsquemaFamilias`): o servidor
 *   confere-a toda, e nunca fica meia gravada.
 * - **Apagar só o que está vazio.** Uma categoria com produtos (arquivados
 *   incluídos) não tem o botão — e o servidor recusa-o na mesma (regra 8).
 * - **Os produtos escolhem a categoria no editor** («Onde aparece na loja»):
 *   aqui não se mexe em produtos.
 * - ⚠️ **Uma família ou categoria vazia não aparece na loja.** O Natal criado
 *   hoje só se vê no site quando tiver o primeiro produto. Diz-se ao lado.
 */

type CategoriaRascunho = { chave: string; id?: string; nome: string };
type FamiliaRascunho = { chave: string; id?: string; nome: string; categorias: CategoriaRascunho[] };

const paraRascunho = (familias: Familia[]): FamiliaRascunho[] =>
  familias.map((f) => ({
    chave: f.id,
    id: f.id,
    nome: f.nome.pt,
    categorias: f.categorias.map((c) => ({ chave: c.id, id: c.id, nome: c.nome.pt })),
  }));

/* O que vai para o servidor: só ids e nomes. A chave é do browser. */
const paraEntrada = (rascunho: FamiliaRascunho[]): EntradaFamilias => ({
  familias: rascunho.map((f) => ({
    ...(f.id ? { id: f.id } : {}),
    nome: f.nome.trim(),
    categorias: f.categorias.map((c) => ({ ...(c.id ? { id: c.id } : {}), nome: c.nome.trim() })),
  })),
});

const assinatura = (rascunho: FamiliaRascunho[]) => JSON.stringify(paraEntrada(rascunho));

export function FamiliasCategorias({ familias, produtos }: { familias: Familia[]; produtos: Produto[] }) {
  const router = useRouter();
  const ids = useId();
  const [gravada, setGravada] = useState(() => paraRascunho(familias));
  const [rascunho, setRascunho] = useState(() => paraRascunho(familias));
  /* ⚠️ Como na «Ordem das categorias»: o painel faz `router.refresh` a cada
     pedido novo, e cada volta traz uma lista nova com o mesmo conteúdo.
     Compara-se o conteúdo, e o rascunho só se substitui se não houver nada por
     gravar. */
  const doServidor = assinatura(paraRascunho(familias));
  const [base, setBase] = useState(doServidor);
  const mudou = assinatura(rascunho) !== assinatura(gravada);
  if (base !== doServidor) {
    setBase(doServidor);
    setGravada(paraRascunho(familias));
    if (!mudou) setRascunho(paraRascunho(familias));
  }

  const [anuncio, setAnuncio] = useState("");
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aGravar, iniciar] = useTransition();
  const [novaFamilia, setNovaFamilia] = useState("");
  const [novasCategorias, setNovasCategorias] = useState<Record<string, string>>({});
  const contador = useRef(0);
  const novaChave = () => `nova-${++contador.current}`;

  /* Arquivados incluídos: uma categoria com um produto arquivado também não se
     apaga (a chave estrangeira não deixa). */
  const quantos = (categoriaId: string | undefined) =>
    categoriaId === undefined ? 0 : produtos.filter((p) => p.categoriaId === categoriaId).length;
  /* O que a `/encomendas` mostra: os das encomendas e os da carta à venda online
     (`familiasDaLoja`). Contar os outros dizia «95 no site» onde há 70. */
  const quantosNaLoja = (categoriaId: string | undefined) =>
    categoriaId === undefined
      ? 0
      : produtos.filter(
          (p) => p.categoriaId === categoriaId && !p.arquivado && (p.origem === "encomendas" || p.aVendaOnline),
        ).length;
  const contar = (n: number) => (n === 1 ? "1 produto" : `${n} produtos`);

  const mudar = (novo: FamiliaRascunho[], aviso: string) => {
    setRascunho(novo);
    setMensagem(null);
    setAnuncio(aviso);
  };

  const mudarFamilia = (chave: string, mudanca: (f: FamiliaRascunho) => FamiliaRascunho) =>
    rascunho.map((f) => (f.chave === chave ? mudanca(f) : f));

  const juntarFamilia = () => {
    const nome = novaFamilia.trim();
    if (!nome) return;
    mudar([...rascunho, { chave: novaChave(), nome, categorias: [] }], `Família «${nome}» juntada no fim.`);
    setNovaFamilia("");
  };

  const juntarCategoria = (familia: FamiliaRascunho) => {
    const nome = (novasCategorias[familia.chave] ?? "").trim();
    if (!nome) return;
    mudar(
      mudarFamilia(familia.chave, (f) => ({ ...f, categorias: [...f.categorias, { chave: novaChave(), nome }] })),
      `Categoria «${nome}» juntada a ${familia.nome}.`,
    );
    setNovasCategorias((atuais) => ({ ...atuais, [familia.chave]: "" }));
  };

  const passarCategoria = (de: FamiliaRascunho, categoria: CategoriaRascunho, para: string) => {
    const destino = rascunho.find((f) => f.chave === para);
    if (!destino) return;
    mudar(
      rascunho.map((f) =>
        f.chave === de.chave
          ? { ...f, categorias: f.categorias.filter((c) => c.chave !== categoria.chave) }
          : f.chave === para
            ? { ...f, categorias: [...f.categorias, categoria] }
            : f,
      ),
      `${categoria.nome} passou para ${destino.nome}, no fim.`,
    );
  };

  /* Os nomes repetidos recusa-os o servidor; aqui avisa-se antes, ao lado. */
  const repetido = (nomes: string[], nome: string) =>
    nomes.filter((n) => n.trim().toLocaleLowerCase("pt") === nome.trim().toLocaleLowerCase("pt")).length > 1;
  const nomesFamilias = rascunho.map((f) => f.nome);
  const problema =
    rascunho.some((f) => !f.nome.trim() || f.categorias.some((c) => !c.nome.trim()))
      ? "Há um nome em branco."
      : rascunho.some((f) => repetido(nomesFamilias, f.nome))
        ? "Há duas famílias com o mesmo nome."
        : rascunho.some((f) => f.categorias.some((c) => repetido(f.categorias.map((x) => x.nome), c.nome)))
          ? "Há duas categorias com o mesmo nome na mesma família."
          : null;

  const gravar = () =>
    iniciar(async () => {
      const resultado = await gravarFamilias(paraEntrada(rascunho));
      if (resultado.ok) {
        const nova = paraRascunho(resultado.valor);
        setGravada(nova);
        setRascunho(nova);
        setMensagem({ ok: true, texto: "Gravado." });
        setAnuncio("Famílias e categorias gravadas.");
        router.refresh();
      } else {
        const texto =
          resultado.erro === "dados-invalidos"
            ? "Não foi possível gravar: há um nome repetido, ou uma categoria com produtos que saiu da lista."
            : MENSAGENS[resultado.erro];
        setMensagem({ ok: false, texto });
        setAnuncio(texto);
      }
    });

  const botao =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-tinta/20 bg-papel text-lg disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";
  const campo =
    "min-h-11 w-full min-w-0 rounded-xl border border-tinta/25 bg-papel px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";
  const pequeno = "text-sm font-semibold text-tijolo underline-offset-2 hover:underline disabled:opacity-40";

  return (
    <section aria-labelledby={`${ids}-titulo`} className="rounded-2xl border border-tinta/15 bg-papel p-5">
      <h3 id={`${ids}-titulo`} className="titulo-display text-xl">
        Famílias e categorias
      </h3>
      <p className="mt-2 max-w-[62ch] text-tinta-suave">
        A ordem em que as famílias aparecem nas encomendas e, dentro de cada uma, a ordem das categorias. Os produtos
        ficam sempre por ordem alfabética dentro da categoria. Para pôr um produto numa categoria, abra-o em «Todos os
        produtos» e escolha «Onde aparece na loja». <strong>Uma família ou categoria sem produtos não aparece no site.</strong>
      </p>

      <ol className="mt-5 space-y-4">
        {rascunho.map((familia, i) => {
          const naLoja = familia.categorias.reduce((soma, c) => soma + quantosNaLoja(c.id), 0);
          return (
            <li key={familia.chave} className="rounded-2xl border border-tinta/15 p-3 sm:p-4">
              {/* ⚠️ No telemóvel as setas descem para baixo do nome: lado a lado,
                  a 320 px, o nome ficava com quatro letras à vista. */}
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden className="w-6 shrink-0 text-right tabular-nums text-tinta-suave">
                  {i + 1}
                </span>
                <label className="sr-only" htmlFor={`${ids}-f-${familia.chave}`}>
                  Nome da família {i + 1}
                </label>
                <input
                  id={`${ids}-f-${familia.chave}`}
                  value={familia.nome}
                  maxLength={60}
                  onChange={(e) => {
                    setRascunho(mudarFamilia(familia.chave, (f) => ({ ...f, nome: e.target.value })));
                    setMensagem(null);
                  }}
                  className={`${campo} titulo-display grow basis-40 text-lg`}
                />
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => mudar(moverNaLista(rascunho, i, -1), `${familia.nome} passou para ${i}.º lugar.`)}
                    disabled={i === 0 || aGravar}
                    aria-label={`Subir a família ${familia.nome}`}
                    className={botao}
                  >
                    <span aria-hidden>↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => mudar(moverNaLista(rascunho, i, 1), `${familia.nome} passou para ${i + 2}.º lugar.`)}
                    disabled={i === rascunho.length - 1 || aGravar}
                    aria-label={`Descer a família ${familia.nome}`}
                    className={botao}
                  >
                    <span aria-hidden>↓</span>
                  </button>
                </span>
              </div>
              <p className="mt-1 pl-8 text-sm text-tinta-suave">
                {naLoja === 0 ? "Sem produtos — ainda não aparece no site." : `${contar(naLoja)} no site.`}
                {!familia.id && " Nova, por gravar."}
              </p>

              <ol className="mt-3 divide-y divide-tinta/10 rounded-xl border border-tinta/10 pl-0 sm:ml-8">
                {familia.categorias.map((categoria, j) => {
                  const n = quantos(categoria.id);
                  return (
                    <li key={categoria.chave} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`${ids}-c-${categoria.chave}`}>
                          Nome da categoria {j + 1} de {familia.nome}
                        </label>
                        <input
                          id={`${ids}-c-${categoria.chave}`}
                          value={categoria.nome}
                          maxLength={60}
                          onChange={(e) => {
                            setRascunho(
                              mudarFamilia(familia.chave, (f) => ({
                                ...f,
                                categorias: f.categorias.map((c) =>
                                  c.chave === categoria.chave ? { ...c, nome: e.target.value } : c,
                                ),
                              })),
                            );
                            setMensagem(null);
                          }}
                          className={`${campo} grow basis-44`}
                        />
                        <span className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              mudar(
                                mudarFamilia(familia.chave, (f) => ({ ...f, categorias: moverNaLista(f.categorias, j, -1) })),
                                `${categoria.nome} passou para ${j}.º lugar em ${familia.nome}.`,
                              )
                            }
                            disabled={j === 0 || aGravar}
                            aria-label={`Subir a categoria ${categoria.nome}`}
                            className={botao}
                          >
                            <span aria-hidden>↑</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              mudar(
                                mudarFamilia(familia.chave, (f) => ({ ...f, categorias: moverNaLista(f.categorias, j, 1) })),
                                `${categoria.nome} passou para ${j + 2}.º lugar em ${familia.nome}.`,
                              )
                            }
                            disabled={j === familia.categorias.length - 1 || aGravar}
                            aria-label={`Descer a categoria ${categoria.nome}`}
                            className={botao}
                          >
                            <span aria-hidden>↓</span>
                          </button>
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tinta-suave">
                        <span>{categoria.id ? contar(n) : "Nova, por gravar"}</span>
                        {rascunho.length > 1 && (
                          <label className="inline-flex min-w-0 max-w-full items-center gap-2">
                            <span className="shrink-0">Passar para</span>
                            <select
                              value=""
                              disabled={aGravar}
                              onChange={(e) => passarCategoria(familia, categoria, e.target.value)}
                              className="min-h-9 min-w-0 max-w-full rounded-lg border border-tinta/25 bg-papel px-2"
                            >
                              <option value="">—</option>
                              {rascunho
                                .filter((f) => f.chave !== familia.chave)
                                .map((f) => (
                                  <option key={f.chave} value={f.chave}>
                                    {f.nome || "(sem nome)"}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        {n === 0 && (
                          <button
                            type="button"
                            disabled={aGravar}
                            onClick={() =>
                              mudar(
                                mudarFamilia(familia.chave, (f) => ({
                                  ...f,
                                  categorias: f.categorias.filter((c) => c.chave !== categoria.chave),
                                })),
                                `Categoria ${categoria.nome} apagada do rascunho.`,
                              )
                            }
                            className={pequeno}
                          >
                            Apagar
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                <li className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <label className="sr-only" htmlFor={`${ids}-nc-${familia.chave}`}>
                    Nova categoria em {familia.nome}
                  </label>
                  <input
                    id={`${ids}-nc-${familia.chave}`}
                    value={novasCategorias[familia.chave] ?? ""}
                    maxLength={60}
                    placeholder="Nova categoria"
                    onChange={(e) => setNovasCategorias((atuais) => ({ ...atuais, [familia.chave]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        juntarCategoria(familia);
                      }
                    }}
                    className={`${campo} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => juntarCategoria(familia)}
                    disabled={!(novasCategorias[familia.chave] ?? "").trim() || aGravar}
                    className={BOTAO_SECUNDARIO}
                  >
                    Juntar categoria
                  </button>
                </li>
              </ol>

              {familia.categorias.length === 0 && rascunho.length > 1 && (
                <button
                  type="button"
                  disabled={aGravar}
                  onClick={() =>
                    mudar(
                      rascunho.filter((f) => f.chave !== familia.chave),
                      `Família ${familia.nome} apagada do rascunho.`,
                    )
                  }
                  className={`${pequeno} mt-3 sm:ml-8`}
                >
                  Apagar a família
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`${ids}-nova-familia`}>
          Nova família
        </label>
        <input
          id={`${ids}-nova-familia`}
          value={novaFamilia}
          maxLength={60}
          placeholder="Nova família (ex.: Páscoa)"
          onChange={(e) => setNovaFamilia(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              juntarFamilia();
            }
          }}
          className={`${campo} flex-1 sm:max-w-sm`}
        />
        <button type="button" onClick={juntarFamilia} disabled={!novaFamilia.trim() || aGravar} className={BOTAO_SECUNDARIO}>
          Juntar família
        </button>
      </div>

      <p role="status" className="sr-only">
        {anuncio}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={gravar}
          disabled={!mudou || aGravar || problema !== null}
          className={`${BOTAO_PRINCIPAL} min-h-14 px-10`}
        >
          {aGravar ? "A gravar…" : "Gravar"}
        </button>
        {mudou && !aGravar && (
          <button
            type="button"
            onClick={() => mudar(gravada, "O rascunho voltou ao que está gravado.")}
            className={BOTAO_SECUNDARIO}
          >
            Desfazer
          </button>
        )}
        {mensagem ? (
          /* Sem `role`: quem anuncia é a região de cima, sempre montada. */
          <p className={`font-semibold ${mensagem.ok ? "" : "text-tijolo"}`}>{mensagem.texto}</p>
        ) : problema ? (
          <p className="font-semibold text-tijolo">{problema}</p>
        ) : (
          mudou && <p className="text-sm text-tinta-suave">Por gravar — o site ainda mostra o que estava.</p>
        )}
      </div>
    </section>
  );
}
