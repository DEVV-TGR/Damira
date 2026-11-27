"use client";

import { startTransition, useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cotarPedido } from "@/app/[locale]/encomendas/pedido/cotacao";
import { enviarCompra, type Resultado } from "@/app/[locale]/encomendas/pedido/acoes";
import { consultarVagas } from "@/app/[locale]/encomendas/vagas";
import { useConta } from "@/components/conta/ProvedorConta";
import { pausaDaLoja } from "@/app/[locale]/encomendas/pedido/pausa";
import { CampoTelefone } from "./CampoTelefone";
import { linhasDoCesto, quantidadeEmTexto, totalDaLinha, type ItemCesto } from "@/lib/cesto";
import type { ResultadoCotacao } from "@/lib/dados/tipos";
import { itensGuardados } from "@/lib/historico";
import { comDesconto, DESCONTO_PERCENTAGEM } from "@/lib/desconto";
import { formatarCent } from "@/lib/preco";
import type { ResultadoVagas, VagaDoCalendario } from "@/lib/vagas-servidor";
import { CalendarioLevantamento } from "./CalendarioLevantamento";
import { useCesto } from "./CestoProvider";
import { useHistorico } from "./ProvedorHistorico";
import { chaveDaCompra, concluirCompra } from "@/lib/chave-compra";
import { apagarTentativa, guardarTentativa, lerTentativa, podeEsvaziarCesto, type TentativaCompra } from "@/lib/tentativa-compra";
import { DetalhesDoBolo } from "./DetalhesDoBolo";

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
 * - **o pedido** — com BD, a fonte reserva a vaga e grava o pedido e os emails
 *   por enviar; sem ela mantém-se o percurso provisório por email.
 *
 * ⚠️ **Um erro nunca esvazia o cesto nem apaga o que se escreveu**
 * (`robustez.md` › Erros): os campos guardam o que a pessoa escreveu entre
 * tentativas, e o cesto só se esvazia quando o pedido foi mesmo enviado.
 */

const INICIAL: Resultado = { estado: "inicial" };
const SEM_CESTO: ItemCesto[] = [];

/** Pede ao servidor, de novo, sempre que a chave muda; esquece a resposta antiga. */
function useDoServidor<T>(chave: string, ativo: boolean, pedir: (linhas: unknown) => Promise<T>, revisao = 0) {
  const [resposta, setResposta] = useState<{ chave: string; revisao: number; valor: T } | null>(null);
  useEffect(() => {
    if (!ativo) return;
    let actual = true;
    pedir(JSON.parse(chave)).then((valor) => {
      if (actual) setResposta({ chave, revisao, valor });
    });
    return () => {
      actual = false;
    };
  }, [chave, ativo, pedir, revisao]);
  return resposta?.chave === chave && resposta.revisao === revisao ? resposta.valor : null;
}

