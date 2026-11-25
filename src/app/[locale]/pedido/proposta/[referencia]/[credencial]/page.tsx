import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { enGB, pt } from "date-fns/locale";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DecisaoProposta } from "@/components/pedido/DecisaoProposta";
import { casa } from "@/data/casa";
import type { Locale } from "@/i18n/routing";
import { pedidoPorReferencia } from "@/lib/dados";
import type { Pedido } from "@/lib/dados/tipos";
import { FUSO } from "@/lib/horarios";
import { formatarCent } from "@/lib/preco";
import { versaoDoLink } from "@/lib/proposta";

/*
 * # A página da proposta (`pedidos.md` › O aceite do cliente)
 *
 * ⚠️ **Nunca em cache** (regra 7 do AGENTS.md): é o estado de um pedido, e uma cópia antiga
 * mostrava um botão de aceitar a quem já aceitou. E fora dos motores de busca: tem nome, preços e
 * a hora de levantamento de alguém.
 *
 * Abrir a página não aceita nada — os filtros de correio abrem os links sozinhos. Mostra a
 * proposta, e aceitar ou recusar são botões. Um link de um pedido que já não espera o aceite mostra
 * em que ficou, sem mudar nada.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "proposta" });
  return { title: t("metaTitulo"), robots: { index: false, follow: false } };
}

type Parametros = { locale: string; referencia: string; credencial: string };

export default async function PaginaProposta({ params }: { params: Promise<Parametros> }) {
  const { locale, referencia, credencial } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "proposta" });
  const telefone = casa.telefone ?? "";

  /* A credencial primeiro: sem ela nem se lê o pedido, e um link inventado não descobre se a
     referência existe. */
  /* Sem a chave, nenhum link se confere: a página diz que o link não é válido, em vez de rebentar. */
  let versao: number | null = null;
  try {
    versao = versaoDoLink(referencia, credencial);
  } catch {
    console.error("[proposta] o link não se conferiu: falta a PROPOSTA_SEGREDO?");
  }
  const pedido = versao === null ? null : await pedidoPorReferencia(referencia);
  if (versao === null || !pedido || pedido.propostaVersao < versao) {
    return <Aviso titulo={t("invalido.titulo")} texto={t("invalido.texto", { telefone })} />;
  }

  const lingua = locale as Locale;
  const opcoes = { in: tz(FUSO), locale: lingua === "pt" ? pt : enGB };
  const maiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase(lingua === "pt" ? "pt-PT" : "en-GB") + texto.slice(1);
  const data = (instante: Date) =>
    maiuscula(format(instante, lingua === "pt" ? "EEEE, d 'de' MMMM 'de' yyyy, 'às' HH'h'mm" : "EEEE d MMMM yyyy 'at' HH:mm", opcoes));

  if (pedido.estado === "a-aguardar-aceite" && pedido.propostaVersao > versao) {
    return <Aviso titulo={t("revista.titulo")} texto={t("revista.texto")} />;
  }
  if (pedido.estado === "confirmado" && pedido.aceiteEm) {
    return (
      <Aviso titulo={t("aceite.titulo")} texto={t("aceite.texto")}>
        <Levantamento rotulo={t("dataLevantamento")} quando={data(pedido.levantamentoEm)} naLoja={t("naLoja")} />
        <Referencia rotulo={t("referencia")} referencia={pedido.referencia} />
      </Aviso>
    );
  }
  if (pedido.estado === "cancelado") {
    return pedido.canceladoPor === "cliente" ? (
      <Aviso titulo={t("recusada.titulo")} texto={t("recusada.texto")}>
        <Referencia rotulo={t("referencia")} referencia={pedido.referencia} />
      </Aviso>
    ) : (
      <Aviso titulo={t("cancelado.titulo")} texto={t("cancelado.texto", { telefone })} />
    );
  }
  /* As 24 horas do cliente passaram: expirou, mesmo que a limpeza ainda não o tenha gravado. */
  const passouOPrazo = pedido.estado === "a-aguardar-aceite" && prazoPassou(pedido);
  if (passouOPrazo || (pedido.estado === "expirado" && pedido.causaExpiracao === "sem-aceite-do-cliente")) {
    return <Aviso titulo={t("expirada.titulo")} texto={t("expirada.texto", { telefone })} />;
  }
  if (pedido.estado !== "a-aguardar-aceite") {
    return <Aviso titulo={t("indisponivel.titulo")} texto={t("indisponivel.texto", { telefone })} />;
  }

  const hora = (instante: Date) => format(instante, lingua === "pt" ? "HH'h'mm" : "HH:mm", opcoes);
  const mesmoDia = (a: Date, b: Date) => format(a, "yyyy-MM-dd", opcoes) === format(b, "yyyy-MM-dd", opcoes);
  const anterior = pedido.levantamentoAnteriorEm;
  const mudancas = [
    ...pedido.linhas
      .filter((linha) => linha.precoDaProposta && linha.totalCent !== null)
      .map((linha) => `${linha.nome}: ${formatarCent(linha.totalCent!, lingua)}`),
    ...(anterior
      ? [
          mesmoDia(anterior, pedido.levantamentoEm)
            ? t("novaHora", { depois: hora(pedido.levantamentoEm), antes: hora(anterior) })
            : t("novaData", { depois: data(pedido.levantamentoEm), antes: data(anterior) }),
        ]
      : []),
  ];

  return (
    <div className="seccao">
      <div className="envolvente">
        <div className="max-w-[40rem]">
          <h1 className="titulo-display titulo-beta">{t("titulo")}</h1>
          <p className="mt-3 text-lg text-tinta-suave">{t("intro")}</p>

          {mudancas.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">{t("proposta")}</h2>
              <ul className="mt-2 space-y-1 text-lg">
                {mudancas.map((mudanca) => (
                  <li key={mudanca}>{mudanca}</li>
                ))}
              </ul>
            </section>
          )}

          <Resumo pedido={pedido} lingua={lingua} titulo={t("resumo")} total={t("total")} />
          <Levantamento rotulo={t("dataLevantamento")} quando={data(pedido.levantamentoEm)} naLoja={t("naLoja")} />

          <p className="mt-6">
            <strong>{t("pagamento")}</strong> {t("pagamentoTexto")}
          </p>
          <p className="mt-3">
            <strong>{t("importante")}</strong> {t("importanteTexto")}
          </p>
          {pedido.expiraEm && <p className="mt-3 font-semibold text-tijolo">{t("prazo", { data: data(pedido.expiraEm) })}</p>}

          <DecisaoProposta referencia={pedido.referencia} credencial={credencial} telefone={telefone} />

          <Referencia rotulo={t("referencia")} referencia={pedido.referencia} />
          <p className="mt-4 text-sm text-tinta-suave">{t("duvidas", { telefone })}</p>
        </div>
      </div>
    </div>
  );
}

