"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { arquivar, gravarProduto } from "@/app/painel/acoes-gestao";
import type { EntradaProduto, OrdemEmenta, Produto } from "@/lib/dados/tipos";
import { ALERGENIOS_UE, entradaDoProduto, paraCent } from "@/lib/painel";
import { Ajuda, Rotulo } from "../Ajuda";
import { BOTAO, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";
import { usePainel } from "../PainelAberto";
import { FotosProduto } from "./FotosProduto";

/**
 * # Um produto, como a gerente o edita (`painel-gerente.md` › O que cada produto tem)
 *
 * Por separadores desde a proposta de 25/11 — **Geral, Tamanhos e preços,
 * Opções, Encomenda, Alergénios, Fotografias** —, com o guardar num rodapé
 * fixo. Antes era uma página corrida de oito caixas, e no telemóvel o botão de
 * gravar ficava sete ecrãs abaixo do nome.
 *
 * Os separadores mudam o que se vê, não o que se grava: o rascunho é um só, e
 * passar de um para outro não perde nada. Um campo que o servidor recusa abre
 * o separador dele.
 *
 * A validação está no servidor (`EsquemaEntradaProduto`); aqui só se ajuda a
 * não errar. As explicações estão no «?» de cada campo (`Ajuda.tsx`); fica à
 * vista só o que é preciso para não errar.
 *
 * ⚠️ **Os nomes mudaram na interface, não no modelo.** «Tamanho» é a
 * `variante` (muda o preço) e «Opção» é a `escolha` (não muda). Os tamanhos e
 * grupos de opções do #88 pedem contrato novo; até lá é isto que se grava.
 *
 * ⚠️ **Sem alergénios respondidos, não vai à venda online.** «Por responder» não
 * é «sem alergénios»: confundi-los é dizer a um alérgico que não há nada quando
 * ninguém verificou.
 */

type Separador = "geral" | "precos" | "opcoes" | "encomenda" | "alergenios" | "fotos";

const SEPARADORES: { id: Separador; rotulo: string }[] = [
  { id: "geral", rotulo: "Geral" },
  { id: "precos", rotulo: "Tamanhos e preços" },
  { id: "opcoes", rotulo: "Opções" },
  { id: "encomenda", rotulo: "Encomenda" },
  { id: "alergenios", rotulo: "Alergénios" },
  { id: "fotos", rotulo: "Fotografias" },
];

/** O nome que cada campo recusado tem para a gerente, e o separador onde vive. */
const CAMPOS: Record<string, { nome: string; em: Separador }> = {
  nome: { nome: "o nome", em: "geral" },
  descricao: { nome: "a descrição", em: "geral" },
  carta: { nome: "a secção", em: "geral" },
  categoria: { nome: "a categoria", em: "geral" },
  familia: { nome: "a família", em: "geral" },
  variantes: { nome: "os tamanhos e os preços", em: "precos" },
  tempoProducao: { nome: "o tempo de produção", em: "encomenda" },
  quantidadeMinima: { nome: "a quantidade mínima", em: "encomenda" },
  multiplo: { nome: "o «de quanto em quanto»", em: "encomenda" },
  alergenios: { nome: "os alergénios", em: "alergenios" },
  sinalPercent: { nome: "o sinal", em: "encomenda" },
  limite: { nome: "o limite de quantidade", em: "encomenda" },
};

const FAMILIAS: Record<EntradaProduto["familia"], string> = {
  ementa: "Carta",
  festa: "Kit de festa",
  bolo: "Kit de bolo",
  box: "Box",
  medida: "Bolo por medida",
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
  /* Desligada, como o «sob orçamento» da variante de um produto novo: é a
     gerente que a liga, se quiser. */
  pedeConfirmacao: false,
  fotos: [],
  sinalPercent: null,
  limite: null,
};

type VarianteForm = {
  id?: string;
  rotulo: string;
  pessoas: string;
  preco: string;
  sobOrcamento: boolean;
  composicao: EntradaProduto["variantes"][number]["composicao"];
};
type ModoAlergenios = "por-responder" | "nenhum" | "lista";

const emEuros = (cent: number | null) => (cent === null ? "" : (cent / 100).toFixed(2).replace(".", ","));

const campo =
  "mt-1.5 block w-full min-w-0 rounded-xl border border-tinta/20 bg-papel px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo disabled:opacity-50";
const bloco = "border-t border-tinta/10 pt-5";

function estadoInicial(produto: Produto | null) {
  const e = produto ? entradaDoProduto(produto) : NOVO;
  const variantes: VarianteForm[] = e.variantes.map((v) => ({
    id: v.id,
    rotulo: v.rotulo?.pt ?? "",
    pessoas: v.pessoas === null ? "" : String(v.pessoas),
    preco: emEuros(v.precoCent),
    sobOrcamento: v.precoCent === null && produto !== null,
    composicao: v.composicao,
  }));
  /* O modo à parte da lista: «tem alergénios» com nenhum marcado ainda não é
     «sem alergénios» — e nunca se marca um por defeito (seria o site a
     inventar um alergénio). */
  const modo: ModoAlergenios = e.alergenios === null ? "por-responder" : e.alergenios.length === 0 ? "nenhum" : "lista";
  return { e, variantes, modo };
}

export function EditorProduto({
  produto,
  ordem,
  onFechar,
  onSujo,
}: {
  produto: Produto | null;
  ordem: OrdemEmenta;
  /** Sem argumentos, só fecha. Com o produto como ficou no servidor, para a lista o mostrar já. */
  onFechar: (mensagem?: string, gravado?: Produto) => void;
  /** Diz à lista se há alterações por guardar. */
  onSujo: (sujo: boolean) => void;
}) {
  const router = useRouter();
  const { ocupado } = usePainel();
  const [inicial] = useState(() => estadoInicial(produto));
  const [e, setE] = useState<EntradaProduto>(inicial.e);
  const [variantes, setVariantes] = useState<VarianteForm[]>(inicial.variantes);
  const [modoAlergenios, setModoAlergenios] = useState<ModoAlergenios>(inicial.modo);
  const [separador, setSeparador] = useState<Separador>("geral");
  const [novaEscolha, setNovaEscolha] = useState("");
  const [erro, setErro] = useState<{ texto: string; em: Separador[] } | null>(null);
  const [aGravar, iniciar] = useTransition();
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
  const ids = useId();

  /* Sujo é diferente do que se abriu — e não «mexeu em alguma coisa»: quem
     escreve e apaga a mesma letra não tem nada por guardar. */
  const sujo =
    JSON.stringify([e, variantes, modoAlergenios]) !== JSON.stringify([inicial.e, inicial.variantes, inicial.modo]);

  const avisar = useRef(onSujo);
  useEffect(() => {
    avisar.current = onSujo;
  });
  useEffect(() => {
    avisar.current(sujo);
    if (!sujo) return;
    /* Com um rascunho a meio, o painel não recarrega sozinho para uma versão
       nova do site (`PainelAberto`), e fechar o separador pergunta primeiro. */
    const libertar = ocupado();
    const aoSair = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", aoSair);
    return () => {
      libertar();
      window.removeEventListener("beforeunload", aoSair);
    };
  }, [sujo, ocupado]);

  /* Mexer num campo tira o erro: um aviso que fica depois de corrigido lê-se
     como se a correção não tivesse servido. */
  const mudar = (parcial: Partial<EntradaProduto>) => {
    setErro(null);
    setE((atual) => ({ ...atual, ...parcial }));
  };
  const mudarVariante = (i: number, parcial: Partial<VarianteForm>) => {
    setErro(null);
    setVariantes((atuais) => atuais.map((w, j) => (j === i ? { ...w, ...parcial } : w)));
  };
  const falhar = (texto: string, em: Separador[]) => {
    setErro({ texto, em });
    if (em.length > 0 && !em.includes(separador)) setSeparador(em[0]);
  };
  const alergenios = e.alergenios;

  const cancelar = () => {
    setE(inicial.e);
    setVariantes(inicial.variantes);
    setModoAlergenios(inicial.modo);
    setErro(null);
  };

  const gravar = () =>
    iniciar(async () => {
      setErro(null);
      /* Os preços escrevem-se em euros e guardam-se em cêntimos inteiros (regra 2). */
      const lidas = variantes.map((v) => ({ v, cent: v.sobOrcamento ? null : paraCent(v.preco) }));
      if (lidas.some(({ v, cent }) => !v.sobOrcamento && cent === null)) {
        return falhar("Confira os preços: em euros, como 12 ou 12,50 — ou marque «sob orçamento».", ["precos"]);
      }
      if (modoAlergenios === "lista" && (e.alergenios ?? []).length === 0) {
        return falhar("Marque pelo menos um alergénio, ou escolha «sem alergénios».", ["alergenios"]);
      }
      if (e.aVendaOnline && e.alergenios === null) {
        return falhar("Para pôr à venda online, responda primeiro aos alergénios.", ["alergenios"]);
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
        const campos = (resultado.campos ?? []).map((c) => CAMPOS[c]).filter(Boolean);
        return campos.length > 0
          ? falhar(`Confira ${campos.map((c) => c.nome).join(", ")}.`, [...new Set(campos.map((c) => c.em))])
          : falhar(MENSAGENS[resultado.erro], []);
      }
      router.refresh();
      onFechar(`«${resultado.valor.nome.pt}» guardado. O site já mostra a alteração.`, resultado.valor);
    });

  const alternarArquivo = () =>
    iniciar(async () => {
      if (!produto) return;
      const resultado = await arquivar(produto.id, !produto.arquivado);
      if (!resultado.ok) return falhar(MENSAGENS[resultado.erro], []);
      router.refresh();
      onFechar(
        produto.arquivado ? `«${produto.nome.pt}» voltou ao site.` : `«${produto.nome.pt}» arquivado: saiu do site.`,
        resultado.valor,
      );
    });

  /* Setas para o lado entre separadores, como em qualquer `tablist`. */
  const teclaSeparador = (ev: React.KeyboardEvent, i: number) => {
    const passo = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    ev.preventDefault();
    const proximo = SEPARADORES[(i + passo + SEPARADORES.length) % SEPARADORES.length].id;
    setSeparador(proximo);
    document.getElementById(`${ids}-sep-${proximo}`)?.focus();
  };

  const subtitulo =
    e.origem === "ementa"
      ? ["Carta", e.carta, e.categoria].filter(Boolean).join(" · ")
      : `Encomendas · ${FAMILIAS[e.familia]}`;
  const estado = produto?.arquivado
    ? "Arquivado"
    : e.aVendaOnline && !produto?.foraDeVenda
      ? "À venda online"
      : "Fora de venda";

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        gravar();
      }}
      noValidate
      className="flex min-h-full flex-col"
    >
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <button type="button" onClick={() => onFechar()} className={`${BOTAO_SECUNDARIO} mb-4 lg:hidden`}>
          ← Produtos
        </button>
        <div className="flex flex-wrap items-start gap-3">
          <div className="mr-auto min-w-0">
            <h3 className="titulo-display text-2xl sm:text-3xl">{e.nome.pt.trim() || (produto ? produto.nome.pt : "Novo produto")}</h3>
            <p className="mt-0.5 text-sm text-tinta-suave">{subtitulo}</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${estado === "À venda online" ? "bg-tinta text-papel" : "bg-tinta/10"}`}>
            {estado}
          </span>
        </div>

        {/* A linha por baixo é uma sombra por dentro, e não uma borda: com o
            `overflow-x-auto`, o `-mb-px` que punha o sublinhado do separador por
            cima da borda fazia aparecer uma barra de rolagem vertical. */}
        <div role="tablist" aria-label="Partes do produto" className="-mx-4 mt-4 flex overflow-x-auto overflow-y-hidden px-4 shadow-[inset_0_-1px_0_rgb(31_29_27/0.1)] sm:-mx-6 sm:px-6">
          {SEPARADORES.map(({ id, rotulo }, i) => {
            const comErro = erro?.em.includes(id);
            return (
              <button
                key={id}
                id={`${ids}-sep-${id}`}
                type="button"
                role="tab"
                aria-selected={separador === id}
                aria-controls={`${ids}-painel`}
                tabIndex={separador === id ? 0 : -1}
                onClick={() => setSeparador(id)}
                onKeyDown={(ev) => teclaSeparador(ev, i)}
                className={`relative flex min-h-12 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tijolo ${
                  separador === id ? "border-tijolo font-semibold text-tijolo" : "border-transparent text-tinta-suave hover:text-tinta"
                }`}
              >
                {rotulo}
                {comErro && (
                  <span className="size-2 rounded-full bg-tijolo">
                    <span className="sr-only"> · por corrigir</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`${ids}-painel`}
        role="tabpanel"
        aria-labelledby={`${ids}-sep-${separador}`}
        className="flex-1 space-y-5 px-4 py-5 sm:px-6"
      >
        {separador === "geral" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Rotulo
                  htmlFor={`${ids}-nome`}
                  ajuda="Como aparece no site, no cesto, no email e no talão. Os produtos ordenam-se por este nome, por ordem alfabética, aqui e nas encomendas."
                >
                  Nome do produto
                </Rotulo>
                <input
                  id={`${ids}-nome`}
                  required
                  value={e.nome.pt}
                  onChange={(ev) => mudar({ nome: { ...e.nome, pt: ev.target.value } })}
                  className={campo}
                />
              </div>
              <div>
                <Rotulo
                  htmlFor={`${ids}-origem`}
                  ajuda={
                    <>
                      <strong>Carta:</strong> o que se pede ao balcão, encomendado com um mínimo (ex.: à dúzia).{" "}
                      <strong>Encomendas:</strong> kits, bolos e boxes, com data e antecedência.
                    </>
                  }
                >
                  Onde aparece
                </Rotulo>
                <select
                  id={`${ids}-origem`}
                  value={e.origem}
                  onChange={(ev) =>
                    mudar(
                      ev.target.value === "ementa"
                        ? { origem: "ementa", familia: "ementa" }
                        : { origem: "encomendas", familia: "bolo", carta: null, categoria: null, subcategoria: null },
                    )
                  }
                  className={campo}
                >
                  <option value="ementa">Carta</option>
                  <option value="encomendas">Encomendas</option>
                </select>
              </div>
            </div>

            {e.origem === "ementa" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Rotulo htmlFor={`${ids}-carta`} ajuda="A carta onde o produto aparece, como no impresso da casa.">
                    Secção
                  </Rotulo>
                  <select id={`${ids}-carta`} value={e.carta ?? ""} onChange={(ev) => mudar({ carta: ev.target.value || null })} className={campo}>
                    <option value="">—</option>
                    {ordem.cartas.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Rotulo htmlFor={`${ids}-categoria`} ajuda="Agrupa os produtos dentro da secção. A ordem muda-se em «Ordem das categorias».">
                    Categoria
                  </Rotulo>
                  <select
                    id={`${ids}-categoria`}
                    value={e.categoria ?? ""}
                    onChange={(ev) => mudar({ categoria: ev.target.value || null })}
                    className={campo}
                  >
                    <option value="">—</option>
                    {ordem.categorias.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Rotulo htmlFor={`${ids}-grupo`} opcional ajuda="Só nas bebidas: quentes, frias, sumos.">
                    Grupo
                  </Rotulo>
                  <select
                    id={`${ids}-grupo`}
                    value={e.subcategoria ?? ""}
                    onChange={(ev) => mudar({ subcategoria: ev.target.value || null })}
                    className={campo}
                  >
                    <option value="">—</option>
                    {ordem.subcategorias.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="sm:max-w-xs">
                <Rotulo htmlFor={`${ids}-familia`} ajuda="Decide o cartão e a página onde o produto aparece nas encomendas.">
                  Família
                </Rotulo>
                <select
                  id={`${ids}-familia`}
                  value={e.familia}
                  onChange={(ev) => mudar({ familia: ev.target.value as EntradaProduto["familia"] })}
                  className={campo}
                >
                  {(["festa", "bolo", "box", "medida"] as const).map((f) => (
                    <option key={f} value={f}>
                      {FAMILIAS[f]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Rotulo htmlFor={`${ids}-descricao`} opcional ajuda="Uma ou duas frases: o que leva e para quantos. Aparece por baixo do nome.">
                Descrição
              </Rotulo>
              <textarea
                id={`${ids}-descricao`}
                rows={3}
                value={e.descricao?.pt ?? ""}
                onChange={(ev) => mudar({ descricao: { pt: ev.target.value, en: e.descricao?.en ?? null } })}
                className={campo}
              />
            </div>

            <details className="group" open={Boolean(e.nome.en)}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-tijolo">
                <span aria-hidden className="transition-transform group-open:rotate-90">
                  ▸
                </span>
                Tradução em inglês <span className="font-normal text-tinta-suave">· opcional</span>
              </summary>
              <div className="mt-2 sm:max-w-md">
                <Rotulo htmlFor={`${ids}-nome-en`} ajuda="Para quem vê o site em inglês. Vazio, aparece o nome em português.">
                  Nome em inglês
                </Rotulo>
                <input
                  id={`${ids}-nome-en`}
                  value={e.nome.en ?? ""}
                  onChange={(ev) => mudar({ nome: { ...e.nome, en: ev.target.value } })}
                  className={campo}
                />
              </div>
            </details>

            <div className={bloco}>
              {/* ⚠️ **Saiu a caixa «Aparece na ementa».** A `/ementa` saiu a 12/11
                  (#123), e nenhuma página lia aquele valor: era uma caixa que não
                  mudava nada no site. A coluna continua na base de dados, e o valor
                  que lá está guarda-se ao gravar. */}
              <Interruptor
                ligado={e.aVendaOnline}
                onMudar={(v) => mudar({ aVendaOnline: v })}
                titulo="À venda online"
                nota="Com botão de encomendar. Só com os alergénios respondidos."
                ajuda="Desligado, o produto não se encomenda pelo site. Um galão, por exemplo, fica desligado."
              />
            </div>

            {produto && (
              <div className={`${bloco} flex flex-wrap items-center gap-3`}>
                <p className="mr-auto text-sm text-tinta-suave">
                  {produto.arquivado ? "Arquivado: fora do site, com os pedidos antigos guardados." : "Arquivar tira do site e guarda os pedidos antigos."}
                </p>
                {confirmarArquivo || produto.arquivado ? (
                  <button
                    type="button"
                    disabled={aGravar}
                    onClick={alternarArquivo}
                    className={`${BOTAO} border border-tijolo ${produto.arquivado ? "" : "bg-tijolo text-papel"}`}
                  >
                    {produto.arquivado ? "Voltar a pôr no site" : "Arquivar mesmo"}
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmarArquivo(true)} className={BOTAO_SECUNDARIO}>
                    Arquivar
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {separador === "precos" && (
          <>
            <fieldset>
              <legend className="flex items-center gap-1.5 text-sm font-semibold">
                Vende-se
                <Ajuda titulo="Vende-se">Ao quilo, o preço escreve-se por kg e a quantidade pede-se em kg.</Ajuda>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["un", "À unidade"],
                    ["kg", "Ao quilo"],
                  ] as const
                ).map(([unidade, rotulo]) => (
                  <label
                    key={unidade}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-tijolo ${
                      e.unidade === unidade ? "border-tijolo bg-tijolo/5 font-semibold" : "border-tinta/20"
                    }`}
                  >
                    <input type="radio" checked={e.unidade === unidade} onChange={() => mudar({ unidade })} className="size-4 accent-tijolo" />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={bloco}>
              <h4 className="flex items-center gap-1.5 font-semibold">
                Tamanhos · {variantes.length}
                <Ajuda titulo="Tamanhos">
                  Cada tamanho tem o seu preço: «20 pessoas», «2 kg», «Caixa de 6». Com um só, deixe o nome vazio. Sabores e cores
                  não são tamanhos: vão em Opções.
                </Ajuda>
              </h4>
              <ul className="mt-3 space-y-3">
                {variantes.map((v, i) => (
                  <li key={v.id ?? `nova-${i}`} className="rounded-xl border border-tinta/10 p-3 sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                      <div>
                        <Rotulo htmlFor={`${ids}-v${i}-nome`}>Nome do tamanho</Rotulo>
                        <input
                          id={`${ids}-v${i}-nome`}
                          value={v.rotulo}
                          placeholder={variantes.length === 1 ? "(sem nome)" : "ex.: 2 kg"}
                          onChange={(ev) => mudarVariante(i, { rotulo: ev.target.value })}
                          className={campo}
                        />
                      </div>
                      {e.familia === "festa" && (
                        <div>
                          <Rotulo htmlFor={`${ids}-v${i}-pessoas`} ajuda="Para quantas pessoas dá. Aparece no cartão do kit.">
                            Pessoas
                          </Rotulo>
                          <input
                            id={`${ids}-v${i}-pessoas`}
                            inputMode="numeric"
                            value={v.pessoas}
                            onChange={(ev) => mudarVariante(i, { pessoas: ev.target.value.replace(/\D/g, "") })}
                            className={`${campo} sm:w-24`}
                          />
                        </div>
                      )}
                      <div>
                        <Rotulo htmlFor={`${ids}-v${i}-preco`}>Preço{e.unidade === "kg" ? " por kg" : ""} (€)</Rotulo>
                        <input
                          id={`${ids}-v${i}-preco`}
                          inputMode="decimal"
                          value={v.preco}
                          disabled={v.sobOrcamento}
                          placeholder={v.sobOrcamento ? "—" : "0,00"}
                          onChange={(ev) => mudarVariante(i, { preco: ev.target.value })}
                          className={`${campo} text-right tabular-nums sm:w-32`}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4">
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={v.sobOrcamento}
                          onChange={(ev) => mudarVariante(i, { sobOrcamento: ev.target.checked })}
                          className="size-5 accent-tijolo"
                        />
                        Sob orçamento
                      </label>
                      <Ajuda titulo="Sob orçamento">Sem preço no site. A casa diz o valor depois do pedido, e o cliente aceita.</Ajuda>
                      {variantes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setErro(null);
                            setVariantes(variantes.filter((_, j) => j !== i));
                          }}
                          className="ml-auto min-h-11 text-sm text-tijolo underline underline-offset-4"
                        >
                          Remover tamanho
                        </button>
                      )}
                    </div>
                    {v.composicao.length > 0 && (
                      <p className="mt-1 text-xs text-tinta-suave">
                        Leva {v.composicao.flatMap((g) => g.linhas).length} artigos · a composição ainda não se edita aqui.
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
                + Tamanho
              </button>
              {produto && (
                <p className="mt-2 text-xs text-tinta-suave">Remover um tamanho que alguém tem no cesto mostra-lhe «já não existe».</p>
              )}
            </div>
          </>
        )}

        {separador === "opcoes" && (
          <div>
            <h4 className="flex items-center gap-1.5 font-semibold">
              Opções · {e.escolhas.length}
              <Ajuda titulo="Opções">
                Sabores, cores, recheios — o que o cliente escolhe ao encomendar. Não mudam o preço: se mudar, é um tamanho.
              </Ajuda>
            </h4>
            <p className="mt-1 text-sm text-tinta-suave">Não mudam o preço.</p>
            {e.escolhas.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {e.escolhas.map((escolha) => (
                  <li key={escolha} className="flex items-center gap-1 rounded-full bg-tinta/10 py-1 pl-3 pr-1">
                    {escolha}
                    <button
                      type="button"
                      aria-label={`Remover ${escolha}`}
                      onClick={() => mudar({ escolhas: e.escolhas.filter((x) => x !== escolha) })}
                      className="min-h-9 min-w-9 rounded-full hover:bg-tinta/10"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-tinta-suave">Sem opções: o cliente não escolhe nada.</p>
            )}
            <div className="mt-4 flex gap-2 sm:max-w-md">
              <label htmlFor={`${ids}-escolha`} className="sr-only">
                Nova opção
              </label>
              <input
                id={`${ids}-escolha`}
                value={novaEscolha}
                onChange={(ev) => setNovaEscolha(ev.target.value)}
                onKeyDown={(ev) => {
                  /* Enter junta a opção, e não grava o produto inteiro. */
                  if (ev.key !== "Enter") return;
                  ev.preventDefault();
                  const nova = novaEscolha.trim();
                  if (nova && !e.escolhas.includes(nova)) {
                    mudar({ escolhas: [...e.escolhas, nova] });
                    setNovaEscolha("");
                  }
                }}
                placeholder="ex.: chocolate"
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
                + Opção
              </button>
            </div>
          </div>
        )}

        {separador === "encomenda" && (
          <>
            <div>
              <h4 className="font-semibold">Quantidades</h4>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <Rotulo htmlFor={`${ids}-minimo`} ajuda="O menos que se pode pedir. Com 6, ninguém pede 4.">
                    Quantidade mínima
                  </Rotulo>
                  <input
                    id={`${ids}-minimo`}
                    type="number"
                    min={e.unidade === "kg" ? 0.5 : 1}
                    step={e.unidade === "kg" ? 0.5 : 1}
                    value={e.quantidadeMinima}
                    onChange={(ev) => mudar({ quantidadeMinima: Number(ev.target.value) })}
                    className={campo}
                  />
                </div>
                <div>
                  <Rotulo
                    htmlFor={`${ids}-multiplo`}
                    ajuda={
                      <>
                        De quanto em quanto a quantidade sobe a partir do mínimo. Mínimo 6, de 6 em 6: pede-se 6, 12, 18… Para qualquer
                        quantidade, use {e.unidade === "kg" ? "0,5" : "1"}.
                      </>
                    }
                  >
                    De quanto em quanto
                  </Rotulo>
                  <input
                    id={`${ids}-multiplo`}
                    type="number"
                    min={e.unidade === "kg" ? 0.5 : 1}
                    step={e.unidade === "kg" ? 0.5 : 1}
                    value={e.multiplo}
                    onChange={(ev) => mudar({ multiplo: Number(ev.target.value) })}
                    className={campo}
                  />
                </div>
              </div>
            </div>

            <div className={bloco}>
              <Interruptor
                ligado={e.tempoProducao !== null}
                onMudar={(v) => mudar({ tempoProducao: v ? { unidade: "dias", valor: 1 } : null })}
                titulo="Tempo de produção"
                nota="Sem ele, a hora de levantamento fica a confirmar."
                ajuda="Quanto tempo a cozinha precisa antes do levantamento. O calendário só oferece horas que dão tempo."
              />
              {e.tempoProducao && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Rotulo htmlFor={`${ids}-tempo`}>Antecedência</Rotulo>
                    <input
                      id={`${ids}-tempo`}
                      type="number"
                      min={0}
                      value={e.tempoProducao.valor}
                      onChange={(ev) => mudar({ tempoProducao: { ...e.tempoProducao!, valor: Number(ev.target.value) } })}
                      className={campo}
                    />
                  </div>
                  <div>
                    <Rotulo htmlFor={`${ids}-tempo-unidade`} ajuda="Horas contam só o horário da cozinha. Dias são dias de calendário.">
                      Unidade do tempo
                    </Rotulo>
                    <select
                      id={`${ids}-tempo-unidade`}
                      value={e.tempoProducao.unidade}
                      onChange={(ev) => mudar({ tempoProducao: { ...e.tempoProducao!, unidade: ev.target.value as "horas" | "dias" } })}
                      className={campo}
                    >
                      <option value="horas">Horas de cozinha</option>
                      <option value="dias">Dias</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className={bloco}>
              <Interruptor
                ligado={e.limite !== null}
                onMudar={(v) => mudar({ limite: v ? { quantidade: 10, modo: "porDia" } : null })}
                titulo="Limitar quantidade"
                nota="Por dia: o que a cozinha faz. No total: stock que não se repõe."
                ajuda="Quando o limite se esgota, o site deixa de aceitar pedidos deste produto — por esse dia, ou de vez."
              />
              {e.limite && (
                <>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Rotulo htmlFor={`${ids}-limite`}>Quantidade máxima</Rotulo>
                      <input
                        id={`${ids}-limite`}
                        type="number"
                        min={1}
                        value={e.limite.quantidade}
                        onChange={(ev) => mudar({ limite: { ...e.limite!, quantidade: Number(ev.target.value) } })}
                        className={campo}
                      />
                    </div>
                    <div>
                      <Rotulo htmlFor={`${ids}-limite-modo`}>Limite</Rotulo>
                      <select
                        id={`${ids}-limite-modo`}
                        value={e.limite.modo}
                        onChange={(ev) => mudar({ limite: { ...e.limite!, modo: ev.target.value as "porDia" | "total" } })}
                        className={campo}
                      >
                        <option value="porDia">Por dia</option>
                        <option value="total">No total</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-tinta-suave">Baixar o limite nunca cancela pedidos já feitos.</p>
                </>
              )}
            </div>

            <div className={bloco}>
              <Interruptor
                ligado={e.pedeConfirmacao}
                onMudar={(v) => mudar({ pedeConfirmacao: v })}
                titulo="Necessita de confirmação da loja"
                nota="Mesmo com preço, o pedido espera pela resposta da casa."
                ajuda="O pedido fica «por confirmar» até alguém da casa o aceitar no painel. Sem resposta em 48 horas, expira."
              />
            </div>

            <details className={`${bloco} group`} open={e.sinalPercent !== null}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-tijolo">
                <span aria-hidden className="transition-transform group-open:rotate-90">
                  ▸
                </span>
                Sinal <span className="font-normal text-tinta-suave">· pagamento online em espera</span>
              </summary>
              <div className="mt-3">
                <Interruptor
                  ligado={e.sinalPercent !== null}
                  onMudar={(v) => mudar({ sinalPercent: v ? 30 : null })}
                  titulo="Pede sinal"
                  nota="Só conta quando o pagamento online voltar. Hoje paga-se tudo na loja."
                />
                {e.sinalPercent !== null && (
                  <div className="mt-3 sm:max-w-[10rem]">
                    <Rotulo htmlFor={`${ids}-sinal`}>Percentagem (%)</Rotulo>
                    <input
                      id={`${ids}-sinal`}
                      type="number"
                      min={1}
                      max={100}
                      value={e.sinalPercent}
                      onChange={(ev) => mudar({ sinalPercent: Number(ev.target.value) })}
                      className={campo}
                    />
                  </div>
                )}
              </div>
            </details>
          </>
        )}

        {separador === "alergenios" && (
          <>
            <fieldset>
              <legend className="flex items-center gap-1.5 font-semibold">
                Alergénios
                <Ajuda titulo="Alergénios">
                  «Por responder» não é «sem alergénios»: um alérgico lê «sem» como garantia. Sem resposta, o produto não vai à venda
                  online.
                </Ajuda>
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["por-responder", "Por responder", "Ninguém verificou."],
                    ["nenhum", "Sem alergénios", "Nenhum dos 14."],
                    ["lista", "Tem alergénios", "Marque quais."],
                  ] as const
                ).map(([modo, titulo, nota]) => (
                  <label
                    key={modo}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-tijolo ${
                      modoAlergenios === modo ? "border-tijolo bg-tijolo/5" : "border-tinta/15"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={modoAlergenios === modo}
                      onChange={() => {
                        setModoAlergenios(modo);
                        mudar({ alergenios: modo === "por-responder" ? null : modo === "nenhum" ? [] : (alergenios ?? []) });
                      }}
                      className="mt-0.5 size-5 accent-tijolo"
                    />
                    <span>
                      <strong className="block text-sm">{titulo}</strong>
                      <span className="block text-sm text-tinta-suave">{nota}</span>
                    </span>
                  </label>
                ))}
              </div>
              {modoAlergenios === "lista" && (
                <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
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

            <div className={`${bloco} space-y-4`}>
              <Interruptor
                ligado={e.vegan}
                onMudar={(v) => mudar({ vegan: v })}
                titulo="Vegan"
                ajuda="Só a casa o marca. O site nunca o deduz da descrição."
              />
              <Interruptor
                ligado={e.semGluten}
                onMudar={(v) => mudar({ semGluten: v })}
                titulo="Sem glúten"
                ajuda="Só a casa o marca, e só se o garante."
              />
            </div>
          </>
        )}

        {separador === "fotos" && (
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 font-semibold">
              Fotografias · {e.fotos.length}
              <Ajuda titulo="Fotografias">A primeira é a principal: é a que o site mostra. «Pôr como principal» troca-a.</Ajuda>
            </h4>
            <FotosProduto fotos={e.fotos} onMudar={(fotos) => mudar({ fotos })} onOcupado={setAEnviarFoto} />
          </div>
        )}
      </div>

      {/* O rodapé fica preso ao fundo: guardar está sempre à mão, em qualquer
          separador, e o erro aparece ali — não no topo de um separador que não
          se está a ver. */}
      <div className="@container sticky bottom-0 z-10 border-t border-tinta/10 bg-papel/95 px-4 py-3 backdrop-blur sm:px-6">
        {erro && (
          <p role="alert" className="mb-3 rounded-xl border-2 border-tijolo px-4 py-2.5 text-sm font-semibold text-tijolo">
            {erro.texto}
          </p>
        )}
        {/* Medido pela largura da ficha e não do ecrã: ao lado da lista, num ecrã
            largo, a ficha tem menos espaço do que sozinha num tablet. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p aria-live="polite" className="basis-full text-sm text-tinta-suave @2xl:mr-auto @2xl:basis-auto">
            {aEnviarFoto ? "A enviar a foto…" : sujo ? "Alterações por guardar" : produto ? "Sem alterações" : "Produto novo"}
          </p>
          <div className="grid w-full grid-cols-1 gap-2 @xs:grid-cols-2 @2xl:flex @2xl:w-auto">
            <button type="button" onClick={cancelar} disabled={!sujo || aGravar} className={`${BOTAO_SECUNDARIO} whitespace-nowrap px-4`}>
              {/* Abaixo de 24 rem, «Cancelar» e «Guardar»; abaixo de 20 rem, um por
                  cima do outro. Lado a lado e por extenso, a 320 px o segundo
                  saía do cartão. */}
              Cancelar<span className="hidden @sm:inline">&nbsp;alterações</span>
            </button>
            <button
              type="submit"
              disabled={aGravar || aEnviarFoto || (produto !== null && !sujo)}
              className={`${BOTAO_PRINCIPAL} whitespace-nowrap px-4`}
            >
              {aGravar ? (
                "A guardar…"
              ) : (
                <>
                  ✓&nbsp;{produto ? "Guardar" : "Criar"}
                  <span className="hidden @sm:inline">&nbsp;produto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * Um sim/não com o nome do lado e o interruptor à direita, como na proposta. É
 * um `role="switch"`: diz «ligado»/«desligado» a quem usa leitor de ecrã.
 */
function Interruptor({
  ligado,
  onMudar,
  titulo,
  nota,
  ajuda,
}: {
  ligado: boolean;
  onMudar: (v: boolean) => void;
  titulo: string;
  nota?: string;
  ajuda?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-4">
      <div className="mr-auto min-w-0">
        <span className="flex items-center gap-1.5">
          <label htmlFor={id} className="cursor-pointer font-semibold">
            {titulo}
          </label>
          {ajuda && <Ajuda titulo={titulo}>{ajuda}</Ajuda>}
        </span>
        {nota && <p className="text-sm text-tinta-suave">{nota}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => onMudar(!ligado)}
        className={`alvo-toque relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo ${
          ligado ? "bg-tijolo" : "bg-tinta/25"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1 size-5 rounded-full bg-papel shadow transition-[left] ${ligado ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}
