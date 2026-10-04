"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { sair } from "@/app/painel/acoes";
import type { Papel } from "@/lib/dados/tipos";
import { horaDeLisboa, INTERVALO_POLLING_MS, semLigacao, textoSemLigacao } from "@/lib/painel-ligacao";

/**
 * # O painel aberto — e o que o mantém vivo o dia inteiro (`painel.md`)
 *
 * O tablet fica com isto aberto do abrir ao fechar da loja. Quatro coisas que
 * não se veem quando funcionam e que custam pedidos quando falham:
 *
 * 1. **Pergunta pela versão de 10 em 10 segundos**, e não pelos pedidos: a
 *    resposta vem da cache e a base de dados dorme. Só quando a versão muda é
 *    que a página volta a pedir as listas ao servidor (`router.refresh()`).
 * 2. **Sem ligação, diz-o** — em vermelho, no topo, com a hora.
 * 3. **Uma versão nova do site recarrega o painel**, no primeiro momento em que
 *    não houver nada a meio: as ações da versão antiga deixaram de existir.
 * 4. **O som tem de estar desbloqueado e o ecrã acordado.** O browser bloqueia
 *    o som até alguém tocar no ecrã, por isso, até lá, um aviso por cima de tudo.
 *
 * As vistas do balcão e da gerente entram aqui dentro (#44, #45), e usam o
 * `usePainel()`: `tocar()` para o som de um pedido novo, e `ocupado()` para o
 * painel não se recarregar a meio de um toque.
 */

type ContextoPainel = {
  /** Um bipe. Não toca enquanto o som não estiver desbloqueado. */
  tocar: () => void;
  /** Marca que há alguma coisa a meio; devolve a função que a liberta. */
  ocupado: () => () => void;
  /** A última resposta boa do servidor, para os vazios dizerem «atualizado às 10:42». */
  atualizadoEm: Date;
};

const Contexto = createContext<ContextoPainel | null>(null);

export function usePainel(): ContextoPainel {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePainel fora do PainelAberto");
  return contexto;
}

type Props = { papel: Papel; versaoInicial: number; site: string };

export function PainelAberto({ papel, versaoInicial, site }: Props) {
  const ocupacoes = useRef(0);
  const ocupado = useCallback(() => {
    ocupacoes.current++;
    let libertado = false;
    return () => {
      if (!libertado) ocupacoes.current--;
      libertado = true;
    };
  }, []);

  const { atualizadoEm, ligado } = useVersao(versaoInicial, site, ocupacoes);
  const { somAtivo, ativarSom, tocar } = useSom();
  useEcraAcordado();

  const valor = useMemo(() => ({ tocar, ocupado, atualizadoEm }), [tocar, ocupado, atualizadoEm]);

  return (
    <Contexto.Provider value={valor}>
      {!ligado && (
        <div role="alert" className="sticky top-0 z-40 bg-tijolo px-4 py-3 text-center font-semibold text-papel">
          ⚠ {textoSemLigacao(atualizadoEm)}
        </div>
      )}
      <Cabecalho papel={papel} atualizadoEm={atualizadoEm} ligado={ligado} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <Separadores papel={papel} />
      </main>
      {!somAtivo && <AtivarSom onAtivar={ativarSom} />}
    </Contexto.Provider>
  );
}

// ——— A versão ———