/* A página é dinâmica e sem cache (`dynamic = "force-dynamic"`): cada pedido lê a hora de agora, e
   é isso que se quer — fora do componente, porque a regra de pureza do React não sabe que este
   componente do servidor corre uma vez por pedido. */
function prazoPassou(pedido: Pedido): boolean {
  return pedido.expiraEm === null || pedido.expiraEm.getTime() <= Date.now();
}

function Aviso({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="seccao">
      <div className="envolvente">
        <div className="max-w-[40rem] rounded-2xl border border-tinta/15 p-8">
          <h1 className="titulo-display titulo-gama">{titulo}</h1>
          <p className="mt-3 text-tinta-suave">{texto}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Resumo({ pedido, lingua, titulo, total }: { pedido: Pedido; lingua: Locale; titulo: string; total: string }) {
  return (
    <section className="mt-8 rounded-2xl bg-papel-fundo p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">{titulo}</h2>
      <ul className="mt-3 divide-y divide-papel">
        {pedido.linhas.map((linha, i) => (
          <li key={i} className="flex justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="text-tinta-suave">
                {linha.quantidade}
                {linha.unidade === "kg" ? " kg" : ""} ×
              </span>{" "}
              {linha.nome}
              {linha.variante ? ` (${linha.variante})` : ""}
            </span>
            <span className="whitespace-nowrap">{linha.totalCent === null ? "—" : formatarCent(linha.totalCent, lingua)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between gap-4 border-t-2 border-tijolo pt-4 font-semibold">
        <span>{total}</span>
        <span className="titulo-display whitespace-nowrap text-xl">{formatarCent(pedido.totalCent, lingua)}</span>
      </p>
    </section>
  );
}

function Levantamento({ rotulo, quando, naLoja }: { rotulo: string; quando: string; naLoja: string }) {
  return (
    <section className="mt-6 rounded-r-2xl border-l-4 border-tijolo bg-papel-fundo p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">{rotulo}</h2>
      <p className="titulo-display mt-1 text-xl text-tijolo">{quando}</p>
      <p className="mt-2 text-sm">
        <strong>{naLoja}</strong> {casa.morada}
        {casa.cidade ? `, ${casa.cidade}` : ""}
      </p>
    </section>
  );
}

function Referencia({ rotulo, referencia }: { rotulo: string; referencia: string }) {
  return (
    <p className="mt-6 rounded-xl border border-tinta/15 px-5 py-4">
      <span className="block text-xs font-semibold uppercase tracking-widest text-tinta-suave">{rotulo}</span>
      <span className="titulo-display mt-1 block select-all text-2xl tracking-[0.12em]">{referencia}</span>
    </p>
  );
}
