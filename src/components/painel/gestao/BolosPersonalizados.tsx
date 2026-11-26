"use client";

import { useState, useTransition } from "react";
import { gravarOpcoesDoBolo } from "@/app/painel/acoes-gestao";
import type { OpcoesBolo } from "@/lib/dados/tipos";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # Bolos personalizados (`painel-gerente.md` › Bolos personalizados)
 *
 * Tudo o que o configurador do site oferece, e **nada que a gerente não tenha
 * escrito aqui**: os tamanhos (com o «a partir de»), as massas, as coberturas,
 * os recheios, o «à volta» e os toppings, e que foto se imprime.
 *
 * A **compatibilidade** é a grelha do PDF da casa — uma linha por opção, uma
 * coluna por cobertura. É a lista positiva de `bolos-personalizados.md`: uma
 * cobertura nova entra **desmarcada** em todas, para não ficar permitida por
 * esquecimento.
 *
 * Desligar tira a opção do site sem a apagar: os pedidos antigos continuam a
 * dizer o que se pediu. Apagar só existe para uma opção que ainda não se gravou.
 */

type Lista = "tamanhos" | "massas" | "coberturas" | "recheios" | "aVolta" | "toppings";
type Separador = Lista | "fotos";

const SEPARADORES: { id: Separador; rotulo: string }[] = [
  { id: "tamanhos", rotulo: "Tamanhos" },
  { id: "massas", rotulo: "Massas" },
  { id: "coberturas", rotulo: "Coberturas" },
  { id: "recheios", rotulo: "Recheios" },
  { id: "aVolta", rotulo: "À volta" },
  { id: "toppings", rotulo: "Toppings" },
  { id: "fotos", rotulo: "Fotos" },
];

const AJUDA: Record<Separador, string> = {
  tamanhos:
    "Opcional. Com tamanhos, o cliente escolhe um e vê o «a partir de». O preço final continua a ser seu, no pedido. Sem tamanhos, o bolo é só «sob orçamento».",
  massas: "Marque as coberturas que faz com cada massa. O cliente só vê as coberturas marcadas na massa que escolheu.",
  coberturas:
    "Uma cobertura nova entra desmarcada em todas as massas, recheios, «à volta» e toppings: marque-a onde a fizer.",
  recheios: "Marque com que coberturas faz cada recheio.",
  aVolta: "Marque com que coberturas faz cada opção.",
  toppings: "Marque com que coberturas faz cada topping. Um deles pode abrir a foto para imprimir (em «Fotos»).",
  fotos: "As fotos que o cliente pode juntar ao bolo.",
};

/* O id vai no cesto e no pedido e nunca muda: sai do nome quando a opção se
   cria, e fica, mesmo que o nome mude depois. */
const paraId = (nome: string, usados: Set<string>): string => {
  const base =
    nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "opcao";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  usados.add(id);
  return id;
};

/** Uma linha nova ainda sem id: ganha-o ao gravar, a partir do nome. */
const NOVA = "";

