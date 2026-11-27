import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { criarPedido, definicoesLoja } from "@/lib/dados";
import { MODO_CONTA } from "@/lib/conta";
import { enviarDepois } from "@/lib/emails/depois";
import { avisarQuePedidosMudaram } from "@/lib/painel-versao";
import { esquemaCompra, quandoVoltaALoja } from "@/lib/pedidos";
import type { ErroCriarPedido } from "@/lib/dados/tipos";
import type { Resultado } from "./acoes";

/** A fonte decide preços, disponibilidade e repetições; esta ação traduz o formulário. */
export async function registarCompra(dados: FormData): Promise<Resultado> {
  const t = await getTranslations("encomendas.formulario");
  const erro = (campo: string, chave: string): Resultado => ({ estado: "erro", campos: { [campo]: t(`erros.${chave}`) } });
  try {
    const levantamentoEm = String(dados.get("levantamento") ?? "");
    const levantamento = new Date(levantamentoEm);
    if (!levantamentoEm || Number.isNaN(levantamento.getTime())) return erro("data", "data-invalida");
    /* Não se recusa aqui uma data entretanto passada: pode ser a repetição de
       um pedido gravado cuja resposta se perdeu. A fonte valida datas novas. */
    const validado = esquemaCompra(new Date(0)).safeParse({
      nome: dados.get("nome") ?? "", email: dados.get("email") ?? "",
      telefone: dados.get("telefone") ?? "", pais: dados.get("pais") ?? "PT",
      nif: dados.get("nif") ?? "", observacoes: dados.get("observacoes") ?? "",
      data: format(levantamento, "yyyy-MM-dd", { in: tz("Europe/Lisbon") }),
      consentimento: dados.get("consentimento") === "sim",
    });
    if (!validado.success) {
      const campos: Record<string, string> = {};
      for (const problema of validado.error.issues) {
        const campo = String(problema.path[0] ?? "geral");
        const conhecidas = ["nome-curto", "email-invalido", "telefone-curto", "telefone-invalido", "nif-invalido", "consentimento", "data-invalida", "data-passada"];
        const chave = conhecidas.includes(problema.message) ? problema.message : "dados-invalidos";
        campos[campo] ??= t(`erros.${chave}`);
      }
      return { estado: "erro", campos };
    }
    let linhas: unknown;
    try {
      linhas = JSON.parse(String(dados.get("linhas") ?? ""));
    } catch {
      return erro("cesto", "cesto-invalido");
    }
    const cabecalhos = await headers();
    const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    /* A demonstração é localStorage, não identidade. Só a sessão assinada pode
       associar pedidos a uma conta; o checkout continua a aceitar visitantes. */
    const sessao = MODO_CONTA === "fornecedores" ? await (await import("@/lib/autenticacao")).auth() : null;
    const agora = new Date();
    const criacao = await criarPedido({
      linhas, levantamentoEm,
      cliente: { nome: validado.data.nome, email: validado.data.email, telefone: validado.data.telefone, nif: validado.data.nif || null },
      observacoes: validado.data.observacoes || null,
      chaveIdempotencia: String(dados.get("chaveIdempotencia") ?? ""),
      armadilha: "",
    }, { agora, ip, contaId: sessao?.user?.id ?? null });
    if (!criacao.ok) {
      if (criacao.erro === "recusado") return { estado: "enviado" };
      if (criacao.erro === "loja-em-pausa") {
        const quando = quandoVoltaALoja((await definicoesLoja()).pausaAte, agora, await getLocale());
        return { estado: "erro", campos: { geral: quando ? t("erros.loja-em-pausa", { quando }) : t("erros.pedido-indisponivel") } };
      }
      const erros: Record<Exclude<ErroCriarPedido, "recusado" | "loja-em-pausa">, [string, string]> = {
        "dados-invalidos": ["geral", "dados-invalidos"],
        "artigo-invalido": ["cesto", "cesto-invalido"],
        "abaixo-do-minimo-da-loja": ["cesto", "abaixo-do-minimo-da-loja"],
        "indisponivel": ["data", "vaga-indisponivel"],
        "vaga-cheia": ["data", "vaga-indisponivel"],
        "demasiados-pedidos": ["geral", "demasiados-pedidos"],
      };
      return erro(...erros[criacao.erro]);
    }
    const { pedido } = criacao;
    try {
      avisarQuePedidosMudaram();
    } catch {
      /* Já ficou gravado. Nunca se convida a repetir um pedido por falhar cache. */
      console.error(`[pedidos] ${pedido.referencia}: falhou o aviso ao painel`);
    }
    /* Os dois emails de criação já estão na fila, gravados no mesmo lote que o
       pedido: só agora, com a escrita feita, se pede o envio, e corre depois da
       resposta (`after`). Numa repetição também serve: o emissor só envia o que
       ainda está pendente, e nunca o mesmo email duas vezes. */
    enviarDepois();
    return {
      estado: "enviado", estadoPedido: pedido.estado,
      registo: {
        referencia: pedido.referencia, tipo: "outro", pessoas: null,
        data: format(pedido.levantamentoEm, "yyyy-MM-dd", { in: tz("Europe/Lisbon") }),
        totalCent: pedido.totalCent, semPreco: pedido.linhas.filter((l) => l.totalCent === null).length,
      },
    };
  } catch {
    // Os erros do driver podem conter a consulta e os dados pessoais: não os escrever.
    console.error("[pedidos] falhou o registo da compra");
    return { estado: "erro", campos: { geral: t("erros.falha-registo") }, repetirEnvio: true };
  }
}
