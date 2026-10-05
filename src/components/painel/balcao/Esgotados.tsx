"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { esgotarHoje, porForaDeVenda } from "@/app/painel/acoes-balcao";
import type { ProdutoDoBalcao } from "./Balcao";
import { BOTAO, MENSAGENS } from "./comum";

/* «Pão de Ló» encontra-se com «pao de lo». */
const paraProcura = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Esgotados (`painel-balcao.md`): **esgotado hoje** tira as vagas de hoje e volta
 * sozinho amanhã; **tirar de venda** fica fora até alguém o voltar a pôr. Os
 * pedidos que já existem não são tocados. Os que estão fora aparecem primeiro.
 */
export function Esgotados({ produtos }: { produtos: ProdutoDoBalcao[] }) {
  const router = useRouter();
  const [procura, setProcura] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

  const mudar = (acao: () => Promise<{ ok: boolean; erro?: keyof typeof MENSAGENS }>) =>
    iniciar(async () => {
      setErro(null);
      const resultado = await acao();
      if (!resultado.ok && resultado.erro) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
    });

  const termo = paraProcura(procura.trim());
  const visiveis = produtos
    .filter((p) => termo === "" || paraProcura(p.nome).includes(termo))
    .sort((a, b) => Number(b.esgotadoHoje || b.foraDeVenda) - Number(a.esgotadoHoje || a.foraDeVenda));

  return (
    <section aria-label="Esgotados">
      <label className="block text-sm font-semibold" htmlFor="balcao-produto">
        Procurar produto
      </label>
      <input
        id="balcao-produto"
        value={procura}
        onChange={(e) => setProcura(e.target.value)}
        placeholder="Kit, bolo, croissant…"
        className="mt-2 w-full rounded-xl border border-tinta/20 bg-papel px-4 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      />
      {erro && <p className="mt-3 font-semibold text-tijolo">{erro}</p>}
      <ul className="mt-4 divide-y divide-tinta/10 rounded-2xl border border-tinta/15 bg-papel">
        {visiveis.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="mr-auto min-w-0">
              {p.nome}
              {p.esgotadoHoje && <span className="ml-2 text-xs font-semibold uppercase text-tijolo">esgotado hoje</span>}
              {p.foraDeVenda && <span className="ml-2 text-xs font-semibold uppercase text-tijolo">fora de venda</span>}
            </span>
            <button
              type="button"
              aria-pressed={p.esgotadoHoje}
              disabled={aEnviar}
              onClick={() => mudar(() => esgotarHoje(p.id, !p.esgotadoHoje))}
              className={`${BOTAO} ${p.esgotadoHoje ? "bg-tinta text-papel" : "border border-tinta/20"}`}
            >
              {p.esgotadoHoje ? "Já há" : "Esgotado hoje"}
            </button>
            <button
              type="button"
              aria-pressed={p.foraDeVenda}
              disabled={aEnviar}
              onClick={() => mudar(() => porForaDeVenda(p.id, !p.foraDeVenda))}
              className={`${BOTAO} ${p.foraDeVenda ? "bg-tinta text-papel" : "border border-tinta/20"}`}
            >
              {p.foraDeVenda ? "Voltar a pôr" : "Tirar de venda"}
            </button>
          </li>
        ))}
        {visiveis.length === 0 && <li className="px-4 py-6 text-tinta-suave">Nenhum produto com esse nome.</li>}
      </ul>
    </section>
  );
}