export function Checkout({ locale, telefone, comBaseDeDados = false }: { locale: Locale; telefone: string | null; comBaseDeDados?: boolean }) {
  const t = useTranslations("encomendas.compra");
  const tf = useTranslations("encomendas.formulario");
  const td = useTranslations("desconto");
  const tc = useTranslations("encomendas.cesto");
  const tcal = useTranslations("encomendas.calendario");
  const id = useId();
  const contexto = useCesto();
  const caminho = usePathname();
  const historico = useHistorico();
  const { utilizador } = useConta();
  const tentativa = useRef<{ pessoa: string; chave: string } | null>(null);
  const [envioPendente, setEnvioPendente] = useState<TentativaCompra | null>(null);
  /* O envio em curso fica guardado logo no clique, mas o cartão de recuperação
     só aparece quando a resposta se perdeu (ou depois de recarregar): durante um
     envio normal a pessoa continua a ver o formulário, com o botão a enviar. */
  const [aRecuperar, setARecuperar] = useState(false);
  const [tentativaLida, setTentativaLida] = useState(false);
  const [revisaoVagas, setRevisaoVagas] = useState(0);
  const [resultado, agir, aPendente] = useActionState(async (anterior: Resultado, dados: FormData): Promise<Resultado> => {
    try {
      const resposta = await enviarCompra(anterior, dados);
      const final = resposta.estado === "enviado" || (resposta.estado === "erro" && !resposta.repetirEnvio);
      if (tentativa.current && final) {
        try {
          apagarTentativa(window.sessionStorage, tentativa.current.chave);
          if (resposta.estado !== "erro") concluirCompra(window.sessionStorage, tentativa.current.pessoa, tentativa.current.chave);
        } catch { /* O armazenamento pode estar bloqueado. */ }
        /* Um pedido concluído não empresta a chave ao seguinte: reutilizá-la
           devolvia este mesmo pedido em vez de criar o novo. */
        if (resposta.estado !== "erro") tentativa.current = null;
        if (resposta.estado === "erro") setEnvioPendente(null);
      }
      setARecuperar(!final && comBaseDeDados);
      if (resposta.estado === "erro" && resposta.campos.data) setRevisaoVagas((antes) => antes + 1);
      return resposta;
    } catch {
      // Uma resposta perdida preserva os campos e a chave para recuperar o mesmo pedido.
      if (comBaseDeDados) setARecuperar(true);
      return { estado: "erro", campos: { geral: tf("erros.falha-registo") }, repetirEnvio: true };
    }
  }, INICIAL);

  const cesto = contexto?.cesto ?? SEM_CESTO;
  const pronto = contexto?.pronto ?? false;
  const comCesto = pronto && cesto.length > 0;
  const linhas = useMemo(() => JSON.stringify(linhasDoCesto(cesto)), [cesto]);

  const vagas = useDoServidor<ResultadoVagas>(linhas, comCesto, consultarVagas, revisaoVagas);
  const cotacao = useDoServidor<ResultadoCotacao>(linhas, comCesto, cotarPedido);
  /* ⚠️ **Com BD, uma hora «pretendida» não se pode gravar.** Sem a cozinha ou sem
     o tempo de um produto, o calendário oferece as horas da loja a confirmar,
     mas o `criarPedido` recusa-as (`indisponivel`): a pessoa escolhia, enviava e
     ouvia sempre «essa hora já não está disponível». Diz-se logo que não se
     marca online, com o telefone, e o botão fica desligado. */
  const semHorasNaBd = comBaseDeDados && vagas?.ok === true && vagas.aConfirmar;
  const [escolhida, setEscolhida] = useState<VagaDoCalendario | null>(null);
  /* A loja em pausa (o balcão com a cozinha cheia): diz-se até quando, e o botão
     fica desligado. O servidor confirma outra vez ao enviar. */
  const [pausa, setPausa] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void pausaDaLoja(locale).then((quando) => {
      if (vivo) setPausa(quando);
    });
    return () => {
      vivo = false;
    };
  }, [locale]);

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
  useEffect(() => {
    if (!comBaseDeDados) return;
    // Como no usePorPessoa: ler armazenamento depois da primeira pintura evita diferenças na hidratação.
    const quadro = requestAnimationFrame(() => {
      try {
        const guardada = lerTentativa(window.sessionStorage);
        if (guardada) {
          tentativa.current = guardada;
          setEnvioPendente(guardada);
          setARecuperar(true);
          setCampos(guardada.dados);
          setAutorizado(guardada.dados.consentimento === "sim");
        }
      } catch { /* No modo privado a tentativa continua apenas em memória. */ }
      setTentativaLida(true);
    });
    return () => cancelAnimationFrame(quadro);
  }, [comBaseDeDados]);
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
      itens: itensGuardados(envioPendente?.itens ?? cesto),
      estimativaCent: registo.totalCent,
      semPreco: registo.semPreco,
    });
    if (enviado && (!envioPendente || podeEsvaziarCesto(envioPendente, cesto, utilizador?.id ?? "visitante"))) contexto?.esvaziar();
  }, [registo, enviado, historico, cesto, contexto, envioPendente, utilizador?.id]);

  const erros = resultado.estado === "erro" ? resultado.campos : {};

  if (resultado.estado === "enviado" || resultado.estado === "sem-servico") {
    return <Enviado resultado={resultado} />;
  }

  if (envioPendente && aRecuperar) {
    return (
      <div className="max-w-[40rem] rounded-2xl border border-tinta/15 p-8">
        <h2 className="titulo-display titulo-gama">{tf("recuperar.titulo")}</h2>
        <p className="mt-3 text-tinta-suave">{tf("recuperar.texto")}</p>
        {erros.geral && <Erro>{erros.geral}</Erro>}
        <button type="button" disabled={aPendente} className="premivel mt-6 min-h-14 rounded-full bg-tijolo px-7 text-sm font-semibold text-papel disabled:opacity-60" onClick={() => {
          const dados = new FormData();
          for (const [campo, valor] of Object.entries(envioPendente.dados)) dados.set(campo, valor);
          dados.set("chaveIdempotencia", envioPendente.chave);
          startTransition(() => agir(dados));
        }}>{aPendente ? tf("aEnviar") : tf("recuperar.botao")}</button>
      </div>
    );
  }

  if (!pronto || (comBaseDeDados && !tentativaLida)) {
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
  const desconto = totalCent !== null && totalCent > 0 ? comDesconto(totalCent) : null;
  const semPreco = cotacao?.ok ? cotacao.cotacao.semPreco : cesto.filter((i) => i.precoCent === null).length;

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        const pessoa = utilizador?.id ?? "visitante";
        let armazenamento: Storage | null = null;
        try { armazenamento = window.sessionStorage; } catch { /* Pode estar bloqueado. */ }
        const chave = chaveDaCompra(armazenamento, pessoa, tentativa.current?.pessoa === pessoa ? tentativa.current.chave : null);
        tentativa.current = { pessoa, chave };
        dados.set("chaveIdempotencia", chave);
        if (comBaseDeDados) {
          const pendente = { pessoa, chave, dados: Object.fromEntries(Array.from(dados.entries(), ([campo, valor]) => [campo, String(valor)])), itens: cesto };
          setEnvioPendente(pendente);
          guardarTentativa(armazenamento, pendente);
        }
        startTransition(() => agir(dados));
      }}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-14">
      {/* ── O resumo: primeiro no telemóvel, ao lado e colado no computador ── */}
      <aside className="min-w-0 rounded-2xl border border-tinta/15 p-5 lg:sticky lg:top-24 lg:order-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="titulo-display titulo-gama">{t("resumo")}</h2>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-controls="cartao-cesto"
            onClick={() => contexto?.definirCestoAbertoEm(caminho)}
            className="alvo-toque cursor-pointer text-left text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
          >
            {t("alterar")}
          </button>
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
                    {item.escolha && <span className="text-tinta-suave"> · {item.escolha}</span>}
                  </p>
                  <span className="shrink-0 tabular-nums">
                    {agora === null ? tc("semPreco") : formatarCent(totalDaLinha(agora, item.quantidade), locale)}
                  </span>
                </div>
                <DetalhesDoBolo item={item} />
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
        {/* O desconto de boas-vindas desconta-se do total que o servidor cotou.
            ⚠️ Só à vista, por agora: ver `src/lib/desconto.ts`. */}
        {desconto && (
          <div className="mt-2 grid gap-1 border-t border-tinta/15 pt-4 text-sm">
            <p className="flex items-baseline justify-between gap-4">
              <span>{td("subtotal")}</span>
              <span className="tabular-nums">{formatarCent(totalCent!, locale)}</span>
            </p>
            <p className="flex items-baseline justify-between gap-4 font-semibold text-tijolo">
              <span>{td("linha", { n: DESCONTO_PERCENTAGEM })}</span>
              <span className="tabular-nums">−{formatarCent(desconto.descontoCent, locale)}</span>
            </p>
          </div>
        )}
        <p className="mt-2 flex items-baseline justify-between gap-4 border-t border-tinta/15 pt-4 font-semibold">
          <span>{totalCent === 0 && semPreco > 0 ? tc("total") : semPreco > 0 ? tc("aPartirDe") : tc("estimativa")}</span>
          <span className="titulo-display text-2xl tabular-nums text-tijolo" aria-live="polite">
            {/* Só com artigos sob orçamento, «0,00 €» lia-se como um bolo de graça. */}
            {totalCent === null ? "…" : totalCent === 0 && semPreco > 0 ? tc("semPreco") : formatarCent(desconto ? desconto.totalCent : totalCent, locale)}
          </span>
        </p>
        {/* Com BD o pedido nasce confirmado (ou à espera da casa) e paga-se na
            loja; o «confirmamos consigo o valor e a hora» só vale para o email. */}
        <p className="mt-2 text-sm text-tinta-suave">{t(comBaseDeDados ? "semPagamentoBd" : "semPagamento")}</p>
        {erros.cesto && <Erro>{erros.cesto}</Erro>}
      </aside>

      <div className="grid min-w-0 gap-12 lg:order-1">
        {/* ── 1 · Quando levanta ───────────────────────────────────────── */}
        <section aria-labelledby={`${id}-quando`} className="grid gap-4">
          <h2 id={`${id}-quando`} className="titulo-display titulo-gama">
            <span className="text-tijolo">1</span> · {t("quando")}
          </h2>
          {/* ⚠️ **Sempre o calendário embutido, com dia e hora, e nunca a janela
              de data do browser.** Com o horário da cozinha e os tempos, as
              horas são as que a cozinha consegue, com a procura em cores; sem
              eles (a casa ainda não os deu e o modo de teste está desligado), são
              as horas em que a loja abre, como hora **pretendida**, e o
              calendário di-lo — confirma-se com a pessoa. */}
          {vagas === null ? (
            <p className="text-sm text-tinta-suave" aria-live="polite">
              {tcal("aCarregar")}
            </p>
          ) : semHorasNaBd ? (
            <p className="rounded-2xl bg-papel px-5 py-4 text-sm text-tinta">
              {t("semHorasBd")}{" "}
              {telefone && (
                <a href={`tel:${telefone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
                  {telefone}
                </a>
              )}
            </p>
          ) : vagas.ok ? (
            <div className="rounded-2xl border border-tinta/15">
              <CalendarioLevantamento
                vagas={vagas.vagas}
                aConfirmar={vagas.aConfirmar}
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
            <Erro>{tf("erros.cesto-invalido")}</Erro>
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
            <CampoTelefone
              id={`${id}-telefone`}
              rotulo={tf("campos.telefone")}
              rotuloPais={tf("campos.pais")}
              locale={locale}
              pais={valor("pais", "PT")}
              numero={valor("telefone")}
              erro={erros.telefone}
              ajuda={t("telefoneAjuda")}
              aoMudarPais={(pais) => setCampos((antes) => ({ ...antes, pais }))}
              aoMudarNumero={(telefone) => setCampos((antes) => ({ ...antes, telefone }))}
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

        {pausa && (
          <p role="status" className="rounded-xl border-2 border-tinta bg-papel px-4 py-3 font-semibold">
            {t("pausa", { quando: pausa })}
          </p>
        )}
        {erros.geral && <Erro>{erros.geral}</Erro>}
        <button
          type="submit"
          disabled={aPendente || pausa !== null || semHorasNaBd}
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
  /* Com o pedido guardado, o ecrã diz em que ficou, com as palavras da Andreia (24/11): confirmado
     logo, ou em análise. Sem ele (o pedido ainda acaba num email), diz só que foi enviado.
     ⚠️ Um envio repetido (a resposta perdeu-se) devolve o pedido como está agora: se a loja já o
     cancelou ou propôs outra hora, dizer «confirmada» seria mentir — diz que já estava registado. */
  const estadoPedido = resultado.estado === "enviado" ? resultado.estadoPedido : undefined;
  const chave = estadoPedido === "confirmado" ? "recebido.confirmado"
    : estadoPedido === "por-confirmar" ? "recebido.porConfirmar"
    : estadoPedido ? "recebido.existente" : null;

  return (
    <div className="max-w-[40rem] rounded-2xl border border-tinta/15 p-8">
      <p className="titulo-display titulo-gama">
        {chave ? tf(`${chave}.titulo`) : resultado.estado === "enviado" ? tf("sucesso.titulo") : tf("semServico.titulo")}
      </p>
      <p className="mt-3 max-w-[52ch] text-tinta-suave">
        {chave ? tf(`${chave}.texto`) : resultado.estado === "enviado" ? tf("sucesso.texto") : tf("semServico.texto")}
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