export function BolosPersonalizados({ opcoes }: { opcoes: OpcoesBolo }) {
  const [rascunho, setRascunho] = useState<OpcoesBolo>(opcoes);
  const [separador, setSeparador] = useState<Separador>("massas");
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aGravar, iniciar] = useTransition();
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(opcoes);

  const coberturas = rascunho.coberturas;
  const mudar = (novo: OpcoesBolo) => {
    setRascunho(novo);
    setMensagem(null);
  };

  const gravar = () =>
    iniciar(async () => {
      /* As linhas novas ganham o id aqui, a partir do nome, únicas na lista. */
      const comIds = { ...rascunho };
      for (const lista of ["tamanhos", "massas", "coberturas", "recheios", "aVolta", "toppings"] as const) {
        const usados = new Set(rascunho[lista].map((o) => o.id).filter(Boolean));
        (comIds as Record<Lista, { id: string; nome: string }[]>)[lista] = rascunho[lista].map((o) =>
          o.id === NOVA ? { ...o, id: paraId(o.nome, usados) } : o,
        );
      }
      const resultado = await gravarOpcoesDoBolo(comIds);
      if (resultado.ok) {
        setRascunho(resultado.valor);
        setMensagem({ ok: true, texto: "Gravado. O site já mostra as opções novas." });
      } else {
        setMensagem({
          ok: false,
          texto:
            resultado.erro === "dados-invalidos"
              ? "Não foi possível gravar: confira se todas as opções têm nome."
              : MENSAGENS[resultado.erro],
        });
      }
    });

  return (
    <section aria-labelledby="bolos-personalizados" className="rounded-2xl border border-tinta/15 bg-papel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id="bolos-personalizados" className="titulo-display text-xl">
          Bolos personalizados
        </h3>
        {/* A página do site, para ver o configurador como o cliente o vê. */}
        <a
          href="/encomendas/bolo-por-medida"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-tijolo underline underline-offset-4"
        >
          Pré-visualizar no site ↗
        </a>
      </div>
      <p className="mt-2 text-tinta-suave">
        O que o cliente pode escolher quando monta um bolo. O que não estiver aqui, ou estiver desligado, não aparece no
        site.
      </p>

      <div role="tablist" aria-label="Partes do bolo" className="mt-4 flex flex-wrap gap-2">
        {SEPARADORES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={separador === s.id}
            onClick={() => setSeparador(s.id)}
            className={`premivel min-h-11 rounded-full border px-4 text-sm font-semibold ${
              separador === s.id ? "border-tijolo bg-tijolo text-papel" : "border-tinta/25 hover:bg-tinta hover:text-papel"
            }`}
          >
            {s.rotulo}
            {s.id !== "fotos" && (
              <span className="ml-1.5 tabular-nums opacity-70">{rascunho[s.id].filter((o) => o.ativa).length}</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-tinta-suave">{AJUDA[separador]}</p>

      <div className="mt-4">
        {separador === "fotos" ? (
          <Fotos opcoes={rascunho} onMudar={mudar} />
        ) : (
          <Tabela lista={separador} opcoes={rascunho} coberturas={coberturas} onMudar={mudar} />
        )}
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-tinta/10 bg-papel py-3">
        <button type="button" onClick={gravar} disabled={!alterado || aGravar} className={BOTAO_PRINCIPAL}>
          {aGravar ? "A gravar…" : "Gravar"}
        </button>
        <button
          type="button"
          onClick={() => mudar(opcoes)}
          disabled={!alterado || aGravar}
          className={BOTAO_SECUNDARIO}
        >
          Desfazer
        </button>
        <p role="status" className={`text-sm ${mensagem?.ok === false ? "font-semibold text-tijolo" : "text-tinta-suave"}`}>
          {mensagem?.texto ?? (alterado ? "Tem alterações por gravar." : "")}
        </p>
      </div>
    </section>
  );
}

function Tabela({
  lista,
  opcoes,
  coberturas,
  onMudar,
}: {
  lista: Lista;
  opcoes: OpcoesBolo;
  coberturas: OpcoesBolo["coberturas"];
  onMudar: (novo: OpcoesBolo) => void;
}) {
  const linhas = opcoes[lista] as (OpcoesBolo["massas"][number] & { precoCent?: number | null })[];
  const comCoberturas = lista !== "tamanhos" && lista !== "coberturas";

  const trocar = (novas: typeof linhas) => onMudar({ ...opcoes, [lista]: novas } as OpcoesBolo);
  const mudarLinha = (i: number, mudanca: Partial<(typeof linhas)[number]>) =>
    trocar(linhas.map((l, j) => (j === i ? { ...l, ...mudanca } : l)));
  const mover = (i: number, passo: -1 | 1) => {
    const novas = [...linhas];
    [novas[i], novas[i + passo]] = [novas[i + passo], novas[i]];
    trocar(novas);
  };
  const juntar = () =>
    trocar([
      ...linhas,
      {
        id: NOVA,
        nome: "",
        ativa: true,
        /* Lista positiva: uma opção nova não vai com cobertura nenhuma até ela marcar. */
        ...(comCoberturas ? { coberturas: [] } : {}),
        ...(lista === "tamanhos" ? { precoCent: null } : {}),
      } as (typeof linhas)[number],
    ]);

  const botao =
    "inline-flex size-10 items-center justify-center rounded-lg border border-tinta/20 bg-papel disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-tijolo";

  return (
    <>
      {/* ⚠️ `min-w-0` e a rolagem de lado **dentro** da caixa: a grelha das
          coberturas não cabe num telemóvel, e sem isto arrastava a página
          inteira (armadilha 16 do AGENTS.md). E ⚠️ `relative`: o «Ordem» do
          cabeçalho é `sr-only`, que é `position: absolute`, e sem um contentor
          posicionado escapava ao recorte e alargava a página 143 px a 360. */}
      <div className="relative min-w-0 overflow-x-auto rounded-2xl border border-tinta/15">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-tinta/15 bg-tinta/5 text-left">
              <th className="px-3 py-2 font-semibold">Nome</th>
              {lista === "tamanhos" && <th className="px-3 py-2 font-semibold">A partir de (€)</th>}
              {comCoberturas &&
                coberturas.map((c) => (
                  <th key={c.id || c.nome} className="px-2 py-2 text-center font-semibold">
                    {c.nome || "—"}
                  </th>
                ))}
              <th className="px-3 py-2 text-center font-semibold">Ligada</th>
              <th className="px-3 py-2">
                <span className="sr-only">Ordem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              <tr key={linha.id || `nova-${i}`} className={`border-b border-tinta/10 ${linha.ativa ? "" : "opacity-55"}`}>
                <td className="px-3 py-1.5">
                  <input
                    value={linha.nome}
                    maxLength={80}
                    aria-label="Nome"
                    placeholder="Nome"
                    onChange={(e) => mudarLinha(i, { nome: e.target.value })}
                    className={`w-full min-w-44 rounded-lg border bg-papel px-3 py-2 ${linha.nome.trim() ? "border-tinta/20" : "border-tijolo"}`}
                  />
                </td>
                {lista === "tamanhos" && (
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="decimal"
                      aria-label={`A partir de, ${linha.nome}`}
                      defaultValue={linha.precoCent == null ? "" : (linha.precoCent / 100).toFixed(2).replace(".", ",")}
                      onBlur={(e) => {
                        const texto = e.target.value.trim().replace(",", ".");
                        const euros = Number(texto);
                        /* Vazio é «sem a partir de», nunca zero. Cêntimos inteiros (regra 2). */
                        mudarLinha(i, { precoCent: texto === "" || !Number.isFinite(euros) ? null : Math.round(euros * 100) });
                      }}
                      className="w-24 rounded-lg border border-tinta/20 bg-papel px-3 py-2 tabular-nums"
                    />
                  </td>
                )}
                {comCoberturas &&
                  coberturas.map((c) => (
                    <td key={c.id || c.nome} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${linha.nome || "Opção"} com ${c.nome}`}
                        disabled={c.id === NOVA}
                        checked={linha.coberturas.includes(c.id)}
                        onChange={(e) =>
                          mudarLinha(i, {
                            coberturas: e.target.checked
                              ? [...linha.coberturas, c.id]
                              : linha.coberturas.filter((x) => x !== c.id),
                          })
                        }
                        className="size-5 accent-tijolo"
                      />
                    </td>
                  ))}
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${linha.nome || "Opção"} ligada`}
                    checked={linha.ativa}
                    onChange={(e) => mudarLinha(i, { ativa: e.target.checked })}
                    className="size-5 accent-tijolo"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  <button type="button" aria-label={`Subir ${linha.nome}`} disabled={i === 0} onClick={() => mover(i, -1)} className={botao}>
                    ↑
                  </button>{" "}
                  <button
                    type="button"
                    aria-label={`Descer ${linha.nome}`}
                    disabled={i === linhas.length - 1}
                    onClick={() => mover(i, 1)}
                    className={botao}
                  >
                    ↓
                  </button>
                  {/* Apagar só o que ainda não se gravou: o resto desliga-se. */}
                  {linha.id === NOVA && (
                    <>
                      {" "}
                      <button
                        type="button"
                        aria-label="Apagar esta linha nova"
                        onClick={() => trocar(linhas.filter((_, j) => j !== i))}
                        className={botao}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista === "coberturas" && linhas.some((l) => l.id === NOVA) && (
        <p className="mt-2 text-sm text-tinta-suave">Grave primeiro: só depois a cobertura nova aparece nas outras grelhas.</p>
      )}
      <button type="button" onClick={juntar} className={`${BOTAO_SECUNDARIO} mt-3`}>
        + Juntar
      </button>
    </>
  );
}

function Fotos({ opcoes, onMudar }: { opcoes: OpcoesBolo; onMudar: (novo: OpcoesBolo) => void }) {
  const { fotos } = opcoes;
  return (
    <div className="grid max-w-xl gap-5">
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Fotos de referência, no máximo</span>
        <select
          value={fotos.referenciaMaximo}
          onChange={(e) => onMudar({ ...opcoes, fotos: { ...fotos, referenciaMaximo: Number(e.target.value) } })}
          className="rounded-lg border border-tinta/20 bg-papel px-3 py-2"
        >
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "Nenhuma (o campo não aparece)" : n}
            </option>
          ))}
        </select>
        <span className="text-sm text-tinta-suave">Servem para mostrar o aspeto do bolo. Não se imprimem.</span>
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">O topping que pede a foto para imprimir</span>
        <select
          value={fotos.toppingQueImprime ?? ""}
          onChange={(e) => onMudar({ ...opcoes, fotos: { ...fotos, toppingQueImprime: e.target.value || null } })}
          className="rounded-lg border border-tinta/20 bg-papel px-3 py-2"
        >
          <option value="">Nenhum: não se imprimem fotos</option>
          {opcoes.toppings
            .filter((t) => t.id !== NOVA)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
        </select>
        <span className="text-sm text-tinta-suave">
          Quando o cliente escolhe este topping, o site pede-lhe a foto para imprimir e a autorização para a usar.
        </span>
      </label>
    </div>
  );
}