function useVersao(versaoInicial: number, site: string, ocupacoes: React.RefObject<number>) {
  const router = useRouter();
  const versao = useRef(versaoInicial);
  const recarregar = useRef(false);
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date());
  const [ligado, setLigado] = useState(true);

  useEffect(() => {
    let ultimoSucesso = new Date();
    let vivo = true;

    const perguntar = async () => {
      try {
        const resposta = await fetch("/api/painel/versao", { cache: "no-store" });
        if (!resposta.ok) throw new Error(String(resposta.status));
        const dados: { versao: number; site: string } = await resposta.json();
        ultimoSucesso = new Date();
        if (!vivo) return;
        setAtualizadoEm(ultimoSucesso);
        if (dados.site !== site) recarregar.current = true;
        else if (dados.versao !== versao.current) {
          versao.current = dados.versao;
          router.refresh();
        }
      } catch {
        /* Uma volta falhada não é logo «sem ligação»: o `semLigacao` dá-lhe
           tolerância. A próxima volta tenta outra vez. */
      }
      if (!vivo) return;
      setLigado(!semLigacao(ultimoSucesso, new Date(), navigator.onLine));
      /* Uma versão nova do site, e nada a meio: recarrega. Com alguma coisa a
         meio, espera pela próxima volta. */
      if (recarregar.current && ocupacoes.current === 0) window.location.reload();
    };

    const intervalo = window.setInterval(perguntar, INTERVALO_POLLING_MS);
    /* Ao voltar a ficar visível (o tablet acordou, alguém mudou de aplicação),
       pergunta logo, sem esperar pela volta. */
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void perguntar();
    };
    const semRede = () => setLigado(false);
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    window.addEventListener("offline", semRede);
    return () => {
      vivo = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
      window.removeEventListener("offline", semRede);
    };
  }, [router, site, ocupacoes]);

  return { atualizadoEm, ligado };
}

// ——— O som ———

/* Fora do componente de propósito: sobrevive à troca de ecrã dentro do painel
   (entrar e sair como gerente monta o painel de novo), e assim quem já tocou
   para ativar o som não tem de voltar a tocar. Um recarregar a sério apaga-o —
   e aí o browser também volta a bloquear o som, por isso o aviso tem razão. */
let audioDoPainel: AudioContext | null = null;

function useSom() {
  const audio = useRef<AudioContext | null>(audioDoPainel);
  const [somAtivo, setSomAtivo] = useState(() => audioDoPainel?.state === "running");

  const bipe = useCallback((contexto: AudioContext) => {
    const oscilador = contexto.createOscillator();
    const volume = contexto.createGain();
    oscilador.frequency.value = 880;
    volume.gain.setValueAtTime(0.4, contexto.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.35);
    oscilador.connect(volume).connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.35);
  }, []);

  /* Tem de ser dentro do toque: é o toque que o browser aceita como licença para
     tocar som. O bipe confirma a quem tocou que o som está mesmo ligado. */
  const ativarSom = useCallback(async () => {
    audioDoPainel ??= new AudioContext();
    audio.current = audioDoPainel;
    await audio.current.resume();
    if (audio.current.state === "running") {
      bipe(audio.current);
      setSomAtivo(true);
    }
  }, [bipe]);

  const tocar = useCallback(() => {
    if (audio.current?.state === "running") bipe(audio.current);
  }, [bipe]);

  /* ⚠️ O browser volta a bloquear o som depois de a página ficar escondida ou
     de se recarregar — sem ninguém saber. Ao voltar, confirma-se. */
  useEffect(() => {
    const confirmar = () => {
      if (document.visibilityState === "visible") setSomAtivo(audio.current?.state === "running");
    };
    document.addEventListener("visibilitychange", confirmar);
    return () => document.removeEventListener("visibilitychange", confirmar);
  }, []);

  return { somAtivo, ativarSom, tocar };
}

function AtivarSom({ onAtivar }: { onAtivar: () => void }) {
  return (
    <button
      type="button"
      onClick={onAtivar}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-tinta/90 px-6 text-center text-papel"
    >
      <span aria-hidden className="text-6xl">
        🔔
      </span>
      <span className="titulo-display text-4xl">Toque para ativar o som</span>
      <span className="max-w-sm text-papel/90">
        Sem som, um pedido novo chega em silêncio. O browser só deixa tocar depois de alguém tocar no ecrã.
      </span>
    </button>
  );
}

// ——— O ecrã acordado ———

/* O browser larga o pedido quando se muda de aplicação, por isso volta a
   pedir-se sempre que a página fica visível. Sem Wake Lock (alguns tablets), não
   faz nada: desliga-se o bloqueio de ecrã nas definições (`painel-balcao.md`). */
