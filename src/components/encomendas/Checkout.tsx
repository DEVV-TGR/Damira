"use client";

import { startTransition, useActionState, useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cotarPedido } from "@/app/[locale]/encomendas/pedido/cotacao";
import { enviarCompra, type Resultado } from "@/app/[locale]/encomendas/pedido/acoes";
import { consultarVagas } from "@/app/[locale]/encomendas/vagas";
import { useConta } from "@/components/conta/ProvedorConta";
import { linhasDoCesto, quantidadeEmTexto, totalDaLinha, type ItemCesto } from "@/lib/cesto";
import type { ResultadoCotacao } from "@/lib/dados/tipos";
import { itensGuardados } from "@/lib/historico";
import { formatarCent } from "@/lib/preco";
import type { ResultadoVagas, VagaDoCalendario } from "@/lib/vagas-servidor";
import { CalendarioLevantamento } from "./CalendarioLevantamento";
import { useCesto } from "./CestoProvider";
import { useHistorico } from "./ProvedorHistorico";

/**
 * # A página de compra
 *
 * O fim do caminho do cesto: **o que leva, quando se levanta, quem é**, e enviar.
 * Substitui o formulário que vivia no fundo da página das encomendas (#37).
 *
 * Três coisas que o servidor decide e o browser só mostra:
 *
 * - **o preço** — o total ao lado é o do servidor (`cotarPedido`), comparado
 *   linha a linha com o que o cesto guardou: se mudou, diz-se antes de enviar;
 * - **as vagas** — o calendário pede-as ao servidor (`consultarVagas`) sempre
 *   que o cesto muda, e nunca vão para cache;
 * - **o pedido** — `enviarCompra` refaz o cesto, confirma a hora e escreve o
 *   email. Até ao Stripe (#38) o pedido acaba num email; com ele, o botão passa
 *   a «Pagar».
 *
 * ⚠️ **Um erro nunca esvazia o cesto nem apaga o que se escreveu**
 * (`robustez.md` › Erros): os campos guardam o que a pessoa escreveu entre
 * tentativas, e o cesto só se esvazia quando o pedido foi mesmo enviado.
 */

const INICIAL: Resultado = { estado: "inicial" };
const SEM_CESTO: ItemCesto[] = [];

/** Pede ao servidor, de novo, sempre que a chave muda; esquece a resposta antiga. */
function useDoServidor<T>(chave: string, ativo: boolean, pedir: (linhas: unknown) => Promise<T>) {
  const [resposta, setResposta] = useState<{ chave: string; valor: T } | null>(null);
  useEffect(() => {
    if (!ativo) return;
    let actual = true;
    pedir(JSON.parse(chave)).then((valor) => {
      if (actual) setResposta({ chave, valor });
    });
    return () => {
      actual = false;
    };
  }, [chave, ativo, pedir]);
  return resposta?.chave === chave ? resposta.valor : null;
}

