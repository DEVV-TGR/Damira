"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import type { Fornecedor } from "@/lib/conta";

/**
 * Os botões de entrar.
 *
 * ## ⚠️ Para onde se volta depois de entrar
 *
 * Lê-se do `?voltar=` **no momento do clique** e não com o `useSearchParams`. O
 * gancho obrigava a página a ter uma fronteira de `Suspense` à volta para
 * continuar a ser gerada no `build` — uma complicação inteira para ler um
 * parâmetro que só interessa quando alguém carrega no botão.
 *
 * E é validado: só se aceita um caminho que comece por uma barra e não por duas.
 * ⚠️ Sem isso, `?voltar=https://outro-sitio` fazia deste botão um **redireccionador
 * aberto** — alguém manda o link com o nome da Damira, a pessoa entra com o
 * Google, e sai noutro sítio qualquer a achar que ainda está aqui.
 */
const CAMINHO_SEGURO = /^\/(?!\/)/;

function paraOndeVoltar(): string {
  if (typeof window === "undefined") return "/encomendas";
  const pedido = new URLSearchParams(window.location.search).get("voltar");
  return pedido && CAMINHO_SEGURO.test(pedido) ? pedido : "/encomendas";
}

export function Entrada({ fornecedores }: { fornecedores: Fornecedor[] }) {
  const t = useTranslations("conta");
  /* Qual deles está a meio, para desligar os dois e mostrar em qual se carregou.
     Um botão que não reage durante os dois segundos da redirecção é um botão em
     que se carrega outra vez. */
  const [aEntrar, setAEntrar] = useState<Fornecedor | null>(null);

  return (
    <div className="grid gap-3">
      {fornecedores.map((fornecedor) => (
        <button
          key={fornecedor}
          type="button"
          disabled={aEntrar !== null}
          onClick={() => {
            setAEntrar(fornecedor);
            void signIn(fornecedor, { callbackUrl: paraOndeVoltar() });
          }}
          className="premivel alvo-toque flex min-h-14 items-center justify-center gap-3 rounded-full border-2 border-tinta px-6 font-semibold hover:bg-tinta hover:text-papel disabled:opacity-60"
        >
          {aEntrar === fornecedor
            ? t("aEntrar")
            : t(`entrarCom.${fornecedor}`)}
        </button>
      ))}
    </div>
  );
}