function useEcraAcordado() {
  useEffect(() => {
    let tranca: WakeLockSentinel | null = null;
    const pedir = async () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      try {
        tranca = await navigator.wakeLock.request("screen");
      } catch {
        tranca = null;
      }
    };
    void pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      void tranca?.release();
    };
  }, []);
}

// ——— O cabeçalho ———

function Cabecalho({ papel, atualizadoEm, ligado }: { papel: Papel; atualizadoEm: Date; ligado: boolean }) {
  const router = useRouter();
  const [aSair, iniciar] = useTransition();
  /* «Esquecer» pede dois toques, sem a caixa de confirmação do browser: no
     tablet, um toque por engano deixava o balcão sem painel até alguém saber o PIN. */
  const [confirmar, setConfirmar] = useState(false);

  const sairDe = (ambito: "gerente" | "dispositivo") =>
    iniciar(async () => {
      await sair(ambito);
      /* Para `/painel` limpo: vindo da entrada da gerente, o endereço ainda
         trazia `?entrar=gerente`, e sair reabria a entrada em vez do balcão. */
      router.replace("/painel");
    });

  const botao =
    "min-h-12 rounded-full border border-papel/30 px-5 text-xs font-semibold uppercase tracking-widest disabled:opacity-60";

  return (
    <header className="bg-tinta text-papel">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
        <div className="mr-auto">
          <p className="titulo-display text-2xl">
            Damira <span className="text-papel/70">· {papel === "gerente" ? "Gerente" : "Balcão"}</span>
          </p>
          <p className="text-sm text-papel/80">
            {ligado ? `Ligado · atualizado às ${horaDeLisboa(atualizadoEm)}` : "Sem ligação"}
          </p>
        </div>
        {papel === "funcionario" ? (
          <Link href="/painel?entrar=gerente" className={`${botao} inline-flex items-center`}>
            Entrar como gerente
          </Link>
        ) : (
          <button type="button" onClick={() => sairDe("gerente")} disabled={aSair} className={botao}>
            Sair de gerente
          </button>
        )}
        <button
          type="button"
          onClick={() => (confirmar ? sairDe("dispositivo") : setConfirmar(true))}
          onBlur={() => setConfirmar(false)}
          disabled={aSair}
          className={`${botao} ${confirmar ? "border-tijolo bg-tijolo" : ""}`}
        >
          {confirmar ? "Tocar outra vez para esquecer" : "Esquecer este dispositivo"}
        </button>
      </div>
    </header>
  );
}

// ——— As vistas (#44, #45) ———

const SEPARADORES_BALCAO = ["Levantam hoje", "Produzir hoje", "Próximos", "Arquivo"];

function Separadores({ papel }: { papel: Papel }) {
  const { atualizadoEm } = usePainel();
  const separadores = papel === "gerente" ? [...SEPARADORES_BALCAO, "Gestão"] : SEPARADORES_BALCAO;
  const [ativo, setAtivo] = useState(separadores[0]);

  return (
    <>
      <nav aria-label="Vistas" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="flex min-w-max gap-2">
          {separadores.map((nome) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={ativo === nome}
              onClick={() => setAtivo(nome)}
              className={`min-h-12 rounded-full px-5 text-sm font-semibold uppercase tracking-widest ${
                ativo === nome ? "bg-tinta text-papel" : "border border-tinta/15 bg-papel"
              }`}
            >
              {nome}
            </button>
          ))}
        </div>
      </nav>
      <section role="tabpanel" aria-label={ativo} className="mt-6 rounded-2xl border border-tinta/15 bg-papel p-8">
        <h2 className="titulo-display text-2xl">{ativo}</h2>
        <p className="mt-2 text-tinta-suave">
          Esta vista está em construção: chega na próxima etapa do painel.
        </p>
        {/* ⚠️ Vazio leva sempre a hora: uma lista vazia sem hora não distingue um
            dia calmo de um tablet desligado (`robustez.md`). */}
        <p className="mt-4 text-sm text-tinta-suave">Atualizado às {horaDeLisboa(atualizadoEm)}</p>
      </section>
    </>
  );
}
