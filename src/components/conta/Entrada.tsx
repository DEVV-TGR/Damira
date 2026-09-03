"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import type { Fornecedor, ModoConta } from "@/lib/conta";
import { useConta } from "./ProvedorConta";

/**
 * A entrada, nos dois modos.
 *
 * ## ⚠️ Para onde se volta depois de entrar
 *
 * Lê-se do `?voltar=` **no momento do clique** e não com o `useSearchParams`. O
 * gancho obrigava a página a ter uma fronteira de `Suspense` à volta para
 * continuar a ser gerada no `build` — uma complicação inteira para ler um
 * parâmetro que só interessa quando alguém carrega no botão.
 *
 * E é validado: só se aceita um caminho que comece por uma barra e não por duas.
 * ⚠️ Sem isso, `?voltar=https://outro-sitio` fazia deste botão um
 * **redireccionador aberto** — alguém manda o link com o nome da Damira, a
 * pessoa entra, e sai noutro sítio qualquer a achar que ainda está aqui.
 */
const CAMINHO_SEGURO = /^\/(?!\/)/;

function paraOndeVoltar(): string {
  if (typeof window === "undefined") return "/encomendas";
  const pedido = new URLSearchParams(window.location.search).get("voltar");
  return pedido && CAMINHO_SEGURO.test(pedido) ? pedido : "/encomendas";
}

export function Entrada({
  modo,
  fornecedores,
}: {
  modo: ModoConta;
  fornecedores: Fornecedor[];
}) {
  return modo === "fornecedores" ? (
    <ComFornecedores fornecedores={fornecedores} />
  ) : (
    <EmDemonstracao />
  );
}

function ComFornecedores({ fornecedores }: { fornecedores: Fornecedor[] }) {
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
          {aEntrar === fornecedor ? t("aEntrar") : t(`entrarCom.${fornecedor}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * Entrar ou criar conta, em demonstração.
 *
 * ## ⚠️ Um só botão para entrar **e** criar
 *
 * Não há registo separado porque não há nada para registar: escreve-se um nome e
 * um email e a conta passa a existir neste browser. É por isso que o botão diz
 * *entrar ou criar conta* — dois botões obrigavam a pessoa a escolher entre duas
 * coisas que fazem exactamente o mesmo.
 *
 * ## ⚠️ O aviso não é letra pequena
 *
 * Fica **por cima** dos campos, antes de alguém escrever seja o que for. Um ecrã
 * que pede um email e só depois explica que não autentica ninguém já recolheu o
 * email. Ver `conta.ts` para a razão de este modo existir.
 */
function EmDemonstracao() {
  const t = useTranslations("conta");
  const { entrarEmDemonstracao } = useConta();
  const router = useRouter();
  const id = useId();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const pronto = nome.trim().length >= 2 && email.includes("@");

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!pronto || !entrarEmDemonstracao) return;
        entrarEmDemonstracao(nome, email);
        router.push(paraOndeVoltar());
      }}
      className="grid gap-5"
    >
      <p className="rounded-xl border border-tijolo/30 bg-tijolo/5 px-5 py-4 text-sm">
        {t("demonstracao.aviso")}
      </p>

      <div>
        <label
          htmlFor={`${id}-nome`}
          className="text-xs font-semibold uppercase tracking-widest text-tinta-suave"
        >
          {t("nome")}
        </label>
        <input
          id={`${id}-nome`}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          required
          className="mt-2 w-full rounded-xl border border-tinta/25 bg-papel px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
        />
      </div>

      <div>
        <label
          htmlFor={`${id}-email`}
          className="text-xs font-semibold uppercase tracking-widest text-tinta-suave"
        >
          {t("email")}
        </label>
        <input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="mt-2 w-full rounded-xl border border-tinta/25 bg-papel px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
        />
      </div>

      <button
        type="submit"
        disabled={!pronto}
        className="premivel alvo-toque flex min-h-14 items-center justify-center rounded-full bg-tijolo px-6 font-semibold uppercase tracking-widest text-papel disabled:opacity-50"
      >
        {t("demonstracao.entrar")}
      </button>
    </form>
  );
}
