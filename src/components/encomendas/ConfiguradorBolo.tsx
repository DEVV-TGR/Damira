"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatarCent } from "@/lib/preco";
import { idComNotas, REGRA_SIMPLES } from "@/lib/cesto";
import {
  ativas,
  coberturasDaMassa,
  comCobertura,
  imprimeFoto,
  linhasDoBolo,
  toppingsExtraPossiveis,
  precoAPartirDe,
  validarBolo,
  type ErroBolo,
  type RotulosDoBolo,
} from "@/lib/bolo-personalizado";
import { FotoIlegivel, reduzirFoto } from "@/lib/reduzir-foto";
import type { EscolhaBolo, OpcaoBolo, OpcoesBolo } from "@/lib/dados/tipos";
import type { Locale } from "@/i18n/routing";
import { useCesto } from "./CestoProvider";

/**
 * # O configurador do bolo personalizado
 *
 * O cliente monta o bolo **dentro do que a casa faz** (`bolos-personalizados.md`):
 * tamanho, massa, cobertura, recheio, «à volta» e topping, e junta as fotos. As
 * listas encolhem à medida que se escolhe — a massa decide as coberturas, e a
 * cobertura o resto —, com as mesmas funções que o servidor usa para recusar
 * (`src/lib/bolo-personalizado.ts`). O que aqui não aparece, a casa não faz.
 *
 * ⚠️ **As duas fotos são dois campos** (`bolos-personalizados.md` › As duas fotos):
 * as de referência, sempre, e a de imprimir só com o topping que a imprime.
 *
 * ⚠️ **O bolo entra no cesto sem preço** (sob orçamento): o «a partir de» do
 * tamanho é só para mostrar.
 */

/** Uma foto já enviada: o caminho que vai no pedido e a pré-visualização local. */
type FotoEnviada = { caminho: string; previa: string; pequena: boolean };

/* Abaixo disto, no lado menor, a impressão arrisca sair desfocada. ⚠️ Provisório:
   o mínimo confirma-se com a cozinha (`bolos-personalizados.md`). */
const LADO_MINIMO_PARA_IMPRIMIR = 1000;

