"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { horasParaMudar, linkDaProposta, responder } from "@/app/painel/acoes-gestao";
import type { Pedido } from "@/lib/dados/tipos";
import { aplicarDesconto } from "@/lib/desconto";
import { diaDeLisboa, diaPorExtenso, paraCent } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS } from "../balcao/comum";

/**
 * # Responder a um pedido que espera pela casa (`pedidos.md` › Confirmar e › O aceite do cliente)
 *
 * Sem nada novo, é o «sim»: confirma. Com o preço de uma linha sem preço, ou com outra hora, é uma
 * **proposta**: o cliente recebe-a e aceita-a por um link, e só então o pedido fica confirmado. A
 * gerente vê, antes de enviar, o que vai acontecer e o total novo — fixar dinheiro não se desfaz
 * em silêncio.
 *
 * Num pedido que já espera o aceite, responder outra vez revê a proposta: o link antigo deixa de
 * servir. E mostra o link, para o mandar à mão enquanto os emails não saem sozinhos (#119).
 */
export function Responder({ pedido, onFeito }: { pedido: Pedido; onFeito?: (pedido: Pedido) => void }) {
  const router = useRouter();
  const [aEnviar, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  /* Os preços em texto, por posição: o que a gerente escreve, como o lê («45» ou «45,50»). */
  const [precos, setPrecos] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      pedido.linhas.flatMap((linha, i) =>
        linha.precoDaProposta && linha.precoUnitarioCent !== null ? [[i, (linha.precoUnitarioCent / 100).toFixed(2).replace(".", ",")]] : [],
      ),
    ),
  );
  const [mudarHora, setMudarHora] = useState(false);
  const [dia, setDia] = useState(() => diaDeLisboa(pedido.levantamentoEm));
  const [horas, setHoras] = useState<{ inicio: string; hora: string; livre: boolean }[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!mudarHora) return;
    let vivo = true;
    void horasParaMudar(dia).then((h) => {
      if (vivo) {
        setHoras(h);
        setHora(null);
      }
    });
    return () => {
      vivo = false;
    };
  }, [dia, mudarHora]);

  const aguarda = pedido.estado === "a-aguardar-aceite";
  /* O prazo do cliente passou, mesmo que a limpeza ainda não o tenha gravado: o cliente já vê
     «Esta proposta expirou», e o painel diz o mesmo em vez de «à espera do cliente». */
  const [abertoEm] = useState(() => Date.now());
  const expirou = aguarda && pedido.expiraEm !== null && pedido.expiraEm.getTime() <= abertoEm;
  useEffect(() => {
    /* Fora da espera o link não aparece: o `aguarda && link` do fim já o esconde. */
    if (!aguarda) return;
    let vivo = true;
    void linkDaProposta(pedido.id).then((r) => vivo && setLink(r.ok ? r.valor : null));
    return () => {
      vivo = false;
    };
  }, [aguarda, pedido.id, pedido.propostaVersao]);

  /* Só as linhas sem preço, ou já fixadas numa proposta: o preço que o cliente viu não muda aqui. */
  const editaveis = pedido.linhas.flatMap((linha, posicao) =>
    linha.precoUnitarioCent === null || linha.precoDaProposta ? [{ linha, posicao }] : [],
  );
  const lidos = editaveis.map(({ linha, posicao }) => ({ linha, posicao, cent: paraCent(precos[posicao] ?? "") }));
  const mal = lidos.filter(({ posicao, cent }) => (precos[posicao] ?? "") !== "" && cent === null);
  const fixados = lidos.filter(({ linha, cent }) => cent !== null && cent !== linha.precoUnitarioCent);
  const faltam = lidos.filter(({ linha, cent }) => cent === null && linha.precoUnitarioCent === null);
  const subtotalNovo = pedido.linhas.reduce((soma, linha, i) => {
    const novo = fixados.find((f) => f.posicao === i);
    return soma + (novo ? Math.round(novo.cent! * linha.quantidade) : (linha.totalCent ?? 0));
  }, 0);
  /* Com o desconto com que o pedido nasceu, como o servidor o vai gravar (`planearResposta`): o
     valor do botão é o que o cliente paga. */
  const totalNovo = aplicarDesconto(subtotalNovo, pedido.descontoPercentagem).totalCent;
  const novaHora = mudarHora && hora !== null ? hora : null;
  const propoe = fixados.length > 0 || novaHora !== null;

  const enviar = () =>
    iniciar(async () => {
      setErro(null);
      const resultado = await responder(pedido.id, {
        precos: fixados.map(({ posicao, cent }) => ({ posicao, precoUnitarioCent: cent! })),
        levantamentoEm: novaHora,
      });
      if (!resultado.ok) {
        setErro(MENSAGENS[resultado.erro]);
        if (resultado.erro === "estado-mudou") router.refresh();
        return;
      }
      setMudarHora(false);
      onFeito?.(resultado.valor);
      router.refresh();
    });

  const bloqueado = aEnviar || mal.length > 0 || faltam.length > 0 || (aguarda && !propoe) || (mudarHora && hora === null);
  /* À espera do cliente, sem nada mudado, não há o que enviar: o botão diz o que falta, em vez de
     um «Confirmar» que não se pode carregar. */
  const rotulo = aEnviar
    ? "A enviar…"
    : propoe
      ? `${aguarda ? "Rever a proposta" : "Enviar a proposta"} · ${formatarCent(totalNovo, "pt")}${pedido.descontoPercentagem > 0 ? ` (com ${pedido.descontoPercentagem}% de desconto)` : ""}`
      : aguarda
        ? "Mude o preço ou a hora para rever"
        : "Confirmar o pedido";

  if (expirou) {
    return (
      <div className="rounded-2xl border border-tinta/15 bg-papel-fundo p-5">
        <h3 className="titulo-display text-xl">A proposta expirou</h3>
        <p className="mt-1 text-sm text-tinta-suave">
          O cliente não respondeu até {diaPorExtenso(pedido.expiraEm!)}, {horaDeLisboa(pedido.expiraEm!)}. O pedido não segue, a vaga
          fica livre, e o cliente recebe o email a dizê-lo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-tinta/15 bg-papel-fundo p-5">
      <h3 className="titulo-display text-xl">{aguarda ? "À espera do cliente" : "Responder ao pedido"}</h3>
      <p className="mt-1 text-sm text-tinta-suave">
        {aguarda
          ? "Já fez uma proposta. Pode revê-la: o cliente recebe a nova, e o link antigo deixa de servir."
          : "Sem nada novo, confirma. Com um preço ou outra hora, o cliente recebe uma proposta e tem de a aceitar."}
      </p>

      {editaveis.length > 0 && (
        <div className="mt-4 space-y-3">
          {lidos.map(({ linha, posicao, cent }) => (
            <label key={posicao} className="block text-sm font-semibold">
              {linha.quantidade}
              {linha.unidade === "kg" ? " kg" : ""} × {linha.nome}
              <span className="mt-1 flex items-center gap-2 font-normal">
                <input
                  inputMode="decimal"
                  value={precos[posicao] ?? ""}
                  onChange={(e) => setPrecos({ ...precos, [posicao]: e.target.value })}
                  placeholder="0,00"
                  aria-label={`Preço de ${linha.nome}, por ${linha.unidade === "kg" ? "quilo" : "unidade"}`}
                  className="w-32 rounded-xl border border-tinta/20 bg-papel px-3 py-3 text-right tabular-nums"
                />
                € / {linha.unidade === "kg" ? "kg" : "un"}
                {cent !== null && linha.quantidade !== 1 && (
                  <span className="text-tinta-suave">= {formatarCent(Math.round(cent * linha.quantidade), "pt")}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4">
        {!mudarHora ? (
          <button type="button" onClick={() => setMudarHora(true)} className={BOTAO_SECUNDARIO}>
            Propor outra hora
          </button>
        ) : (
          <div className="rounded-xl border border-tinta/15 bg-papel p-4">
            <p className="text-sm text-tinta-suave">
              Pedida: {diaPorExtenso(pedido.levantamentoAnteriorEm ?? pedido.levantamentoEm)},{" "}
              {horaDeLisboa(pedido.levantamentoAnteriorEm ?? pedido.levantamentoEm)}
            </p>
            <label className="mt-3 block text-sm font-semibold">
              Dia
              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="mt-1 block rounded-xl border border-tinta/20 bg-papel px-3 py-3"
              />
            </label>
            {horas === null ? (
              <p className="mt-3 text-tinta-suave">A ver as horas…</p>
            ) : horas.length === 0 ? (
              <p className="mt-3 text-tinta-suave">Neste dia a loja está fechada, ou as horas já passaram.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Hora">
                {horas.map((h) => (
                  <button
                    key={h.inicio}
                    type="button"
                    role="radio"
                    aria-checked={hora === h.inicio}
                    disabled={!h.livre}
                    onClick={() => setHora(h.inicio)}
                    className={`min-h-11 min-w-16 rounded-xl border px-3 tabular-nums ${
                      hora === h.inicio ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-papel"
                    } disabled:line-through disabled:opacity-40`}
                  >
                    {h.hora}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setMudarHora(false)} className={`${BOTAO_SECUNDARIO} mt-3`}>
              Manter a hora
            </button>
          </div>
        )}
      </div>

      {faltam.length > 0 && (
        <p className="mt-3 text-sm text-tinta-suave">Falta o preço de {faltam.map((f) => f.linha.nome).join(", ")}.</p>
      )}
      {mal.length > 0 && <p className="mt-3 text-sm font-semibold text-tijolo">Escreva o preço como 45 ou 45,50.</p>}

      <div className="mt-4">
        <button type="button" disabled={bloqueado} onClick={enviar} className={BOTAO_PRINCIPAL}>
          {rotulo}
        </button>
      </div>
      {erro && <p className="mt-2 font-semibold text-tijolo">{erro}</p>}

      {aguarda && pedido.expiraEm && (
        <p className="mt-3 text-sm">
          O cliente tem até <strong>{diaPorExtenso(pedido.expiraEm)}, {horaDeLisboa(pedido.expiraEm)}</strong> para aceitar. Depois, a
          proposta expira e a vaga fica livre.
        </p>
      )}
      {aguarda && link && (
        <div className="mt-5 border-t border-tinta/10 pt-4">
          <p className="text-sm font-semibold">Link para o cliente</p>
          <p className="text-sm text-tinta-suave">
            Até os emails saírem sozinhos, envie-o ao cliente por mensagem. Abrir não aceita nada: o cliente decide na página.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border border-tinta/20 bg-papel px-3 py-2 text-sm" />
            <button type="button" onClick={() => void navigator.clipboard?.writeText(link)} className={BOTAO_SECUNDARIO}>
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
