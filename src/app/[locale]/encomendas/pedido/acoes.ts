"use server";

import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { cestoEmTexto, estimativa, pessoasSugeridas, tipoSugerido } from "@/lib/cesto";
import { configuracaoDaCasa, cotarCesto, definicoesLoja, ocupacao, produtoPorId } from "@/lib/dados";
import { enviarEmailDePedido } from "@/lib/email";
import { emailDaCompraParaLoja } from "@/lib/emails/compra";
import { gerarReferencia } from "@/lib/historico";
import { emModoDeTeste } from "@/lib/modo-teste";
import { itensDoServidor } from "@/lib/pedido-servidor";
import { corpoDaCompra, DESTINO_PEDIDOS, esquemaCompra, quandoVoltaALoja, type TipoPedido } from "@/lib/pedidos";
import { confirmarLevantamento } from "@/lib/vagas-servidor";

/** O que fica no histórico do browser. O total é **o do servidor**. */
export type Registo = {
  referencia: string;
  tipo: TipoPedido;
  data: string;
  pessoas: number | null;
  totalCent: number;
  semPreco: number;
};

export type Resultado =
  | { estado: "inicial" }
  /**
   * `estadoPedido`: em que ficou o pedido guardado — confirmado logo, ou à espera da casa. Chega
   * quando a página gravar o pedido na base de dados (#126, passo 1); até lá não vem, e o ecrã diz
   * só que o pedido foi enviado.
   */
  | { estado: "enviado"; registo?: Registo; estadoPedido?: "confirmado" | "por-confirmar" }
  | { estado: "sem-servico"; assunto: string; corpo: string; destino: string; registo: Registo }
  | { estado: "erro"; campos: Record<string, string> };

const LISBOA = { in: tz("Europe/Lisbon") };
const fonte = { configuracaoDaCasa, cotarCesto, ocupacao, produtoPorId };

/**
 * # Enviar o pedido da página de compra
 *
 * O browser manda as **linhas** do cesto (ids e quantidades, nunca preços), a
 * hora escolhida no calendário e os dados da pessoa. Aqui:
 *
 * 1. refaz-se o cesto a partir do catálogo, com os preços do servidor;
 * 2. confirma-se a hora com o mesmo motor do calendário — e a data do pedido
 *    passa a ser a dela, em Lisboa;
 * 3. valida-se o resto; e
 * 4. escreve-se o email à casa com o modelo `criado-loja` (moldura, logótipo,
 *    assunto com o estado) e manda-se; sem hora de levantamento, vai o texto simples.
 *
 * ⚠️ **Até ao Stripe (#38) o pedido acaba aqui, num email.** Com o Stripe, este
 * passo passa a criar o pedido `pendente` e a sessão de pagamento.
 */