export function ConfiguradorBolo({
  opcoes,
  produtoId,
  nome,
  locale,
}: {
  opcoes: OpcoesBolo;
  produtoId: string;
  nome: string;
  locale: Locale;
}) {
  const t = useTranslations("produto");
  const tb = useTranslations("produto.bolo");
  const contexto = useCesto();
  const campo = useId();

  const [tamanhoId, setTamanhoId] = useState<string | null>(null);
  const [massaId, setMassaId] = useState<string | null>(null);
  const [coberturaId, setCoberturaId] = useState<string | null>(null);
  const [recheioId, setRecheioId] = useState<string | null>(null);
  const [aVoltaId, setAVoltaId] = useState<string | null>(null);
  const [toppingId, setToppingId] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [referencia, setReferencia] = useState<FotoEnviada[]>([]);
  const [imprimir, setImprimir] = useState<FotoEnviada | null>(null);
  const [autoriza, setAutoriza] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<ErroBolo | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState<"referencia" | "imprimir" | null>(null);
  const [juntado, setJuntado] = useState(false);

  const rotulos: RotulosDoBolo = useMemo(
    () => ({
      tamanho: tb("passos.tamanho"),
      massa: tb("passos.massa"),
      cobertura: tb("passos.cobertura"),
      recheio: tb("passos.recheio"),
      aVolta: tb("passos.aVolta"),
      topping: tb("passos.topping"),
      toppingsExtra: tb("passos.toppingsExtra"),
    }),
    [tb],
  );

  const tamanhos = ativas(opcoes.tamanhos);
  const coberturas = coberturasDaMassa(opcoes, massaId);
  const recheios = comCobertura(opcoes.recheios, coberturaId);
  const aVolta = comCobertura(opcoes.aVolta, coberturaId);
  const toppings = comCobertura(opcoes.toppings, coberturaId);
  const pedeFoto = imprimeFoto(opcoes, toppingId);
  const aPartirDe = precoAPartirDe(opcoes, tamanhoId, extras);
  const extrasPossiveis = toppingsExtraPossiveis(opcoes, coberturaId, toppingId);

  if (!contexto) return null;

  /* Qualquer mudança apaga o «juntado» e o erro: o botão volta a dizer «juntar»,
     e a pessoa sabe que o que está no cesto é o de antes. */
  const mudou = () => {
    setJuntado(false);
    setErro(null);
  };

  /* Trocar a massa pode tirar a cobertura escolhida (o Pão-de-Ló só leva
     «Outras»); trocar a cobertura pode tirar o resto. O que deixa de ser
     possível limpa-se, em vez de ficar escolhido e escondido. Com uma cobertura
     só, escolhe-se sozinha. */
  const escolherMassa = (id: string | null) => {
    setMassaId(id);
    const possiveis = coberturasDaMassa(opcoes, id);
    const fica = possiveis.some((c) => c.id === coberturaId) ? coberturaId : possiveis.length === 1 ? possiveis[0].id : null;
    escolherCobertura(fica);
  };
  const escolherCobertura = (id: string | null) => {
    setCoberturaId(id);
    const segue = (lista: OpcoesBolo["recheios"], atual: string | null) =>
      comCobertura(lista, id).some((o) => o.id === atual) ? atual : null;
    setRecheioId((atual) => segue(opcoes.recheios, atual));
    setAVoltaId((atual) => segue(opcoes.aVolta, atual));
    setToppingId((atual) => {
      const fica = segue(opcoes.toppings, atual);
      if (!imprimeFoto(opcoes, fica)) setImprimir(null);
      return fica;
    });
    /* Os extras que deixam de ir com a nova cobertura saem. */
    setExtras((atuais) => atuais.filter((x) => comCobertura(opcoes.toppings, id).some((t) => t.id === x)));
    mudou();
  };

  const enviar = async (ficheiro: File, destino: "referencia" | "imprimir") => {
    setErroFoto(null);
    setAEnviar(destino);
    try {
      const { foto, original } = await reduzirFoto(ficheiro);
      const corpo = new FormData();
      corpo.append("foto", foto);
      const resposta = await fetch("/api/bolos/fotos", { method: "POST", body: corpo });
      const lido = (await resposta.json().catch(() => ({}))) as { foto?: string; erro?: string };
      if (!resposta.ok || !lido.foto) {
        const conhecido = lido.erro === "nao-configurado" || lido.erro === "demasiados-envios";
        setErroFoto(tb(`erros.${conhecido ? lido.erro : "envio"}`));
        return;
      }
      const enviada: FotoEnviada = {
        caminho: lido.foto,
        previa: URL.createObjectURL(foto),
        pequena: Math.min(original.largura, original.altura) < LADO_MINIMO_PARA_IMPRIMIR,
      };
      if (destino === "imprimir") setImprimir(enviada);
      else setReferencia((atuais) => [...atuais, enviada].slice(0, opcoes.fotos.referenciaMaximo));
      mudou();
    } catch (e) {
      setErroFoto(tb(e instanceof FotoIlegivel ? "erros.ilegivel" : "erros.envio"));
    } finally {
      setAEnviar(null);
    }
  };

  const notas =
    [
      mensagem.trim() ? `${t("mensagem")}: ${mensagem.trim()}` : "",
      observacoes.trim() ? `${t("observacoes")}: ${observacoes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n") || null;

  const juntar = () => {
    /* Os campos por escolher vão como `""`, que nenhuma opção tem: o
       `validarBolo` diz qual falta, pela ordem do configurador. */
    const bolo: EscolhaBolo = {
      tamanhoId: tamanhos.length > 0 ? tamanhoId ?? "" : null,
      massaId: massaId ?? "",
      coberturaId: coberturaId ?? "",
      recheioId: recheioId ?? "",
      aVoltaId: aVoltaId ?? "",
      toppingId: toppingId ?? "",
      toppingsExtra: extras,
      fotosReferencia: referencia.map((f) => f.caminho),
      fotoImprimir: pedeFoto ? imprimir?.caminho ?? null : null,
      autorizaFoto: pedeFoto && autoriza,
    };
    const problema = validarBolo(opcoes, bolo);
    if (problema) {
      setErro(problema);
      return;
    }
    /* ⚠️ O bolo entra no `id` da linha: dois bolos diferentes são duas linhas, e
       não um com quantidade dois. */
    const marca = idComNotas("x", JSON.stringify(bolo)).slice(2);
    contexto.juntar({
      ...REGRA_SIMPLES,
      id: idComNotas(`${produtoId}:unica~${marca}`, notas),
      produtoId,
      varianteId: "unica",
      tipo: "bolo",
      nome,
      variante: null,
      precoCent: null,
      pessoas: null,
      notas,
      escolha: null,
      bolo,
      detalhes: linhasDoBolo(opcoes, bolo, rotulos),
    });
    setJuntado(true);
  };

  const rotuloCampo = "text-xs font-semibold uppercase tracking-widest text-tinta-suave";
  const caixa =
    "mt-2 w-full rounded-xl border border-tinta/25 bg-papel px-4 py-3 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo";
  const marcado = (campoComErro: ErroBolo) => (erro === campoComErro ? "border-tijolo ring-2 ring-tijolo/30" : "");

  return (
    <div className="mt-10 rounded-2xl border border-tinta/15 bg-papel-fundo p-6">
      <div className="grid gap-6">
        {tamanhos.length > 0 && (
          <fieldset>
            <legend className={rotuloCampo}>{tb("passos.tamanho")}</legend>
            <div className={`mt-3 flex flex-wrap gap-2 rounded-2xl ${marcado("tamanho")}`}>
              {tamanhos.map((tamanho) => (
                <label
                  key={tamanho.id}
                  className={`premivel alvo-toque flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm ${
                    tamanho.id === tamanhoId ? "border-tijolo bg-tijolo text-papel" : "border-tinta/25 hover:bg-tinta hover:text-papel"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${campo}-tamanho`}
                    checked={tamanho.id === tamanhoId}
                    onChange={() => {
                      setTamanhoId(tamanho.id);
                      mudou();
                    }}
                    className="sr-only"
                  />
                  {tamanho.nome}
                  {tamanho.precoCent !== null && (
                    <span className="tabular-nums opacity-80">
                      {tb("aPartirDe", { preco: formatarCent(tamanho.precoCent, locale) })}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <Lista
          htmlId={`${campo}-massa`}
          escolher={tb("escolher")}
          classe={`${caixa} ${marcado("massa")}`}
          rotulo={tb("passos.massa")}
          lista={ativas(opcoes.massas)}
          valor={massaId}
          aoMudar={(id) => {
            escolherMassa(id);
            mudou();
          }}
          desligada={false}
          ajuda={massaId ? tb("quantasCoberturas", { n: coberturas.length }) : null}
        />

        <fieldset>
          <legend className={rotuloCampo}>{tb("passos.cobertura")}</legend>
          {coberturas.length === 0 ? (
            <p className="mt-2 text-sm text-tinta-suave">{tb("primeiroMassa")}</p>
          ) : (
            <div className={`mt-3 flex flex-wrap gap-2 rounded-2xl ${marcado("cobertura")}`}>
              {coberturas.map((cobertura) => (
                <label
                  key={cobertura.id}
                  className={`premivel alvo-toque flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-sm ${
                    cobertura.id === coberturaId ? "border-tijolo bg-tijolo text-papel" : "border-tinta/25 hover:bg-tinta hover:text-papel"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${campo}-cobertura`}
                    checked={cobertura.id === coberturaId}
                    onChange={() => escolherCobertura(cobertura.id)}
                    className="sr-only"
                  />
                  {cobertura.nome}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {(
          [
            ["recheio", tb("passos.recheio"), recheios, recheioId, setRecheioId, "recheio"],
            ["a-volta", tb("passos.aVolta"), aVolta, aVoltaId, setAVoltaId, "a-volta"],
          ] as const
        ).map(([id, rotulo, lista, valor, mudar, falha]) => (
          <Lista
            key={id}
            htmlId={`${campo}-${id}`}
            escolher={tb("escolher")}
            classe={`${caixa} ${marcado(falha)}`}
            rotulo={rotulo}
            lista={lista}
            valor={valor}
            aoMudar={(novo) => {
              mudar(novo);
              mudou();
            }}
            desligada={!coberturaId}
            ajuda={coberturaId ? null : tb("primeiroCobertura")}
          />
        ))}

        <Lista
          htmlId={`${campo}-topping`}
          escolher={tb("escolher")}
          classe={`${caixa} ${marcado("topping")}`}
          rotulo={tb("passos.topping")}
          lista={toppings}
          valor={toppingId}
          aoMudar={(id) => {
            setToppingId(id);
            if (!imprimeFoto(opcoes, id)) setImprimir(null);
            /* O topping principal não se repete nos extras. */
            setExtras((atuais) => atuais.filter((x) => x !== id));
            mudou();
          }}
          desligada={!coberturaId}
          ajuda={coberturaId ? null : tb("primeiroCobertura")}
        />

        {/* Os toppings extra (26/11): a mais do topping, da mesma lista e com a
            mesma cobertura. Só aparecem se a gerente os ligou (o máximo) e
            depois de escolhida a cobertura. */}
        {coberturaId && extrasPossiveis.length > 0 && (
          <fieldset className={`rounded-2xl ${marcado("toppings-extra")}`}>
            <legend className={rotuloCampo}>{tb("passos.toppingsExtra")}</legend>
            <p className="mt-1.5 text-sm text-tinta-suave">
              {tb("toppingsExtraAjuda", { n: opcoes.toppingsExtra.maximo })}
            </p>
            <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {extrasPossiveis.map((t) => {
                const marcadoJa = extras.includes(t.id);
                const cheio = !marcadoJa && extras.length >= opcoes.toppingsExtra.maximo;
                return (
                  <label
                    key={t.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 text-sm ${cheio ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={marcadoJa}
                      disabled={cheio}
                      onChange={(e) => {
                        setExtras((atuais) =>
                          e.target.checked ? [...atuais, t.id] : atuais.filter((x) => x !== t.id),
                        );
                        mudou();
                      }}
                      className="size-5 shrink-0 accent-tijolo"
                    />
                    <span className="min-w-0">
                      {t.nome}
                      {t.precoExtraCent !== null && (
                        <span className="ml-1 tabular-nums text-tinta-suave">
                          +{formatarCent(t.precoExtraCent, locale)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {opcoes.fotos.referenciaMaximo > 0 && (
          <fieldset className={`rounded-2xl ${marcado("fotos-referencia")}`}>
            <legend className={rotuloCampo}>{tb("fotosReferencia")}</legend>
            <p className="mt-1.5 text-sm text-tinta-suave">
              {tb("fotosReferenciaAjuda", { n: opcoes.fotos.referenciaMaximo })}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {referencia.map((foto, i) => (
                <figure key={foto.caminho} className="w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uma pré-visualização local (blob:), que o next/image não otimiza */}
                  <img src={foto.previa} alt={`${tb("fotosReferencia")} ${i + 1}`} className="aspect-square w-28 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setReferencia((atuais) => atuais.filter((f) => f.caminho !== foto.caminho));
                      mudou();
                    }}
                    className="alvo-toque mt-1 text-xs font-semibold uppercase tracking-widest text-tijolo underline underline-offset-4"
                  >
                    {tb("tirarFoto")}
                  </button>
                </figure>
              ))}
              {referencia.length < opcoes.fotos.referenciaMaximo && (
                <EscolherFoto
                  rotulo={aEnviar === "referencia" ? tb("aEnviar") : tb("juntarFoto")}
                  ocupado={aEnviar !== null}
                  aoEscolher={(f) => enviar(f, "referencia")}
                />
              )}
            </div>
          </fieldset>
        )}

        {/* A foto para imprimir só existe com o topping que a imprime: sem ele,
            o campo nem aparece — é a forma de a cozinha nunca imprimir uma foto
            que só servia de inspiração. */}
        {pedeFoto && (
          <fieldset className={`rounded-2xl border border-tijolo/40 p-4 ${marcado("foto-imprimir")}`}>
            <legend className={`${rotuloCampo} px-1 text-tijolo`}>{tb("fotoImprimir")}</legend>
            <p className="text-sm text-tinta-suave">{tb("fotoImprimirAjuda")}</p>
            <div className="mt-3 flex flex-wrap items-start gap-3">
              {imprimir && (
                <figure className="w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:) */}
                  <img src={imprimir.previa} alt={tb("fotoImprimir")} className="aspect-square w-36 rounded-xl object-cover" />
                </figure>
              )}
              <EscolherFoto
                rotulo={aEnviar === "imprimir" ? tb("aEnviar") : imprimir ? tb("trocarFoto") : tb("juntarFoto")}
                ocupado={aEnviar !== null}
                aoEscolher={(f) => enviar(f, "imprimir")}
              />
            </div>
            {imprimir?.pequena && (
              <p role="status" className="mt-2 text-sm font-semibold text-tijolo">
                {tb("fotoPequena")}
              </p>
            )}
            {imprimir && (
              <label className={`mt-4 flex cursor-pointer items-start gap-3 text-sm ${marcado("autorizacao")}`}>
                {/* ⚠️ Texto provisório: o definitivo vem da advogada (#52). */}
                <input
                  type="checkbox"
                  checked={autoriza}
                  onChange={(e) => {
                    setAutoriza(e.target.checked);
                    mudou();
                  }}
                  className="mt-0.5 size-5 accent-tijolo"
                />
                <span>{tb("autorizacao")}</span>
              </label>
            )}
          </fieldset>
        )}

        {erroFoto && (
          <p role="alert" className="text-sm font-semibold text-tijolo">
            {erroFoto}
          </p>
        )}

        <div>
          <label htmlFor={`${campo}-mensagem`} className={rotuloCampo}>
            {t("mensagem")}
          </label>
          <input
            id={`${campo}-mensagem`}
            value={mensagem}
            maxLength={80}
            onChange={(e) => {
              setMensagem(e.target.value);
              mudou();
            }}
            placeholder={t("mensagemDica")}
            className={`${caixa} placeholder:text-tinta-suave/60`}
          />
        </div>
        <div>
          <label htmlFor={`${campo}-observacoes`} className={rotuloCampo}>
            {t("observacoes")}
          </label>
          <textarea
            id={`${campo}-observacoes`}
            value={observacoes}
            rows={3}
            maxLength={250}
            onChange={(e) => {
              setObservacoes(e.target.value);
              mudou();
            }}
            placeholder={t("observacoesDica")}
            className={`${caixa} placeholder:text-tinta-suave/60`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="titulo-display text-3xl tabular-nums text-tijolo">
          {aPartirDe === null ? (
            <span className="text-base normal-case">{t("sobOrcamento")}</span>
          ) : (
            <span className="text-xl">{tb("aPartirDe", { preco: formatarCent(aPartirDe, locale) })}</span>
          )}
        </p>
        <button
          type="button"
          onClick={juntar}
          disabled={aEnviar !== null}
          className="premivel alvo-toque inline-flex min-h-12 items-center gap-2 rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel disabled:opacity-60"
        >
          {juntado ? t("juntado") : t("juntar")}
        </button>
      </div>
      {erro && (
        <p role="alert" className="mt-3 text-sm font-semibold text-tijolo">
          {tb(`erros.${erro}`)}
        </p>
      )}
      <p className="mt-4 text-sm text-tinta-suave">{tb("notaPreco")}</p>
    </div>
  );
}

/**
 * Uma lista de opções. ⚠️ **Uma lista nativa, e não quarenta botões.** São 21
 * massas e 42 recheios: no telemóvel o seletor do sistema é o que se percorre
 * com o polegar, e uma grelha de pastilhas eram três ecrãs por campo.
 */
function Lista({
  htmlId,
  rotulo,
  lista,
  valor,
  aoMudar,
  desligada,
  ajuda,
  classe,
  escolher,
}: {
  htmlId: string;
  rotulo: string;
  lista: readonly OpcaoBolo[];
  valor: string | null;
  aoMudar: (id: string | null) => void;
  desligada: boolean;
  ajuda: string | null;
  classe: string;
  escolher: string;
}) {
  return (
    <div>
      <label htmlFor={htmlId} className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        {rotulo}
      </label>
      <select
        id={htmlId}
        value={valor ?? ""}
        disabled={desligada}
        onChange={(e) => aoMudar(e.target.value || null)}
        className={classe}
      >
        <option value="">{escolher}</option>
        {lista.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
      {ajuda && <p className="mt-1.5 text-sm text-tinta-suave">{ajuda}</p>}
    </div>
  );
}

/** O botão de escolher uma foto: um `<input type="file">` vestido de botão. */
function EscolherFoto({
  rotulo,
  ocupado,
  aoEscolher,
}: {
  rotulo: string;
  ocupado: boolean;
  aoEscolher: (ficheiro: File) => void;
}) {
  return (
    <label
      className={`premivel alvo-toque flex aspect-square w-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-tinta/40 p-2 text-center text-xs font-semibold uppercase tracking-widest ${
        ocupado ? "pointer-events-none opacity-60" : "hover:bg-tinta hover:text-papel"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        disabled={ocupado}
        className="sr-only"
        onChange={(e) => {
          const ficheiro = e.target.files?.[0];
          /* Limpa-se já: escolher a mesma foto outra vez (depois de a tirar) tem
             de voltar a disparar o `change`. */
          e.target.value = "";
          if (ficheiro) aoEscolher(ficheiro);
        }}
      />
      {rotulo}
    </label>
  );
}
