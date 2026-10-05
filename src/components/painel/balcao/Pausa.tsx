"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pausar } from "@/app/painel/acoes-balcao";
import type { OpcaoPausa } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { usePainel } from "../PainelAberto";
import { BOTAO_SECUNDARIO, MENSAGENS } from "./comum";

const OPCOES: { opcao: OpcaoPausa; rotulo: string }[] = [
  { opcao: "30min", rotulo: "30 min" },
  { opcao: "1h", rotulo: "1 h" },
  { opcao: "ate-amanha", rotulo: "Até amanhã" },
];

/**
 * Pausar a loja, para quando a cozinha está cheia (`painel-balcao.md`). Em
 * pausa não se criam pedidos e o site diz a que horas volta. O «agora» é o da
 * última resposta do servidor (`atualizadoEm`): a pausa acaba à vista sem
 * ninguém recarregar.
 */
export function Pausa({ pausaAte }: { pausaAte: Date | null }) {
  const router = useRouter();
  const { atualizadoEm } = usePainel();
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();
  const emPausa = pausaAte !== null && pausaAte.getTime() > atualizadoEm.getTime();

  const mudar = (opcao: OpcaoPausa | null) =>
    iniciar(async () => {
      setErro(null);
      const resultado = await pausar(opcao);
      if (!resultado.ok) return setErro(MENSAGENS[resultado.erro]);
      router.refresh();
    });

  if (emPausa) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-tinta bg-papel px-5 py-3">
        <p className="mr-auto font-semibold">Loja em pausa até {horaDeLisboa(pausaAte)} — o site não aceita pedidos.</p>
        <button type="button" onClick={() => mudar(null)} disabled={aEnviar} className={`${BOTAO_SECUNDARIO} bg-tinta text-papel`}>
          Retomar agora
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-tinta-suave">Pausar a loja:</span>
      {OPCOES.map(({ opcao, rotulo }) => (
        <button key={opcao} type="button" onClick={() => mudar(opcao)} disabled={aEnviar} className={BOTAO_SECUNDARIO}>
          {rotulo}
        </button>
      ))}
      {erro && <span className="text-sm font-semibold text-tijolo">{erro}</span>}
    </div>
  );
}