export function Checkout({ locale, telefone }: { locale: Locale; telefone: string | null }) {
  const t = useTranslations("encomendas.compra");
  const tf = useTranslations("encomendas.formulario");
  const tc = useTranslations("encomendas.cesto");
  const tcal = useTranslations("encomendas.calendario");
  const id = useId();
  const contexto = useCesto();
  const historico = useHistorico();
  const { utilizador } = useConta();
  const [resultado, agir, aPendente] = useActionState(enviarCompra, INICIAL);

  const cesto = contexto?.cesto ?? SEM_CESTO;
  const pronto = contexto?.pronto ?? false;
  const comCesto = pronto && cesto.length > 0;
  const linhas = useMemo(() => JSON.stringify(linhasDoCesto(cesto)), [cesto]);

  const vagas = useDoServidor<ResultadoVagas>(linhas, comCesto, consultarVagas);
  const cotacao = useDoServidor<ResultadoCotacao>(linhas, comCesto, cotarPedido);
  const [escolhida, setEscolhida] = useState<VagaDoCalendario | null>(null);

  /* ⚠️ **Campos controlados, e o formulário não se reinicia sozinho.** No
     React 19 um `<form action>` limpa os campos depois de cada envio: com um
     erro do servidor (uma hora que entretanto encheu), a pessoa perdia o que
     tinha escrito — e a caixa da autorização ficava desmarcada mesmo com o
     estado a dizer o contrário. Por isso os valores vivem no estado e o envio
     é feito à mão (`onSubmit`, abaixo), sem o reinício. O nome e o email
     começam pelos da conta, se houver sessão, até a pessoa os mudar. */
  const [campos, setCampos] = useState<Record<string, string>>({});
  const valor = (nome: string, inicial = "") => campos[nome] ?? inicial;
  const mudar = (nome: string) => (evento: { target: { value: string } }) =>
    setCampos((antes) => ({ ...antes, [nome]: evento.target.value }));
  const [autorizado, setAutorizado] = useState(false);
  const escolhidaValida =
    escolhida && vagas?.ok && vagas.vagas.some((v) => v.inicio === escolhida.inicio && v.livre) ? escolhida : null;

  const registo = resultado.estado === "enviado" || resultado.estado === "sem-servico" ? resultado.registo : null;
  const enviado = resultado.estado === "enviado";
  /* O pedido entra no histórico deste browser assim que o servidor responde, e
     o cesto só se esvazia quando foi mesmo enviado: sem serviço de email, quem
     ainda tem de carregar em enviar no seu correio não pode ficar sem nada. */
  useEffect(() => {
    if (!registo || !historico?.pronto) return;
    historico.guardar({
      referencia: registo.referencia,
      quando: new Date().toISOString(),
      estado: enviado ? "enviado" : "por-enviar",
      tipo: registo.tipo,
      data: registo.data,
      pessoas: registo.pessoas,
      itens: itensGuardados(cesto),
      estimativaCent: registo.totalCent,
      semPreco: registo.semPreco,
    });
    if (enviado) contexto?.esvaziar();
  }, [registo, enviado, historico, cesto, contexto]);

  const erros = resultado.estado === "erro" ? resultado.campos : {};

  if (resultado.estado === "enviado" || resultado.estado === "sem-servico") {
    return <Enviado resultado={resultado} />;
  }

  if (!pronto) {
    return <div aria-busy className="h-96 animate-pulse rounded-2xl bg-tinta/5" />;
  }

  if (!comCesto) {
    return (
      <div className="rounded-2xl border border-tinta/15 p-8">
        <p className="titulo-display titulo-gama">{t("vazio")}</p>
        <p className="mt-3 max-w-[46ch] text-tinta-suave">{t("vazioTexto")}</p>
        <Link
          href="/encomendas"
          className="premivel mt-6 inline-flex min-h-12 items-center rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {t("irEncomendas")}
        </Link>
      </div>
    );
  }

  const cotadas = cotacao?.ok ? cotacao.cotacao.linhas : null;
  const totalCent = cotacao?.ok ? cotacao.cotacao.totalCent : null;
  const semPreco = cotacao?.ok ? cotacao.cotacao.semPreco : cesto.filter((i) => i.precoCent === null).length;

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        startTransition(() => agir(dados));
      }}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-14">
      {/* ── O resumo: primeiro no telemóvel, ao lado e colado no computador ── */}
      <aside className="rounded-2xl border border-tinta/15 p-5 lg:sticky lg:top-24 lg:order-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="titulo-display titulo-gama">{t("resumo")}</h2>
          <Link href="/encomendas" className="alvo-toque text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4">
            {t("alterar")}
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-tinta/10">
          {cesto.map((item, i) => {
            const cotada = cotadas?.[i];
            const agora = cotada ? cotada.precoUnitarioCent : item.precoCent;
            const mudou = cotada && item.precoCent !== null && cotada.precoUnitarioCent !== null && cotada.precoUnitarioCent !== item.precoCent;
            return (
              <li key={item.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0">
                    <span className="tabular-nums text-tinta-suave">{quantidadeEmTexto(item, locale)}</span>{" "}
                    <span className="font-semibold">{item.nome}</span>
                    {item.variante && <span className="text-tinta-suave"> · {item.variante}</span>}
                  </p>
                  <span className="shrink-0 tabular-nums">
                    {agora === null ? tc("semPreco") : formatarCent(totalDaLinha(agora, item.quantidade), locale)}
                  </span>
                </div>
                {item.notas && <p className="mt-1 whitespace-pre-line text-sm text-tinta-suave">{item.notas}</p>}
                {mudou && (
                  <p className="mt-1 text-sm font-semibold text-tijolo">
                    {t("precoMudou", {
                      antes: formatarCent(item.precoCent!, locale),
                      agora: formatarCent(cotada.precoUnitarioCent!, locale),
                    })}
                  </p>
                )}
                {agora === null && <p className="mt-1 text-sm text-tinta-suave">{t("sobOrcamento")}</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 flex items-baseline justify-between gap-4 border-t border-tinta/15 pt-4 font-semibold">
          <span>{semPreco > 0 ? tc("aPartirDe") : tc("estimativa")}</span>
          <span className="titulo-display text-2xl tabular-nums text-tijolo" aria-live="polite">
            {totalCent === null ? "…" : formatarCent(totalCent, locale)}
          </span>
        </p>
        <p className="mt-2 text-sm text-tinta-suave">{t("semPagamento")}</p>
        {erros.cesto && <Erro>{erros.cesto}</Erro>}
      </aside>

      <div className="grid gap-12 lg:order-1">
        {/* ── 1 · Quando levanta ───────────────────────────────────────── */}
        <section aria-labelledby={`${id}-quando`} className="grid gap-4">
          <h2 id={`${id}-quando`} className="titulo-display titulo-gama">
            <span className="text-tijolo">1</span> · {t("quando")}
          </h2>
          {/* O calendário quando há com que o fazer; a data quando não há — sem
              o horário da cozinha e os tempos, o site no ar não pode ficar sem
              forma de encomendar. */}
          {vagas === null ? (
            <p className="text-sm text-tinta-suave" aria-live="polite">
              {tcal("aCarregar")}
            </p>
          ) : vagas.ok ? (
            <div className="rounded-2xl border border-tinta/15">
              <CalendarioLevantamento
                vagas={vagas.vagas}
                escolhida={escolhidaValida?.inicio ?? null}
                aoEscolher={setEscolhida}
                locale={locale}
                telefone={telefone}
                comTitulo={false}
              />
              <input type="hidden" name="levantamento" value={escolhidaValida?.inicio ?? ""} />
              <input type="hidden" name="data" value={escolhidaValida?.data ?? ""} />
            </div>
          ) : (
            <Campo
              id={`${id}-data`}
              nome="data"
              tipo="date"
              rotulo={tf("campos.data")}
              obrigatorio
              valor={valor("data")}
              aoMudar={mudar("data")}
            />
          )}
          {erros.data && <Erro id={`${id}-data-erro`}>{erros.data}</Erro>}
        </section>

        {/* ── 2 · Os seus dados ────────────────────────────────────────── */}
        <section aria-labelledby={`${id}-dados`} className="grid gap-5">
          <h2 id={`${id}-dados`} className="titulo-display titulo-gama">
            <span className="text-tijolo">2</span> · {t("dados")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              id={`${id}-nome`}
              nome="nome"
              rotulo={tf("campos.nome")}
              erro={erros.nome}
              obrigatorio
              autoComplete="name"
              valor={valor("nome", utilizador?.nome ?? "")}
              aoMudar={mudar("nome")}
            />
            <Campo
              id={`${id}-email`}
              nome="email"
              tipo="email"
              rotulo={tf("campos.email")}
              erro={erros.email}
              obrigatorio
              autoComplete="email"
              valor={valor("email", utilizador?.email ?? "")}
              aoMudar={mudar("email")}
            />
            <Campo
              id={`${id}-telefone`}
              nome="telefone"
              tipo="tel"
              rotulo={tf("campos.telefone")}
              erro={erros.telefone}
              ajuda={t("telefoneAjuda")}
              obrigatorio
              autoComplete="tel"
              valor={valor("telefone")}
              aoMudar={mudar("telefone")}
            />
            <Campo
              id={`${id}-nif`}
              nome="nif"
              rotulo={t("nif")}
              erro={erros.nif}
              ajuda={t("nifAjuda")}
              inputMode="numeric"
              valor={valor("nif")}
              aoMudar={mudar("nif")}
            />
          </div>
          <div>
            <label htmlFor={`${id}-observacoes`} className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {t("observacoes")}
            </label>
            <textarea
              id={`${id}-observacoes`}
              name="observacoes"
              rows={3}
              maxLength={1000}
              placeholder={t("observacoesDica")}
              value={valor("observacoes")}
              onChange={mudar("observacoes")}
              className="mt-2 w-full rounded-xl border border-tinta/20 bg-papel px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consentimento"
              value="sim"
              required
              checked={autorizado}
              onChange={(evento) => setAutorizado(evento.target.checked)}
              aria-invalid={erros.consentimento ? true : undefined}
              className="mt-0.5 size-5 shrink-0 accent-tijolo"
            />
            <span>{tf("campos.consentimento")}</span>
          </label>
          {erros.consentimento && <Erro>{erros.consentimento}</Erro>}
        </section>

        {/* A armadilha: fora do ecrã, e não `display: none` — há robôs que
            ignoram campos escondidos assim, e este tem de parecer real. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${id}-armadilha`}>{tf("campos.armadilha")}</label>
          <input id={`${id}-armadilha`} name="armadilha" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="linhas" value={linhas} />

        <button
          type="submit"
          disabled={aPendente}
          className="premivel flex min-h-14 items-center justify-center rounded-full bg-tijolo px-8 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
        >
          {aPendente ? tf("aEnviar") : tf("enviar")}
        </button>
      </div>
    </form>
  );
}

/** Depois de enviar: a referência em grande, ou o pedido escrito para mandar à mão. */
function Enviado({ resultado }: { resultado: Extract<Resultado, { estado: "enviado" | "sem-servico" }> }) {
  const tf = useTranslations("encomendas.formulario");
  const referencia = resultado.registo?.referencia;

  return (
    <div className="max-w-[40rem] rounded-2xl border border-tinta/15 p-8">
      <p className="titulo-display titulo-gama">
        {resultado.estado === "enviado" ? tf("sucesso.titulo") : tf("semServico.titulo")}
      </p>
      <p className="mt-3 max-w-[52ch] text-tinta-suave">
        {resultado.estado === "enviado" ? tf("sucesso.texto") : tf("semServico.texto")}
      </p>
      {/* A referência é o que a pessoa pode precisar de dizer ao telefone: em
          grande, e a mesma que foi no assunto do email. */}
      {referencia && (
        <p className="mt-6 rounded-xl border border-tinta/15 px-5 py-4">
          <span className="block text-xs font-semibold uppercase tracking-widest text-tinta-suave">{tf("referencia")}</span>
          <span className="titulo-display mt-1 block select-all text-2xl tracking-[0.12em]">{referencia}</span>
        </p>
      )}
      {resultado.estado === "sem-servico" && (
        <>
          <a
            href={`mailto:${resultado.destino}?subject=${encodeURIComponent(resultado.assunto)}&body=${encodeURIComponent(resultado.corpo)}`}
            className="premivel mt-6 inline-block rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
          >
            {tf("semServico.abrir")}
          </a>
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-tinta-suave">{tf("semServico.verTexto")}</summary>
            <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-tinta/5 p-4 text-sm">
              {resultado.corpo}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

function Campo({
  id,
  nome,
  rotulo,
  erro,
  ajuda,
  tipo = "text",
  obrigatorio = false,
  autoComplete,
  valor,
  aoMudar,
  inputMode,
}: {
  id: string;
  nome: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  tipo?: string;
  obrigatorio?: boolean;
  autoComplete?: string;
  valor: string;
  aoMudar: (evento: { target: { value: string } }) => void;
  inputMode?: "numeric";
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        type={tipo}
        required={obrigatorio}
        value={valor}
        onChange={aoMudar}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        aria-invalid={erro ? true : undefined}
        className="mt-2 w-full rounded-xl border border-tinta/20 bg-papel px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
      />
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="mt-1.5 text-sm text-tinta-suave">
          {ajuda}
        </p>
      )}
      {erro && <Erro id={`${id}-erro`}>{erro}</Erro>}
    </div>
  );
}

/** `role="alert"`: o leitor de ecrã anuncia o erro quando ele aparece. */
function Erro({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-tijolo">
      {children}
    </p>
  );
}
