"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { imprimirPeloPortatil } from "@/app/painel/acoes-talao";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import type { Fundo, Linha } from "@/lib/talao";
import {
  emEposPrint,
  enderecoDoServico,
  envelopeSoap,
  lerResposta,
  type ModoCarateres,
  type RespostaImpressora,
} from "@/lib/talao-epos";
import { linhasDeTeste, type Teste } from "@/lib/talao-exemplo";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "./balcao/comum";

/**
 * # O teste da impressora, na visita à loja
 *
 * Duas formas de mandar o mesmo talão, porque ainda não se sabe qual vai ser
 * a da loja (`impressao.md`):
 *
 * - **pelo browser**: este aparelho fala direto com o IP da impressora. É
 *   como o tablet imprime se a loja tiver a TM-m30II base. Precisa de a página
 *   estar em `http://` — numa página `https://` o browser bloqueia o pedido.
 * - **pelo portátil**: o servidor do portátil manda-o (`acoes-talao.ts`). Não
 *   depende do browser, e serve para o teste do fundo preto se o primeiro
 *   falhar.
 *
 * O registo do fundo guarda cada tentativa, para se escrever no `impressao.md`
 * o que resultou e o que não.
 */

const CHAVE_IP = "damira-talao-ip";

const NOMES_TESTE: Record<Teste, string> = {
  hoje: "Pedido para hoje",
  "amanha-com-sinal": "Amanhã, com sinal",
  cancelamento: "Cancelamento",
  carateres: "Acentos e €",
};

const NOMES_FUNDO: Record<Fundo, string> = { bloco: "Só o bloco «HOJE»", inteiro: "Talão inteiro a preto" };
const NOMES_MODO: Record<ModoCarateres, string> = { texto: "Texto (normal)", cp858: "Bytes PC858" };

/** O que cada código quer dizer, em português de balcão. */
const ERROS: Record<string, string> = {
  EPTR_COVER_OPEN: "A tampa da impressora está aberta.",
  EPTR_REC_EMPTY: "A impressora está sem papel.",
  EX_TIMEOUT: "A impressora não respondeu a tempo.",
  DeviceNotFound: "A impressora diz que não encontra o dispositivo «local_printer».",
  SchemaError: "A impressora não percebeu o talão (SchemaError). Copiar o XML abaixo e guardá-lo.",
  "sem-permissao": "A sessão do painel acabou. Voltar a entrar em /painel.",
  "na-vercel": "Pelo portátil só funciona com o site a correr no portátil, não no site publicado.",
  "ip-invalido": "O IP não é da rede da loja (tem de começar por 192.168., 10. ou 172.16–31.).",
  "dados-invalidos": "A escolha do talão não é válida. Recarregar a página.",
  "sem-ligacao":
    "Não chegou à impressora. Confirmar o IP, que o portátil está no WiFi da loja, e que a impressora está ligada.",
  "sem-ligacao-browser":
    "Não chegou à impressora. Confirmar o IP, que este aparelho está no WiFi da loja, que a página está em http:// e que o ePOS-Print está ligado na configuração da impressora. Se estiver tudo certo, a impressora pode estar a recusar pedidos do browser: experimentar «pelo portátil».",
};

type Tentativa = {
  hora: string;
  teste: Teste;
  fundo: Fundo;
  modo: ModoCarateres;
  caminho: "browser" | "portátil";
  resultado: string;
  ok: boolean;
};

const descrever = (r: RespostaImpressora | { ok: false; codigo: string; estado: string | null; detalhe?: string }) =>
  r.ok ? "Impresso ✓" : `${ERROS[r.codigo] ?? `Erro ${r.codigo}`}${r.estado ? ` (estado ${r.estado})` : ""}`;

