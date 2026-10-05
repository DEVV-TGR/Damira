"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { entrarComCodigo, entrarComPin, pedirCodigo } from "@/app/painel/acoes";
import type { ErroEntrada } from "@/lib/sessao-painel/tipos";

/**
 * A entrada no painel: o PIN da equipa e o código da gerente (`painel.md`).
 *
 * Pensada para o tablet do balcão: um teclado numérico com teclas grandes, que
 * envia sozinho ao sexto dígito, e nada que dependa de *hover*. Quem decide se
 * entra é o servidor (`src/lib/sessao-painel/`); isto só recolhe o que se
 * escreve e mostra a resposta.
 *
 * ⚠️ Ao entrar, volta a `/painel` limpo, e não só `refresh()`: a entrada da
 * gerente abre-se em `/painel?entrar=gerente`, e com o endereço a ficar assim
 * a página voltava a mostrar a entrada logo que a gerente saísse.
 */

const MENSAGENS: Record<ErroEntrada, string> = {
  "pin-errado": "PIN errado. Tente outra vez.",
  "codigo-errado": "Código errado ou fora de prazo. Peça outro.",
  bloqueado: "Demasiadas tentativas. Espere 15 minutos e tente outra vez.",
  indisponivel: "A entrada não está ligada neste momento.",
  "dados-invalidos": "Confira o que escreveu.",
};

const DIGITOS = 6;

type Props = {
  inicial: "equipa" | "gerente";
  lembrarPorDefeito: boolean;
  /** Há uma sessão de balcão por baixo: dá para voltar sem entrar como gerente. */
  podeVoltar: boolean;
};

export function EntradaPainel({ inicial, lembrarPorDefeito, podeVoltar }: Props) {
  const [modo, setModo] = useState(inicial);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-tijolo">Damira · Painel</p>
      <h1 className="titulo-display mt-2 text-4xl">Entrar</h1>

      <div role="tablist" aria-label="Quem entra" className="mt-8 grid grid-cols-2 rounded-full bg-tinta/5 p-1">
        {(["equipa", "gerente"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            role="tab"
            aria-selected={modo === opcao}
            onClick={() => setModo(opcao)}
            className={`min-h-12 rounded-full text-sm font-semibold uppercase tracking-widest ${
              modo === opcao ? "bg-tinta text-papel" : "text-tinta-suave"
            }`}
          >
            {opcao === "equipa" ? "Equipa" : "Gerente"}
          </button>
        ))}
      </div>

      {modo === "equipa" ? <EntradaPin /> : <EntradaGerente lembrarPorDefeito={lembrarPorDefeito} />}

      {podeVoltar && (
        <Link href="/painel" className="mt-10 text-center text-sm underline underline-offset-4">
          Voltar ao balcão
        </Link>
      )}
    </main>
  );
}

