"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { arquivar, gravarProduto } from "@/app/painel/acoes-gestao";
import type { EntradaProduto, OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { ALERGENIOS_UE, entradaDoProduto, paraCent } from "@/lib/painel";
import { BOTAO, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # Um produto, como a gerente o edita (`painel-gerente.md` › O que cada produto tem)
 *
 * No telemóvel, de cima a baixo: nome, onde aparece, preço e variantes,
 * escolhas, encomenda, alergénios, marcas e fotos. A validação está no servidor
 * (`EsquemaEntradaProduto`); aqui só se ajuda a não errar e se marca o campo
 * que ele recusou.
 *
 * ⚠️ **Variantes mudam o preço, escolhas não.** «Kit 20 pessoas» e «40 pessoas»
 * são variantes; «chocolate» e «morango» são escolhas. É o que evita a explosão
 * de combinações que ninguém mantém num telemóvel.
 *
 * ⚠️ **Sem alergénios respondidos, não vai à venda online.** «Por responder» não
 * é «sem alergénios»: confundi-los é dizer a um alérgico que não há nada quando
 * ninguém verificou.
 */

const CAMPOS: Record<string, string> = {
  nome: "o nome",
  descricao: "a descrição",
  carta: "a carta",
  categoria: "a categoria",
  familia: "a família",
  variantes: "as variantes e os preços",
  tempoProducao: "o tempo de produção",
  quantidadeMinima: "a quantidade mínima",
  multiplo: "o múltiplo",
  alergenios: "os alergénios (sem eles respondidos, não vai à venda online)",
  sinalPercent: "o sinal",
  limite: "o limite de quantidade",
};

const NOVO: EntradaProduto = {
  origem: "encomendas",
  familia: "bolo",
  nome: { pt: "", en: null },
  descricao: null,
  carta: null,
  categoria: null,
  subcategoria: null,
  unidade: "un",
  variantes: [{ rotulo: null, pessoas: null, precoCent: null, composicao: [] }],
  escolhas: [],
  tempoProducao: null,
  quantidadeMinima: 1,
  multiplo: 1,
  aVendaOnline: false,
  apareceNaEmenta: false,
  alergenios: null,
  vegan: false,
  semGluten: false,
  fotos: [],
  sinalPercent: null,
  limite: null,
};

type VarianteForm = { id?: string; rotulo: string; pessoas: string; preco: string; sobOrcamento: boolean; composicao: EntradaProduto["variantes"][number]["composicao"] };

const emEuros = (cent: number | null) => (cent === null ? "" : (cent / 100).toFixed(2).replace(".", ","));

const campo =
  "mt-1 block w-full min-w-0 rounded-xl border border-tinta/20 bg-papel px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";
const caixa = "min-w-0 rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5";

export function EditorProduto({
  produto,
  ordem,
  onFechar,
}: {
  produto: Produto | null;
  ordem: OrdemEmenta;
  /** Com o produto como ficou no servidor, para a lista o mostrar já. */
  onFechar: (mensagem?: string, gravado?: Produto) => void;
}) {
  const router = useRouter();
  const inicial = produto ? entradaDoProduto(produto) : NOVO;
  const [e, setE] = useState<EntradaProduto>(inicial);
  const [variantes, setVariantes] = useState<VarianteForm[]>(() =>
    inicial.variantes.map((v) => ({
      id: v.id,
      rotulo: v.rotulo?.pt ?? "",
      pessoas: v.pessoas === null ? "" : String(v.pessoas),
      preco: emEuros(v.precoCent),
      sobOrcamento: v.precoCent === null && produto !== null,
      composicao: v.composicao,
    })),
  );
  const [novaEscolha, setNovaEscolha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, iniciar] = useTransition();
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);

  /* Mexer num campo tira o erro: um aviso que fica depois de corrigido lê-se
     como se a correção não tivesse servido. */
  const mudar = (parcial: Partial<EntradaProduto>) => {
    setErro(null);
    setE((atual) => ({ ...atual, ...parcial }));
  };
  const alergenios = e.alergenios;
  /* O modo à parte da lista: «tem alergénios» com nenhum marcado ainda não é
     «sem alergénios» — e nunca se marca um por defeito (seria o site a
     inventar um alergénio). */
  const [modoAlergenios, setModoAlergenios] = useState<"por-responder" | "nenhum" | "lista">(
    alergenios === null ? "por-responder" : alergenios.length === 0 ? "nenhum" : "lista",
  );

  const gravar = () =>
    iniciar(async () => {
      setErro(null);
      /* Os preços escrevem-se em euros e guardam-se em cêntimos inteiros (regra 2). */
      const lidas = variantes.map((v) => ({ v, cent: v.sobOrcamento ? null : paraCent(v.preco) }));
      const falhada = lidas.find(({ v, cent }) => !v.sobOrcamento && cent === null);
      if (falhada) return setErro("Confira os preços: escrevem-se em euros, como 12 ou 12,50 — ou marque «sob orçamento».");
      if (modoAlergenios === "lista" && (e.alergenios ?? []).length === 0) {
        return setErro("Marque pelo menos um alergénio — ou escolha «sem alergénios».");
      }
      if (e.aVendaOnline && e.alergenios === null) {
        return setErro("Para pôr à venda online, responda primeiro aos alergénios — mesmo que seja «sem alergénios».");
      }
      const entrada: EntradaProduto = {
        ...e,
        nome: { pt: e.nome.pt.trim(), en: e.nome.en?.trim() || null },
        descricao: e.descricao?.pt.trim() ? { pt: e.descricao.pt.trim(), en: e.descricao.en?.trim() || null } : null,
        variantes: lidas.map(({ v, cent }) => ({
          ...(v.id ? { id: v.id } : {}),
          rotulo: v.rotulo.trim() ? { pt: v.rotulo.trim(), en: null } : null,
          pessoas: e.familia === "festa" && v.pessoas ? Number(v.pessoas) : null,
          precoCent: cent,
          composicao: v.composicao,
        })),
      };
      const resultado = await gravarProduto(produto?.id ?? null, entrada);
      if (!resultado.ok) {
        const campos = (resultado.campos ?? []).map((c) => CAMPOS[c] ?? c);
        return setErro(campos.length > 0 ? `Confira ${campos.join(", ")}.` : MENSAGENS[resultado.erro]);
      }
      router.refresh();
      onFechar(`«${resultado.valor.nome.pt}» gravado. O site já mostra a alteração.`, resultado.valor);
    });

  const alternarArquivo = () =>
    iniciar(async () => {
      if (!produto) return;
      const resultado = await arquivar(produto.id, !produto.arquivado);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
      onFechar(
        produto.arquivado ? `«${produto.nome.pt}» voltou.` : `«${produto.nome.pt}» arquivado: saiu do site.`,
        resultado.valor,
      );
    });

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        gravar();
      }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onFechar()} className={BOTAO_SECUNDARIO}>
          ← Produtos
        </button>
        <h3 className="titulo-display mr-auto text-2xl">{produto ? produto.nome.pt : "Novo produto"}</h3>
      </div>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Nome e descrição</legend>
        <label className="block text-sm font-semibold">
          Nome
          <input required value={e.nome.pt} onChange={(ev) => mudar({ nome: { ...e.nome, pt: ev.target.value } })} className={campo} />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Nome em inglês <span className="font-normal text-tinta-suave">(opcional)</span>
          <input value={e.nome.en ?? ""} onChange={(ev) => mudar({ nome: { ...e.nome, en: ev.target.value } })} className={campo} />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Descrição <span className="font-normal text-tinta-suave">(opcional)</span>
          <textarea
            rows={3}
            value={e.descricao?.pt ?? ""}
            onChange={(ev) => mudar({ descricao: { pt: ev.target.value, en: e.descricao?.en ?? null } })}
            className={campo}
          />
        </label>
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Onde aparece</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["ementa", "Na carta"],
              ["encomendas", "Nas encomendas"],
            ] as const
          ).map(([origem, rotulo]) => (
            <label key={origem} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                checked={e.origem === origem}
                onChange={() => mudar(origem === "ementa" ? { origem, familia: "ementa" } : { origem, familia: "bolo", carta: null, categoria: null, subcategoria: null })}
                className="size-5 accent-tijolo"
              />
              {rotulo}
            </label>
          ))}
        </div>
        {e.origem === "ementa" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              Carta
              <select value={e.carta ?? ""} onChange={(ev) => mudar({ carta: ev.target.value || null })} className={campo}>
                <option value="">—</option>
                {ordem.cartas.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Categoria
              <select value={e.categoria ?? ""} onChange={(ev) => mudar({ categoria: ev.target.value || null })} className={campo}>
                <option value="">—</option>
                {ordem.categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Grupo <span className="font-normal text-tinta-suave">(bebidas)</span>
              <select value={e.subcategoria ?? ""} onChange={(ev) => mudar({ subcategoria: ev.target.value || null })} className={campo}>
                <option value="">—</option>
                {ordem.subcategorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <label className="mt-3 block text-sm font-semibold">
            Família
            <select value={e.familia} onChange={(ev) => mudar({ familia: ev.target.value as EntradaProduto["familia"] })} className={campo}>
              <option value="festa">Kit de festa</option>
              <option value="bolo">Kit de bolo</option>
              <option value="box">Box</option>
              <option value="medida">Bolo por medida</option>
            </select>
          </label>
        )}
        <div className="mt-3 space-y-1">
          <Caixa checked={e.apareceNaEmenta} onChange={(v) => mudar({ apareceNaEmenta: v })} titulo="Aparece na ementa" />
          <Caixa
            checked={e.aVendaOnline}
            onChange={(v) => mudar({ aVendaOnline: v })}
            titulo="À venda online"
            explicacao="Diferente de aparecer na ementa: não se encomenda um galão para sexta."
          />
        </div>
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Preço e variantes</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["un", "À unidade"],
              ["kg", "Ao quilo"],
            ] as const
          ).map(([unidade, rotulo]) => (
            <label key={unidade} className="flex min-h-11 items-center gap-2">
              <input type="radio" checked={e.unidade === unidade} onChange={() => mudar({ unidade })} className="size-5 accent-tijolo" />
              {rotulo}
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-tinta-suave">
          Variantes mudam o preço (tamanho, pessoas). Sem variantes, deixe só uma, sem nome.
        </p>
        <ul className="mt-3 space-y-3">
          {variantes.map((v, i) => (
            <li key={v.id ?? `nova-${i}`} className="grid gap-2 rounded-xl bg-tinta/5 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <label className="text-sm font-semibold">
                Nome da variante
                <input
                  value={v.rotulo}
                  placeholder={variantes.length === 1 ? "(sem nome)" : "ex.: 2 kg"}
                  onChange={(ev) => setVariantes(variantes.map((w, j) => (j === i ? { ...w, rotulo: ev.target.value } : w)))}
                  className={campo}
                />
              </label>
              {e.familia === "festa" && (
                <label className="text-sm font-semibold">
                  Pessoas
                  <input
                    inputMode="numeric"
                    value={v.pessoas}
                    onChange={(ev) => setVariantes(variantes.map((w, j) => (j === i ? { ...w, pessoas: ev.target.value.replace(/\D/g, "") } : w)))}
                    className={`${campo} w-24`}
                  />
                </label>
              )}
              <label className="text-sm font-semibold">
                Preço{e.unidade === "kg" ? " por kg" : ""} (€)
                <input
                  inputMode="decimal"
                  value={v.preco}
                  disabled={v.sobOrcamento}
                  placeholder="0,00"
                  onChange={(ev) => setVariantes(variantes.map((w, j) => (j === i ? { ...w, preco: ev.target.value } : w)))}
                  className={`${campo} w-28 text-right tabular-nums disabled:opacity-50`}
                />
              </label>
              <div className="flex items-center gap-3">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={v.sobOrcamento}
                    onChange={(ev) => setVariantes(variantes.map((w, j) => (j === i ? { ...w, sobOrcamento: ev.target.checked } : w)))}
                    className="size-5 accent-tijolo"
                  />
                  Sob orçamento
                </label>
                {variantes.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Tirar a variante ${v.rotulo || i + 1}`}
                    onClick={() => setVariantes(variantes.filter((_, j) => j !== i))}
                    className="min-h-11 min-w-11 text-xl"
                  >
                    ×
                  </button>
                )}
              </div>
              {v.composicao.length > 0 && (
                <p className="text-xs text-tinta-suave sm:col-span-4">
                  Leva {v.composicao.flatMap((g) => g.linhas).length} artigos — a composição edita-se numa próxima etapa e fica como está.
                </p>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setVariantes([...variantes, { rotulo: "", pessoas: "", preco: "", sobOrcamento: false, composicao: [] }])}
          className={`${BOTAO_SECUNDARIO} mt-3`}
        >
          + Variante
        </button>
        {produto && (
          <p className="mt-2 text-xs text-tinta-suave">
            Tirar uma variante que alguém já tem no cesto faz-lhe aparecer «já não existe» no checkout.
          </p>
        )}
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Escolhas</legend>
        <p className="text-sm text-tinta-suave">Não mudam o preço: sabores, cores.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {e.escolhas.map((escolha) => (
            <span key={escolha} className="flex items-center gap-1 rounded-full bg-tinta/10 py-1 pl-3 pr-1">
              {escolha}
              <button
                type="button"
                aria-label={`Tirar ${escolha}`}
                onClick={() => mudar({ escolhas: e.escolhas.filter((x) => x !== escolha) })}
                className="min-h-9 min-w-9"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={novaEscolha}
            onChange={(ev) => setNovaEscolha(ev.target.value)}
            placeholder="ex.: chocolate"
            aria-label="Nova escolha"
            className={`${campo} mt-0`}
          />
          <button
            type="button"
            disabled={!novaEscolha.trim() || e.escolhas.includes(novaEscolha.trim())}
            onClick={() => {
              mudar({ escolhas: [...e.escolhas, novaEscolha.trim()] });
              setNovaEscolha("");
            }}
            className={BOTAO_SECUNDARIO}
          >
            Juntar
          </button>
        </div>
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Encomenda</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Quantidade mínima
            <input
              type="number"
              min={e.unidade === "kg" ? 0.5 : 1}
              step={e.unidade === "kg" ? 0.5 : 1}
              value={e.quantidadeMinima}
              onChange={(ev) => mudar({ quantidadeMinima: Number(ev.target.value) })}
              className={campo}
            />
          </label>
          <label className="text-sm font-semibold">
            De quanto em quanto
            <input
              type="number"
              min={e.unidade === "kg" ? 0.5 : 1}
              step={e.unidade === "kg" ? 0.5 : 1}
              value={e.multiplo}
              onChange={(ev) => mudar({ multiplo: Number(ev.target.value) })}
              className={campo}
            />
          </label>
        </div>
        <div className="mt-4">
          <Caixa
            checked={e.tempoProducao !== null}
            onChange={(v) => mudar({ tempoProducao: v ? { unidade: "dias", valor: 1 } : null })}
            titulo="Tempo de produção"
            explicacao="Sem ele, o calendário oferece a hora como «a confirmar»."
          />
          {e.tempoProducao && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                aria-label="Tempo de produção"
                value={e.tempoProducao.valor}
                onChange={(ev) => mudar({ tempoProducao: { ...e.tempoProducao!, valor: Number(ev.target.value) } })}
                className="w-24 rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              />
              <select
                aria-label="Unidade do tempo"
                value={e.tempoProducao.unidade}
                onChange={(ev) => mudar({ tempoProducao: { ...e.tempoProducao!, unidade: ev.target.value as "horas" | "dias" } })}
                className="rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              >
                <option value="horas">horas de cozinha</option>
                <option value="dias">dias</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Caixa
            checked={e.limite !== null}
            onChange={(v) => mudar({ limite: v ? { quantidade: 10, modo: "porDia" } : null })}
            titulo="Limitar quantidade"
            explicacao="Por dia é a capacidade da cozinha; no total é um stock que não volta. Os pedidos feitos nunca são cancelados por isto."
          />
          {e.limite && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                aria-label="Quantidade máxima"
                value={e.limite.quantidade}
                onChange={(ev) => mudar({ limite: { ...e.limite!, quantidade: Number(ev.target.value) } })}
                className="w-24 rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              />
              <select
                aria-label="Limite por"
                value={e.limite.modo}
                onChange={(ev) => mudar({ limite: { ...e.limite!, modo: ev.target.value as "porDia" | "total" } })}
                className="rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              >
                <option value="porDia">por dia</option>
                <option value="total">no total</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Caixa
            checked={e.sinalPercent !== null}
            onChange={(v) => mudar({ sinalPercent: v ? 30 : null })}
            titulo="Pede sinal"
            explicacao="Paga-se uma parte online e o resto na loja."
          />
          {e.sinalPercent !== null && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                aria-label="Percentagem do sinal"
                value={e.sinalPercent}
                onChange={(ev) => mudar({ sinalPercent: Number(ev.target.value) })}
                className="w-24 rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              />
              %
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Alergénios</legend>
        <div className="space-y-1">
          {(
            [
              ["por-responder", "Por responder", "Ninguém verificou ainda. Não vai à venda online."],
              ["nenhum", "Sem alergénios", "Verificado: não tem nenhum dos 14."],
              ["lista", "Tem alergénios", "Marque quais."],
            ] as const
          ).map(([modo, titulo, explicacao]) => (
            <label key={modo} className="flex min-h-11 items-start gap-3">
              <input
                type="radio"
                checked={modoAlergenios === modo}
                onChange={() => {
                  setModoAlergenios(modo);
                  mudar({ alergenios: modo === "por-responder" ? null : modo === "nenhum" ? [] : (alergenios ?? []) });
                }}
                className="mt-1 size-5 accent-tijolo"
              />
              <span>
                <strong>{titulo}</strong>
                <span className="block text-sm text-tinta-suave">{explicacao}</span>
              </span>
            </label>
          ))}
        </div>
        {modoAlergenios === "lista" && (
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            {[...ALERGENIOS_UE, ...(alergenios ?? []).filter((a) => !(ALERGENIOS_UE as readonly string[]).includes(a))].map((a) => (
              <label key={a} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={(alergenios ?? []).includes(a)}
                  onChange={(ev) =>
                    mudar({ alergenios: ev.target.checked ? [...(alergenios ?? []), a] : (alergenios ?? []).filter((x) => x !== a) })
                  }
                  className="size-5 accent-tijolo"
                />
                {a}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className={caixa}>
        <legend className="titulo-display px-1 text-xl">Marcas e fotos</legend>
        <Caixa checked={e.vegan} onChange={(v) => mudar({ vegan: v })} titulo="Vegan" explicacao="Marcado pela casa. O site nunca o deduz." />
        <Caixa checked={e.semGluten} onChange={(v) => mudar({ semGluten: v })} titulo="Sem glúten" />
        <div className="mt-3">
          {e.fotos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {e.fotos.map((foto) => (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura no painel, sem otimizador
                <img key={foto} src={foto} alt="" className="size-20 rounded-xl object-cover" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-tinta-suave">Sem fotos.</p>
          )}
          <p className="mt-1 text-sm text-tinta-suave">Tirar fotos no telemóvel e pô-las aqui chega com o envio de fotos.</p>
        </div>
      </fieldset>

      {erro && (
        <p role="alert" className="rounded-xl border-2 border-tijolo bg-papel px-4 py-3 font-semibold text-tijolo">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={aGravar} className={`${BOTAO_PRINCIPAL} min-h-14 px-10`}>
          {aGravar ? "A gravar…" : produto ? "Gravar" : "Criar produto"}
        </button>
        <button type="button" onClick={() => onFechar()} className={BOTAO_SECUNDARIO}>
          Cancelar
        </button>
        {produto &&
          (confirmarArquivo || produto.arquivado ? (
            <button type="button" disabled={aGravar} onClick={alternarArquivo} className={`${BOTAO} ml-auto border border-tijolo text-tijolo`}>
              {produto.arquivado ? "Voltar a pôr" : "Arquivar mesmo — sai do site"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmarArquivo(true)} className={`${BOTAO} ml-auto underline underline-offset-4`}>
              Apagar
            </button>
          ))}
      </div>
    </form>
  );
}

function Caixa({
  checked,
  onChange,
  titulo,
  explicacao,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  explicacao?: string;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(ev) => onChange(ev.target.checked)} className="mt-1 size-5 accent-tijolo" />
      <span>
        <strong>{titulo}</strong>
        {explicacao && <span className="block text-sm text-tinta-suave">{explicacao}</span>}
      </span>
    </label>
  );
}
