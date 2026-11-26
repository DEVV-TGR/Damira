"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { aceitar, recusar } from "@/app/[locale]/pedido/proposta/acoes";

/**
 * Os dois botões da proposta. Recusar pede uma segunda confirmação: cancela o pedido, e um toque
 * por engano no telemóvel não se desfaz. Depois de decidir, a página volta a ler o pedido no
 * servidor e mostra em que ficou — é o servidor que sabe, não o botão.
 */
export function DecisaoProposta({ referencia, credencial, telefone }: { referencia: string; credencial: string; telefone: string }) {
  const t = useTranslations("proposta");
  const router = useRouter();
  const [aPensar, comecar] = useTransition();
  const [aRecusar, setARecusar] = useState(false);
  const [acao, setAcao] = useState<"aceitar" | "recusar" | null>(null);
  const [erro, setErro] = useState(false);

  const decidir = (qual: "aceitar" | "recusar") => {
    setAcao(qual);
    setErro(false);
    comecar(async () => {
      const resultado = await (qual === "aceitar" ? aceitar : recusar)(referencia, credencial);
      /* Um «estado-mudou» não é um erro para quem clica: a página mostra o estado verdadeiro. Um
         link inválido ou uma falha do servidor mostram o aviso, com o telefone. */
      if (!resultado.ok && (resultado.erro === "link-invalido" || resultado.erro === "falhou")) setErro(true);
      router.refresh();
    });
  };

  return (
    <div className="mt-8">
      {erro && (
        <p role="alert" className="mb-4 rounded-xl border border-tijolo/40 px-4 py-3 text-sm text-tijolo">
          {t("erro", { telefone })}
        </p>
      )}
      {!aRecusar ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={aPensar}
            onClick={() => decidir("aceitar")}
            className="premivel flex min-h-14 items-center justify-center rounded-full bg-tijolo px-8 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
          >
            {aPensar && acao === "aceitar" ? t("aAceitar") : t("aceitar")}
          </button>
          <button
            type="button"
            disabled={aPensar}
            onClick={() => setARecusar(true)}
            className="premivel flex min-h-14 items-center justify-center rounded-full border border-tinta/25 px-8 text-sm font-semibold uppercase tracking-widest text-tinta disabled:opacity-60"
          >
            {t("recusar")}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-tinta/15 p-5">
          <p className="font-semibold">{t("recusarPergunta")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={aPensar}
              onClick={() => decidir("recusar")}
              className="premivel flex min-h-12 items-center justify-center rounded-full bg-tinta px-7 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
            >
              {aPensar && acao === "recusar" ? t("aRecusar") : t("recusarSim")}
            </button>
            <button
              type="button"
              disabled={aPensar}
              onClick={() => setARecusar(false)}
              className="premivel flex min-h-12 items-center justify-center rounded-full border border-tinta/25 px-7 text-sm font-semibold uppercase tracking-widest text-tinta disabled:opacity-60"
            >
              {t("voltar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
