"use client";

import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { TIPOS_PEDIDO } from "@/lib/pedidos";
import { enviarPedido, type Resultado } from "@/app/[locale]/encomendas/acoes";

/**
 * O formulário de pedido.
 *
 * ## O que este formulário promete, e o que não promete
 *
 * ⚠️ **Não é um checkout.** Não pede dados de pagamento, não mostra um total e
 * não confirma disponibilidade — porque a casa não pode cumprir nenhuma dessas
 * três coisas a partir daqui. Um bolo por medida não tem preço até haver
 * conversa, e um formulário que parecesse uma loja estava a mentir sobre o
 * negócio que tem por trás.
 *
 * O que promete é uma resposta: o pedido chega escrito, e alguém responde com o
 * orçamento. É o que o texto do botão diz, e é a única coisa que diz.
 *
 * ## Funciona sem JavaScript
 *
 * O `<form action={...}>` com uma Server Action é submetido pelo browser como um
 * POST normal enquanto o React não hidratar. É a razão de a validação viver no
 * servidor e de os erros virem no resultado da acção em vez de estado local:
 * **a versão sem JavaScript tem de dar os mesmos erros que a outra**, e a única
 * forma de garantir isso é haver um sítio só que os produz.
 *
 * O `useActionState` acrescenta o que o JavaScript pode acrescentar — o estado
 * de "a enviar" e a resposta sem recarregar a página — sem ser condição para
 * nada funcionar.
 */
const INICIAL: Resultado = { estado: "inicial" };

export function FormularioPedido() {
  const t = useTranslations("encomendas.formulario");
  const [resultado, agir, aPendente] = useActionState(enviarPedido, INICIAL);
  const id = useId();
  /* Só aparece quando o tipo é "festa": perguntar quantas pessoas a quem
     encomenda um bolo de aniversário é ruído, e um campo a mais é gente que
     desiste a meio. */
  const [tipo, setTipo] = useState<string>(TIPOS_PEDIDO[0]);

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

  return (
    <form action={agir} className="grid gap-6 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="text-xs font-semibold uppercase tracking-widest text-papel/70">
          {t("campos.tipo")}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIPOS_PEDIDO.map((valor) => (
            <label
              key={valor}
              className={`premivel cursor-pointer rounded-full border px-5 py-2.5 text-sm ${
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
                onChange={() => setTipo(valor)}
                className="sr-only"
              />
              {t(`tipos.${valor}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        id={`${id}-nome`}
        nome="nome"
        rotulo={t("campos.nome")}
        erro={erros.nome}
        autoComplete="name"
        obrigatorio
      />
      <Campo
        id={`${id}-data`}
        nome="data"
        tipo="date"
        rotulo={t("campos.data")}
        erro={erros.data}
        obrigatorio
      />
      <Campo
        id={`${id}-email`}
        nome="email"
        tipo="email"
        rotulo={t("campos.email")}
        erro={erros.email}
        autoComplete="email"
        ajuda={t("campos.umDosDois")}
      />
      <Campo
        id={`${id}-telefone`}
        nome="telefone"
        tipo="tel"
        rotulo={t("campos.telefone")}
        erro={erros.telefone}
        autoComplete="tel"
      />

      {tipo === "festa" && (
        <Campo
          id={`${id}-pessoas`}
          nome="pessoas"
          tipo="number"
          rotulo={t("campos.pessoas")}
          erro={erros.pessoas}
        />
      )}

      <div className="sm:col-span-2">
        <label
          htmlFor={`${id}-detalhe`}
          className="text-xs font-semibold uppercase tracking-widest text-papel/70"
        >
          {t("campos.detalhe")}
        </label>
        <textarea
          id={`${id}-detalhe`}
          name="detalhe"
          rows={5}
          required
          aria-describedby={erros.detalhe ? `${id}-detalhe-erro` : undefined}
          aria-invalid={erros.detalhe ? true : undefined}
          placeholder={t("campos.detalhePlaceholder")}
          className="mt-2 w-full rounded-xl border border-papel/25 bg-papel/5 px-4 py-3 text-papel placeholder:text-papel/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papel"
        />
        {erros.detalhe && <Erro id={`${id}-detalhe-erro`}>{erros.detalhe}</Erro>}
      </div>

      {/* A armadilha. `aria-hidden` mais `tabIndex={-1}` mais fora do ecrã: quem
          usa leitor ou teclado nunca lhe chega, um robô de preenchimento
          automático enche-a. ⚠️ **Não usar `display: none`** — há robôs que
          ignoram campos escondidos assim, e este tem de parecer real. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-armadilha`}>{t("campos.armadilha")}</label>
        <input id={`${id}-armadilha`} name="armadilha" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-sm text-papel/80">
          <input
            type="checkbox"
            name="consentimento"
            value="sim"
            required
            className="mt-1 size-4 shrink-0 accent-tijolo"
          />
          <span>{t("campos.consentimento")}</span>
        </label>
        {erros.consentimento && <Erro>{erros.consentimento}</Erro>}
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={aPendente}
          className="premivel rounded-full bg-tijolo px-7 py-4 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
        >
          {aPendente ? t("aEnviar") : t("enviar")}
        </button>
        <p className="mt-3 max-w-[46ch] text-sm text-papel/60">{t("nota")}</p>
      </div>
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
}: {
  id: string;
  nome: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  tipo?: string;
  obrigatorio?: boolean;
  autoComplete?: string;
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
