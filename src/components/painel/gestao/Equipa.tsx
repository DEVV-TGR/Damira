"use client";

import { useEffect, useState, useTransition } from "react";
import { mudarPinDaEquipa, sessoesDaEquipa, terminarSessao } from "@/app/painel/acoes-gestao";
import type { SessaoListada } from "@/lib/sessao-painel/tipos";
import { diaPorExtenso } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { BOTAO, BOTAO_PRINCIPAL } from "../balcao/comum";

/**
 * Equipa e dispositivos (`painel.md`): a gerente vê quem tem sessão aberta e
 * termina qualquer uma, e muda o PIN da equipa — o que fecha as sessões da
 * equipa em todos os aparelhos. É assim que se tira o acesso a quem saiu.
 *
 * Com a entrada provisória só se veem as sessões deste aparelho e o PIN é
 * fixo: o ecrã di-lo, em vez de fingir.
 */

const MENSAGENS = {
  "sem-permissao": "Só a gerente pode fazer isto.",
  indisponivel: "Na entrada de teste o PIN é fixo. Mudá-lo chega com a entrada verdadeira.",
  "dados-invalidos": "O PIN tem 4 ou 6 números.",
  "nao-existe": "Essa sessão já tinha terminado.",
} as const;

export function Equipa() {
  const [sessoes, setSessoes] = useState<SessaoListada[] | null>(null);
  const [provisoria, setProvisoria] = useState(false);
  const [pin, setPin] = useState("");
  const [repetido, setRepetido] = useState("");
  const [aTerminar, setATerminar] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aEnviar, iniciar] = useTransition();

  const carregar = () =>
    void sessoesDaEquipa().then((r) => {
      if (r.ok) {
        setSessoes(r.valor);
        setProvisoria(r.provisoria);
      } else setMensagem({ ok: false, texto: MENSAGENS[r.erro] });
    });

  useEffect(() => {
    let vivo = true;
    void sessoesDaEquipa().then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setSessoes(r.valor);
        setProvisoria(r.provisoria);
      } else setMensagem({ ok: false, texto: MENSAGENS[r.erro] });
    });
    return () => {
      vivo = false;
    };
  }, []);

  const terminar = (s: SessaoListada) =>
    iniciar(async () => {
      const r = await terminarSessao(s.id);
      setATerminar(null);
      if (!r.ok) return setMensagem({ ok: false, texto: MENSAGENS[r.erro] });
      /* Terminar a própria sessão é sair: a página volta à entrada. */
      if (s.esta) return window.location.assign("/painel");
      setMensagem({ ok: true, texto: "Sessão terminada. Esse aparelho volta a pedir a entrada." });
      carregar();
    });

  const mudar = () =>
    iniciar(async () => {
      if (!/^(\d{4}|\d{6})$/.test(pin)) return setMensagem({ ok: false, texto: MENSAGENS["dados-invalidos"] });
      if (pin !== repetido) return setMensagem({ ok: false, texto: "Os dois PIN não são iguais." });
      const r = await mudarPinDaEquipa(pin);
      if (!r.ok) return setMensagem({ ok: false, texto: MENSAGENS[r.erro] });
      setPin("");
      setRepetido("");
      setMensagem({ ok: true, texto: "PIN mudado. Os aparelhos da equipa vão pedir o PIN novo." });
      carregar();
    });

  return (
    <section aria-label="Equipa" className="space-y-6">
      {provisoria && (
        <p className="rounded-xl bg-tinta/5 px-4 py-3 text-sm">
          Na entrada de teste só se veem as sessões deste aparelho, e o PIN é fixo. A lista de todos os aparelhos e a
          mudança do PIN chegam com a entrada verdadeira.
        </p>
      )}
      {mensagem && (
        <p role="status" className={`font-semibold ${mensagem.ok ? "" : "text-tijolo"}`}>
          {mensagem.texto}
        </p>
      )}

      <div className="rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5">
        <h3 className="titulo-display text-xl">Aparelhos com sessão</h3>
        {sessoes === null ? (
          <p className="mt-2 text-tinta-suave">A carregar…</p>
        ) : sessoes.length === 0 ? (
          <p className="mt-2 text-tinta-suave">Nenhuma sessão aberta.</p>
        ) : (
          <ul className="mt-3 divide-y divide-tinta/10">
            {sessoes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="mr-auto min-w-0">
                  <strong>{s.dispositivo}</strong> · {s.papel === "gerente" ? "Gerente" : "Equipa"}
                  {s.esta && <span className="ml-2 rounded-full bg-tinta/10 px-2 py-0.5 text-xs font-semibold">este aparelho</span>}
                  <span className="block text-sm text-tinta-suave">
                    Último uso: {diaPorExtenso(s.ultimoUso)}, {horaDeLisboa(s.ultimoUso)}
                  </span>
                </span>
                {aTerminar === s.id ? (
                  <button type="button" disabled={aEnviar} onClick={() => terminar(s)} className={`${BOTAO} bg-tijolo text-papel`}>
                    {s.esta ? "Terminar e sair" : "Terminar mesmo"}
                  </button>
                ) : (
                  <button type="button" onClick={() => setATerminar(s.id)} className={`${BOTAO} border border-tinta/20`}>
                    Terminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mudar();
        }}
        className="rounded-2xl border border-tinta/15 bg-papel p-4 sm:p-5"
      >
        <h3 className="titulo-display text-xl">Mudar o PIN da equipa</h3>
        <p className="mt-1 text-sm text-tinta-suave">
          Todos os aparelhos da equipa voltam a pedir o PIN. É assim que se tira o acesso a quem saiu da casa.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            PIN novo
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="mt-1 block w-full rounded-xl border border-tinta/20 bg-papel px-3 py-3 tracking-[0.3em]"
            />
          </label>
          <label className="text-sm font-semibold">
            Outra vez
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={repetido}
              onChange={(e) => setRepetido(e.target.value.replace(/\D/g, ""))}
              className="mt-1 block w-full rounded-xl border border-tinta/20 bg-papel px-3 py-3 tracking-[0.3em]"
            />
          </label>
        </div>
        <button type="submit" disabled={aEnviar} className={`${BOTAO_PRINCIPAL} mt-4`}>
          Mudar o PIN
        </button>
      </form>
    </section>
  );
}