function EntradaPin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

  const enviar = (completo: string) =>
    iniciar(async () => {
      const resultado = await entrarComPin(completo);
      if (resultado.ok) return router.replace("/painel");
      setErro(MENSAGENS[resultado.erro]);
      /* O PIN errado sai: com o teclado à vista, recomeçar é mais rápido do que
         apagar seis dígitos um a um. */
      setPin("");
    });

  const tecla = (digito: string) => {
    if (aEnviar || pin.length >= DIGITOS) return;
    const novo = pin + digito;
    setErro(null);
    setPin(novo);
    if (novo.length === DIGITOS) enviar(novo);
  };

  return (
    <section className="mt-8" aria-label="PIN da equipa">
      <p className="text-center text-tinta-suave">O PIN da equipa, com seis números.</p>
      <div className="mt-5 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} de ${DIGITOS} números`}>
        {Array.from({ length: DIGITOS }, (_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full border-2 border-tinta ${i < pin.length ? "bg-tinta" : "bg-transparent"}`}
          />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-6 text-center font-semibold text-tijolo">
        {aEnviar ? <span className="text-tinta-suave">A entrar…</span> : erro}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Tecla key={d} onClick={() => tecla(d)} disabled={aEnviar}>
            {d}
          </Tecla>
        ))}
        <span aria-hidden />
        <Tecla onClick={() => tecla("0")} disabled={aEnviar}>
          0
        </Tecla>
        <Tecla onClick={() => setPin(pin.slice(0, -1))} disabled={aEnviar || pin.length === 0} rotulo="Apagar">
          ⌫
        </Tecla>
      </div>
    </section>
  );
}

function Tecla({
  children,
  onClick,
  disabled,
  rotulo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      className="premivel titulo-display min-h-16 rounded-2xl border border-tinta/15 bg-papel text-3xl tabular-nums disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EntradaGerente({ lembrarPorDefeito }: { lembrarPorDefeito: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [lembrar, setLembrar] = useState(lembrarPorDefeito);
  const [pedido, setPedido] = useState<{ codigoDeTeste?: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();

  const pedir = () =>
    iniciar(async () => {
      setErro(null);
      const resposta = await pedirCodigo(email);
      if (!resposta.ok) return setErro(MENSAGENS[resposta.erro]);
      setPedido({ codigoDeTeste: resposta.codigoDeTeste });
    });

  const entrar = () =>
    iniciar(async () => {
      setErro(null);
      const resultado = await entrarComCodigo(email, codigo, lembrar);
      if (resultado.ok) return router.replace("/painel");
      setErro(MENSAGENS[resultado.erro]);
    });

  const campo =
    "mt-2 w-full rounded-xl border border-tinta/20 bg-papel px-4 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";
  const botao =
    "premivel mt-5 flex min-h-14 w-full items-center justify-center rounded-full bg-tijolo px-8 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60";

  return (
    <section className="mt-8" aria-label="Entrada da gerente">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pedir();
        }}
      >
        <label className="block text-sm font-semibold" htmlFor="painel-email">
          Email
        </label>
        <input
          id="painel-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={campo}
        />
        {!pedido && (
          <button type="submit" disabled={aEnviar || email.trim() === ""} className={botao}>
            {aEnviar ? "A pedir…" : "Pedir código"}
          </button>
        )}
      </form>

      {pedido && (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          {/* A mesma frase com e sem acesso: o formulário não diz quem é gerente. */}
          <p className="text-tinta-suave">Se o email tiver acesso, enviámos um código. Vale 10 minutos.</p>
          {pedido.codigoDeTeste && (
            <p className="mt-3 rounded-xl bg-tinta/5 px-4 py-3 text-sm">
              Na entrada de teste o código aparece aqui, e não vai por email:{" "}
              <strong className="titulo-display select-all text-xl tracking-[0.12em]">{pedido.codigoDeTeste}</strong>
            </p>
          )}
          <label className="mt-5 block text-sm font-semibold" htmlFor="painel-codigo">
            Código
          </label>
          <input
            id="painel-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className={`${campo} titulo-display tracking-[0.3em]`}
          />
          <label className="mt-5 flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              className="size-5 accent-tijolo"
            />
            <span>Lembrar este dispositivo durante 30 dias</span>
          </label>
          {!lembrarPorDefeito && (
            <p className="mt-1 text-sm text-tinta-suave">
              Este tablet é do balcão: sem «lembrar», a gestão fecha com o browser.
            </p>
          )}
          <button type="submit" disabled={aEnviar || codigo.length !== 6} className={botao}>
            {aEnviar ? "A entrar…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPedido(null);
              setCodigo("");
            }}
            className="mt-3 min-h-12 w-full text-sm underline underline-offset-4"
          >
            Pedir outro código
          </button>
        </form>
      )}

      <p role="alert" className="mt-4 min-h-6 font-semibold text-tijolo">
        {erro}
      </p>
    </section>
  );
}
