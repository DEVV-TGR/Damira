"use client";

import { useMemo, useState, useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { TIPOS_PEDIDO } from "@/lib/pedidos";
import {
  cestoEmTexto,
  estimativa,
  pessoasSugeridas,
  tipoSugerido,
  type ItemCesto,
} from "@/lib/cesto";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";
import { enviarPedido, type Resultado } from "@/app/[locale]/encomendas/acoes";
import { useCesto } from "./CestoProvider";
import { useConta } from "@/components/conta/ProvedorConta";
import { Link } from "@/i18n/navigation";

/**
 * O pedido, em três passos.
 *
 * ## ⚠️ Continua a não ser um checkout de loja, e é essa a linha
 *
 * Não pede dados de pagamento, não reserva nada e não confirma disponibilidade,
 * porque a casa não pode cumprir nenhuma das três a partir daqui. O que mudou em
 * relação ao formulário de antes **não foi a promessa, foi o caminho**: antes
 * havia uma caixa de texto vazia e a pessoa escrevia de cabeça o que queria,
 * copiando nomes e preços de secções que já tinha rolado para longe. Agora
 * escolhe nos cartões e o pedido escreve-se sozinho.
 *
 * O botão do fim diz *enviar o pedido*. Não diz pagar, não diz finalizar, e não
 * diz confirmar — porque o que acontece a seguir é alguém ler e responder.
 *
 * ## Porque três passos e não um formulário corrido
 *
 * Porque as três perguntas são de naturezas diferentes e chegam em alturas
 * diferentes da cabeça de quem encomenda: *o que quero*, *para quando*, *quem
 * sou*. Um formulário com nove campos à vista lê-se como trabalho; três ecrãs de
 * dois ou três campos leem-se como uma conversa. É a mesma sequência que já
 * acontece ao telefone.
 *
 * ## ⚠️ E continua a funcionar sem JavaScript
 *
 * Esta é a parte que se parte com facilidade e não dá sinal. Sem hidratação:
 *
 * - **não há passos** — os três blocos aparecem empilhados, que é o formulário
 *   de sempre;
 * - **não há cesto** — o `localStorage` é do cliente, portanto a caixa de texto
 *   volta a chamar-se `detalhe` e a ser obrigatória, como era antes;
 * - **o `<form action={...}>` com a Server Action** é submetido pelo browser
 *   como um POST normal.
 *
 * É por isso que o campo de texto **muda de nome** conforme haja cesto ou não:
 * com cesto, o que vai no email é o resumo mais as notas, e o texto livre passa
 * a ser um extra chamado `notas`; sem cesto, ele **é** o pedido.
 */
const INICIAL: Resultado = { estado: "inicial" };

/* ⚠️ Uma constante e não `?? []` em linha. O literal criava um array novo em
   cada renderização, e o `useMemo` que depende dele voltava a correr sempre —
   memorização a fingir. */
const SEM_CESTO: ItemCesto[] = [];

export function FormularioPedido({ locale }: { locale: Locale }) {
  const t = useTranslations("encomendas.formulario");
  const tc = useTranslations("encomendas.cesto");
  const [resultado, agir, aPendente] = useActionState(enviarPedido, INICIAL);
  const id = useId();

  const tconta = useTranslations("conta");
  /* ⚠️ **A sessão chega depois da montagem**, porque é lida no cliente. Por isso
     o que ela dá entra pelas `key` dos campos e não só pelo `defaultValue`: sem
     isso, quem entra na conta e volta ao formulário encontra os campos vazios,
     que é justamente o trabalho que a conta vinha poupar. */
  const { ativa: contaAtiva, utilizador } = useConta();

  const contexto = useCesto();
  const cesto = contexto?.cesto ?? SEM_CESTO;
  const hidratado = contexto?.pronto ?? false;
  const comCesto = hidratado && cesto.length > 0;

  const [passo, setPasso] = useState(0);
  const [notas, setNotas] = useState("");
  /* `null` quer dizer «ainda não escolheu à mão», e nesse caso manda o cesto.
     ⚠️ Isto é um valor derivado e **não** um efeito a sincronizar estado: pôr o
     tipo num `useEffect` fazia o formulário renderizar uma vez com o tipo errado
     e corrigir-se a seguir, à vista de quem estivesse a olhar. */
  const [tipoManual, setTipoManual] = useState<string | null>(null);
  const tipo = tipoManual ?? tipoSugerido(cesto) ?? TIPOS_PEDIDO[0];

  const resumo = useMemo(
    () =>
      cestoEmTexto(cesto, locale, {
        semPreco: tc("semPreco"),
        estimativa: tc("estimativa"),
        aPartirDe: tc("aPartirDe"),
      }),
    [cesto, locale, tc],
  );

  if (resultado.estado === "enviado") {
    return (
      <div className="rounded-2xl border border-papel/25 p-8">
        <p className="titulo-display titulo-gama">{t("sucesso.titulo")}</p>
        <p className="mt-3 max-w-[46ch] text-papel/80">{t("sucesso.texto")}</p>
      </div>
    );
  }

  /* O caminho de quando não há serviço de email configurado. Não é uma avaria:
     é o pedido devolvido já escrito para a pessoa o mandar do seu correio. Ver
     `acoes.ts`. */
  if (resultado.estado === "sem-servico") {
    const href = `mailto:${resultado.destino}?subject=${encodeURIComponent(
      resultado.assunto,
    )}&body=${encodeURIComponent(resultado.corpo)}`;

    return (
      <div className="rounded-2xl border border-papel/25 p-8">
        <p className="titulo-display titulo-gama">{t("semServico.titulo")}</p>
        <p className="mt-3 max-w-[52ch] text-papel/80">
          {t("semServico.texto")}
        </p>
        <a
          href={href}
          className="premivel mt-6 inline-block rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          {t("semServico.abrir")}
        </a>
        {/* O pedido também aparece escrito, para quem usa correio no browser e
            não tem um cliente de email associado ao `mailto:` — que é muita
            gente, e para essa o botão acima não faz nada. */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-papel/70">
            {t("semServico.verTexto")}
          </summary>
          <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-papel/10 p-4 text-sm text-papel/85">
            {resultado.corpo}
          </pre>
        </details>
      </div>
    );
  }

  const erros = resultado.estado === "erro" ? resultado.campos : {};
  /* ⚠️ **Com erros, caem os passos.** O servidor devolve os erros de todos os
     campos de uma vez; escondê-los atrás de um passo que a pessoa já passou é
     mandá-la procurar. Aparece tudo, com as mensagens no sítio. */
  const emPassos = hidratado && Object.keys(erros).length === 0;
  const PASSOS = ["leva", "quando", "quem"] as const;
  const visivel = (n: number) => !emPassos || passo === n;
  const { soma, semPreco } = estimativa(cesto);

  return (
    <form action={agir} className="grid gap-6">
      {emPassos && (
        <ol className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-widest">
          {PASSOS.map((chave, n) => (
            <li
              key={chave}
              aria-current={passo === n ? "step" : undefined}
              className={
                passo === n
                  ? "text-papel"
                  : n < passo
                    ? "text-papel/70"
                    : "text-papel/40"
              }
            >
              <span className="tabular-nums">{n + 1}.</span>{" "}
              {tc(`passos.${chave}`)}
            </li>
          ))}
        </ol>
      )}

      {/* ── 1 · O que leva ─────────────────────────────────────────────── */}
      <div className={visivel(0) ? "grid gap-6" : "hidden"}>
        {comCesto ? (
          <div className="rounded-2xl border border-papel/25 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-papel/70">
              {tc("resumoTitulo")}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {cesto.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    <span className="tabular-nums">{item.quantidade}×</span>{" "}
                    {item.nome}
                    {item.variante && (
                      <span className="text-papel/60"> · {item.variante}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-papel/80">
                    {item.preco === null
                      ? tc("semPreco")
                      : formatarPreco(item.preco * item.quantidade, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between gap-4 border-t border-papel/20 pt-3 text-sm font-semibold">
              <span>{semPreco > 0 ? tc("aPartirDe") : tc("estimativa")}</span>
              <span className="tabular-nums">{formatarPreco(soma, locale)}</span>
            </p>
            {/* ⚠️ O aviso fica **colado ao número** e não no fundo da página: é
                aqui que alguém pode ler aquilo como uma conta a pagar. */}
            <p className="mt-2 text-sm text-papel/60">
              {semPreco > 0 ? tc("avisoOrcamento") : tc("avisoEstimativa")}
            </p>
          </div>
        ) : (
          hidratado && (
            <div className="rounded-2xl border border-dashed border-papel/25 p-5">
              <p className="font-semibold">{tc("vazio")}</p>
              <p className="mt-2 max-w-[46ch] text-sm text-papel/70">
                {tc("vazioTexto")}
              </p>
            </div>
          )
        )}

        {comCesto ? (
          /* ⚠️ **Com cesto, o tipo não se escolhe: lê-se.** A primeira versão
             pedia «que tipo de pedido é?» a quem tinha acabado de juntar um kit
             de festa e um bolo — e obrigava a escolher um dos dois. O cliente
             chamou-lhe incoerente, e é. Os tipos vêm do que está no cesto,
             mostram-se todos, e não se mexem aqui: quem quiser outro tipo muda
             o cesto, que é onde a escolha vive. O que vai para o servidor é o
             tipo que o cesto sugere (`outro` quando há mistura). */
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-papel/70">
              {t("campos.tipo")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...new Set(cesto.map((i) => i.tipo))].map((valor) => (
                <li
                  key={valor}
                  className="flex min-h-11 items-center rounded-full border border-tijolo bg-tijolo px-5 text-sm text-papel"
                >
                  {t(`tipos.${valor}`)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-papel/60">{tc("tipoDoCesto")}</p>
            <input type="hidden" name="tipo" value={tipo} />
          </div>
        ) : (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-widest text-papel/70">
              {t("campos.tipo")}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {TIPOS_PEDIDO.map((valor) => (
                <label
                  key={valor}
                  className={`premivel alvo-toque flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-sm ${
                    tipo === valor
                      ? "border-tijolo bg-tijolo text-papel"
                      : "border-papel/30 hover:bg-papel hover:text-tinta"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={valor}
                    checked={tipo === valor}
                    onChange={() => setTipoManual(valor)}
                    className="sr-only"
                  />
                  {t(`tipos.${valor}`)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label
            htmlFor={`${id}-detalhe`}
            className="text-xs font-semibold uppercase tracking-widest text-papel/70"
          >
            {comCesto ? tc("notas") : t("campos.detalhe")}
          </label>
          <textarea
            id={`${id}-detalhe`}
            /* ⚠️ **Muda de nome com o cesto**, e é isso que mantém o caminho sem
               JavaScript. Sem cesto isto **é** o pedido e chama-se `detalhe`;
               com cesto é um extra chamado `notas`, e o `detalhe` que vai para o
               servidor é o resumo mais estas linhas. */
            name={comCesto ? "notas" : "detalhe"}
            rows={comCesto ? 3 : 5}
            required={!comCesto}
            value={comCesto ? notas : undefined}
            onChange={comCesto ? (e) => setNotas(e.target.value) : undefined}
            aria-describedby={erros.detalhe ? `${id}-detalhe-erro` : undefined}
            aria-invalid={erros.detalhe ? true : undefined}
            placeholder={
              comCesto ? tc("notasDica") : t("campos.detalhePlaceholder")
            }
            className="mt-2 w-full rounded-xl border border-papel/25 bg-papel/5 px-4 py-3 text-papel placeholder:text-papel/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papel"
          />
          {erros.detalhe && <Erro id={`${id}-detalhe-erro`}>{erros.detalhe}</Erro>}
        </div>

        {comCesto && (
          <input
            type="hidden"
            name="detalhe"
            value={notas.trim() ? `${resumo}\n\n${notas.trim()}` : resumo}
          />
        )}
      </div>

      {/* ── 2 · Quando é ───────────────────────────────────────────────── */}
      <div className={visivel(1) ? "grid gap-6 sm:grid-cols-2" : "hidden"}>
        <Campo
          id={`${id}-data`}
          nome="data"
          tipo="date"
          rotulo={t("campos.data")}
          erro={erros.data}
          obrigatorio
        />
        {(tipo === "festa" || pessoasSugeridas(cesto) !== null) && (
          <Campo
            /* A `key` traz o número do cesto: `defaultValue` só vale à
               montagem, e sem isto escolher um escalão depois de o campo já
               existir não mudava nada. */
            key={`pessoas-${pessoasSugeridas(cesto) ?? "vazio"}`}
            id={`${id}-pessoas`}
            nome="pessoas"
            tipo="number"
            rotulo={t("campos.pessoas")}
            erro={erros.pessoas}
            valorInicial={pessoasSugeridas(cesto)?.toString()}
          />
        )}
      </div>

      {/* ── 3 · Quem é ─────────────────────────────────────────────────── */}
      <div className={visivel(2) ? "grid gap-6 sm:grid-cols-2" : "hidden"}>
        {/* ⚠️ **O convite a entrar fica no passo «quem é» e em mais lado
            nenhum.** É o único momento em que ter conta poupa alguma coisa a
            quem está a encomendar; no topo da página seria um balcão à frente da
            porta. E some assim que a pessoa entra. */}
        {contaAtiva && !utilizador && (
          <p className="text-sm text-papel/70 sm:col-span-2">
            {tconta("preencherDica")}{" "}
            <Link
              href={{ pathname: "/entrar", query: { voltar: "/encomendas" } }}
              className="font-semibold underline underline-offset-4"
            >
              {tconta("preencherLigacao")}
            </Link>
          </p>
        )}

        <Campo
          key={`nome-${utilizador?.nome ?? "vazio"}`}
          id={`${id}-nome`}
          nome="nome"
          rotulo={t("campos.nome")}
          erro={erros.nome}
          autoComplete="name"
          valorInicial={utilizador?.nome ?? undefined}
          obrigatorio
        />
        <Campo
          id={`${id}-telefone`}
          nome="telefone"
          tipo="tel"
          rotulo={t("campos.telefone")}
          erro={erros.telefone}
          autoComplete="tel"
        />
        <Campo
          key={`email-${utilizador?.email ?? "vazio"}`}
          id={`${id}-email`}
          nome="email"
          tipo="email"
          rotulo={t("campos.email")}
          erro={erros.email}
          autoComplete="email"
          valorInicial={utilizador?.email ?? undefined}
          ajuda={t("campos.umDosDois")}
        />

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-papel/80">
            <input
              type="checkbox"
              name="consentimento"
              value="sim"
              required
              className="mt-1 size-5 shrink-0 accent-tijolo"
            />
            <span>{t("campos.consentimento")}</span>
          </label>
          {erros.consentimento && <Erro>{erros.consentimento}</Erro>}
        </div>
      </div>

      {/* A armadilha. `aria-hidden` mais `tabIndex={-1}` mais fora do ecrã: quem
          usa leitor ou teclado nunca lhe chega, um robô de preenchimento
          automático enche-a. ⚠️ **Não usar `display: none`** — há robôs que
          ignoram campos escondidos assim, e este tem de parecer real. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-armadilha`}>{t("campos.armadilha")}</label>
        <input id={`${id}-armadilha`} name="armadilha" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {emPassos && passo > 0 && (
          <button
            type="button"
            onClick={() => setPasso((n) => n - 1)}
            className="premivel alvo-toque min-h-12 rounded-full border border-papel/35 px-6 text-sm font-semibold uppercase tracking-widest"
          >
            {tc("anterior")}
          </button>
        )}

        {emPassos && passo < PASSOS.length - 1 ? (
          <button
            type="button"
            onClick={() => setPasso((n) => n + 1)}
            className="premivel alvo-toque min-h-12 rounded-full bg-papel px-7 text-sm font-semibold uppercase tracking-widest text-tinta"
          >
            {tc("seguinte")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={aPendente}
            className="premivel alvo-toque min-h-12 rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
          >
            {aPendente ? t("aEnviar") : t("enviar")}
          </button>
        )}
      </div>

      <p className="max-w-[46ch] text-sm text-papel/60">{t("nota")}</p>
    </form>
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
  valorInicial,
}: {
  id: string;
  nome: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  tipo?: string;
  obrigatorio?: boolean;
  autoComplete?: string;
  valorInicial?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-widest text-papel/70"
      >
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        type={tipo}
        required={obrigatorio}
        defaultValue={valorInicial}
        autoComplete={autoComplete}
        aria-describedby={erro ? `${id}-erro` : undefined}
        aria-invalid={erro ? true : undefined}
        className="mt-2 w-full rounded-xl border border-papel/25 bg-papel/5 px-4 py-3 text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papel"
      />
      {ajuda && !erro && <p className="mt-1.5 text-sm text-papel/55">{ajuda}</p>}
      {erro && <Erro id={`${id}-erro`}>{erro}</Erro>}
    </div>
  );
}

/**
 * O erro de um campo.
 *
 * `role="alert"` para o leitor de ecrã anunciar a mensagem quando ela aparece —
 * sem isso, quem não vê o formulário submete, nada acontece visivelmente, e não
 * há forma de saber que há um campo por corrigir.
 */
function Erro({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-papel">
      {children}
    </p>
  );
}