export async function enviarCompra(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  /* Os erros na língua de quem encomenda; o email em português, sempre — é para
     a casa. */
  const t = await getTranslations("encomendas.formulario");
  const tc = await getTranslations({ locale: "pt", namespace: "encomendas.cesto" });
  const agora = new Date();

  /* A armadilha primeiro: para o robô, o pedido foi aceite. Dizer-lhe que foi
     apanhado é ensiná-lo a contornar. */
  if (String(dados.get("armadilha") ?? "").length > 0) return { estado: "enviado" };

  /* ⚠️ **A pausa do balcão trava os pedidos** (revisão do #66): é para quando a
     cozinha está cheia. A página já desliga o botão; aqui confirma-se, porque um
     botão desligado não protege nada. */
  const volta = quandoVoltaALoja((await definicoesLoja()).pausaAte, agora, await getLocale());
  if (volta) return { estado: "erro", campos: { geral: t("erros.loja-em-pausa", { quando: volta }) } };

  let linhas: unknown = null;
  try {
    linhas = JSON.parse(String(dados.get("linhas") ?? ""));
  } catch {
    /* Fica `null`, e o cesto é recusado como qualquer outro que não se percebe. */
  }
  const refeito = await itensDoServidor(linhas, fonte, "pt");
  if (!refeito.ok) return { estado: "erro", campos: { cesto: t("erros.cesto-invalido") } };

  let levantamento: Date | null = null;
  let aConfirmar = false;
  let data = String(dados.get("data") ?? "");
  const escolhido = String(dados.get("levantamento") ?? "");
  if (escolhido) {
    const quando = new Date(escolhido);
    const confirmado = Number.isNaN(quando.getTime())
      ? ({ ok: false } as const)
      : await confirmarLevantamento(linhas, quando, fonte, agora);
    if (!confirmado.ok) return { estado: "erro", campos: { data: t("erros.vaga-indisponivel") } };
    levantamento = quando;
    aConfirmar = confirmado.aConfirmar;
    data = format(quando, "yyyy-MM-dd", LISBOA);
  }

  const validado = esquemaCompra(agora).safeParse({
    nome: dados.get("nome") ?? "",
    email: dados.get("email") ?? "",
    telefone: dados.get("telefone") ?? "",
    pais: dados.get("pais") ?? "PT",
    nif: dados.get("nif") ?? "",
    observacoes: dados.get("observacoes") ?? "",
    data,
    consentimento: dados.get("consentimento") === "sim",
  });
  if (!validado.success) {
    const campos: Record<string, string> = {};
    for (const problema of validado.error.issues) {
      const campo = String(problema.path[0] ?? "geral");
      /* Só o primeiro erro de cada campo: dois avisos por baixo da mesma caixa
         não ajudam ninguém a corrigi-la. */
      campos[campo] ??= t(`erros.${problema.message}`);
    }
    return { estado: "erro", campos };
  }

  const referencia = gerarReferencia(agora);
  const { somaCent, semPreco } = estimativa(refeito.itens);
  const cesto = cestoEmTexto(refeito.itens, "pt", {
    semPreco: tc("semPreco"),
    estimativa: tc("estimativa"),
    aPartirDe: tc("aPartirDe"),
  });
  const corpo = corpoDaCompra({
    referencia,
    enviadoEm: agora,
    modoDeTeste: emModoDeTeste(),
    levantamento,
    aConfirmar,
    data,
    dados: validado.data,
    cesto,
  });
  /* O email da casa com a moldura da Damira e o assunto que diz o estado (#137).
     ⚠️ **Nunca à custa do pedido**: sem hora, ou se o modelo recusar os dados, vai
     o texto simples de antes — um pedido não se perde por causa de uma moldura. */
  let modelo: ReturnType<typeof emailDaCompraParaLoja> = null;
  try {
    modelo = emailDaCompraParaLoja({
      referencia,
      criadoEm: agora,
      modoDeTeste: emModoDeTeste(),
      levantamento,
      aConfirmar,
      dados: validado.data,
      itens: refeito.itens,
    });
  } catch (erro) {
    console.error(`[pedidos] ${referencia}: o modelo do email falhou, vai o texto simples:`, erro);
  }
  const quando = levantamento ? format(levantamento, "d/M HH:mm", LISBOA) : data;
  /* ⚠️ **A referência vai no assunto.** É por ela que quem atende procura o
     email quando o cliente liga a dizer o código. */
  const assunto = modelo?.assunto ?? `Pedido ${referencia} — ${validado.data.nome} · levantamento ${quando}`;
  const textoDoEmail = modelo?.texto ?? corpo;

  const registo: Registo = {
    referencia,
    tipo: tipoSugerido(refeito.itens) ?? "outro",
    data,
    pessoas: pessoasSugeridas(refeito.itens),
    totalCent: somaCent,
    semPreco,
  };

  const envio = await enviarEmailDePedido({
    referencia,
    assunto,
    corpo: textoDoEmail,
    html: modelo?.html,
    responderPara: validado.data.email,
  });
  return envio === "enviado"
    ? { estado: "enviado", registo }
    : { estado: "sem-servico", assunto, corpo: textoDoEmail, destino: DESTINO_PEDIDOS, registo };
}