export function TesteTalao({ agoraIso }: { agoraIso: string }) {
  const agora = useMemo(() => new Date(agoraIso), [agoraIso]);
  const [ip, setIp] = useState("");
  const [teste, setTeste] = useState<Teste>("hoje");
  const [fundo, setFundo] = useState<Fundo>("bloco");
  const [modo, setModo] = useState<ModoCarateres>("texto");
  const [registo, setRegisto] = useState<Tentativa[]>([]);
  const [emHttps, setEmHttps] = useState(false);
  const [aEnviar, iniciar] = useTransition();

  useEffect(() => {
    /* Um quadro à frente, como o `ProvedorConta`: lido durante a renderização,
       o servidor e o browser davam marcação diferente. */
    const quadro = requestAnimationFrame(() => {
      try {
        setIp(localStorage.getItem(CHAVE_IP) ?? "");
      } catch {
        /* Sem armazenamento, escreve-se o IP outra vez. */
      }
      setEmHttps(location.protocol === "https:");
    });
    return () => cancelAnimationFrame(quadro);
  }, []);

  const mudarIp = (valor: string) => {
    setIp(valor);
    try {
      localStorage.setItem(CHAVE_IP, valor.trim());
    } catch {
      /* idem */
    }
  };

  const linhas = useMemo(() => linhasDeTeste(teste, fundo, agora), [teste, fundo, agora]);
  const xml = useMemo(() => emEposPrint(linhas, modo), [linhas, modo]);

  const anotar = (caminho: Tentativa["caminho"], resultado: string, ok: boolean) =>
    setRegisto((r) => [{ hora: horaDeLisboa(new Date()), teste, fundo, modo, caminho, resultado, ok }, ...r]);

  const pelasDuasVias = {
    browser: () =>
      iniciar(async () => {
        /* O talão monta-se outra vez com a hora de agora: é o «Impresso às» que sai no papel. */
        const documento = envelopeSoap(emEposPrint(linhasDeTeste(teste, fundo, new Date()), modo));
        try {
          const resposta = await fetch(enderecoDoServico(ip.trim()), {
            method: "POST",
            /* Os mesmos cabeçalhos que o `epos-print.js` da Epson manda. */
            headers: {
              "Content-Type": "text/xml; charset=utf-8",
              "If-Modified-Since": "Thu, 01 Jan 1970 00:00:00 GMT",
              SOAPAction: '""',
            },
            body: documento,
            signal: AbortSignal.timeout(15_000),
          });
          const lida = lerResposta(await resposta.text());
          anotar("browser", descrever(lida), lida.ok);
        } catch {
          anotar("browser", ERROS["sem-ligacao-browser"], false);
        }
      }),
    portatil: () =>
      iniciar(async () => {
        const lida = await imprimirPeloPortatil(ip, teste, fundo, modo);
        anotar("portátil", descrever(lida), lida.ok);
      }),
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-tijolo">Painel · teste</p>
      <h1 className="titulo-display mt-2 text-4xl">Teste da impressora</h1>
      <p className="mt-3 text-tinta-suave">
        Imprime talões de exemplo, com dados inventados, para ver na impressora verdadeira como sai o fundo preto e
        se os acentos e o «€» aparecem. Nada daqui é um pedido a sério.
      </p>

      {emHttps && (
        <p className="mt-6 rounded-lg border border-tijolo/40 bg-tijolo/10 p-4 text-sm">
          ⚠ Esta página está em <strong>https://</strong>, e o browser não deixa uma página segura falar com a
          impressora em http://. Abrir a página a partir do portátil, em http:// (ver <code>impressao.md</code>).
        </p>
      )}

      <section className="mt-8 grid gap-6">
        <label className="grid gap-2">
          <span className="font-semibold">IP da impressora</span>
          <input
            value={ip}
            onChange={(e) => mudarIp(e.target.value)}
            inputMode="decimal"
            placeholder="192.168.1.50"
            className="min-h-12 rounded-lg border border-tinta/20 bg-papel px-4 font-mono"
          />
          <span className="text-sm text-tinta-suave">
            Sai na folha de estado da impressora (segurar o botão FEED ao ligá-la).{" "}
            {ip.trim() && (
              <a href={`http://${ip.trim()}/`} target="_blank" rel="noreferrer" className="underline">
                Abrir a configuração da impressora
              </a>
            )}
          </span>
        </label>

        <Escolha titulo="Talão" opcoes={NOMES_TESTE} valor={teste} mudar={setTeste} />
        <Escolha titulo="Fundo" opcoes={NOMES_FUNDO} valor={fundo} mudar={setFundo} />
        <Escolha titulo="Carateres" opcoes={NOMES_MODO} valor={modo} mudar={setModo} />

        <div className="flex flex-wrap gap-3">
          <button type="button" className={BOTAO_PRINCIPAL} disabled={!ip.trim() || aEnviar} onClick={pelasDuasVias.browser}>
            Imprimir pelo browser
          </button>
          <button type="button" className={BOTAO_SECUNDARIO} disabled={!ip.trim() || aEnviar} onClick={pelasDuasVias.portatil}>
            Imprimir pelo portátil
          </button>
          {aEnviar && <span className="self-center text-sm text-tinta-suave">A enviar…</span>}
        </div>
      </section>

      {registo.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">O que se tentou</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {registo.map((t, i) => (
              <li key={i} className={t.ok ? "text-tinta" : "text-tijolo"}>
                {t.hora} · {NOMES_TESTE[t.teste]} · {NOMES_FUNDO[t.fundo]} · {NOMES_MODO[t.modo]} · pelo {t.caminho} —{" "}
                {t.resultado}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-semibold">Como deve sair</h2>
        <p className="mt-1 text-sm text-tinta-suave">Aproximado: 48 colunas, como o papel de 80 mm.</p>
        <PreVisualizacao linhas={linhas} />
      </section>

      <details className="mt-8 text-sm">
        <summary className="cursor-pointer font-semibold">O XML que vai para a impressora</summary>
        <textarea readOnly value={xml} className="mt-2 h-48 w-full rounded-lg border border-tinta/20 bg-papel p-3 font-mono text-xs" />
      </details>
    </main>
  );
}

function Escolha<T extends string>({
  titulo,
  opcoes,
  valor,
  mudar,
}: {
  titulo: string;
  opcoes: Record<T, string>;
  valor: T;
  mudar: (v: T) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="font-semibold">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(opcoes) as T[]).map((chave) => (
          <button
            key={chave}
            type="button"
            aria-pressed={valor === chave}
            onClick={() => mudar(chave)}
            className={`min-h-11 rounded-full border px-4 text-sm ${
              valor === chave ? "border-tinta bg-tinta text-papel" : "border-tinta/20 bg-papel"
            }`}
          >
            {opcoes[chave]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** O talão no ecrã, em monoespaçado: a letra grande ocupa o dobro, como no papel. */
function PreVisualizacao({ linhas }: { linhas: Linha[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-tinta/15 bg-white p-4">
      <div className="w-max font-mono text-[11px] leading-[1.25] text-black">
        {linhas.map((l, i) => (
          <div
            key={i}
            className={`whitespace-pre ${l.grande ? "text-[22px]" : ""} ${l.negrito ? "font-bold" : ""} ${
              l.invertido ? "bg-black text-white" : ""
            }`}
          >
            {l.texto || " "}
          </div>
        ))}
      </div>
    </div>
  );
}
