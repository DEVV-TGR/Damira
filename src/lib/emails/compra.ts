import { casa } from "@/data/casa";
import type { ItemCesto } from "@/lib/cesto";
import { estimativa, totalDaLinha } from "@/lib/cesto";
import { urlDaFotoDoBolo } from "@/lib/bolo-personalizado";
import type { DadosCompra } from "@/lib/pedidos";
import { escreverEmail } from "./modelos";
import type { DadosCasa, DadosEmailPedido } from "./tipos";

/**
 * # O email da casa quando chega um pedido pela página de compra
 *
 * É o modelo `criado-loja` — a moldura da Damira, o logótipo e o assunto que
 * começa pelo estado (#137) — com os dados do pedido **tal como o servidor os
 * refez**: as linhas e os preços vêm do catálogo, nunca do browser (regra 1).
 *
 * ⚠️ **Vai sempre com `soPorEmail`**: o pedido ainda não fica guardado (#126),
 * por isso o email não fala em painel, talão nem prazo de resposta.
 *
 * Fica **por confirmar** quando falta alguma coisa à casa — um preço (sob
 * orçamento) ou a hora (pretendida, sem os dados da cozinha). Sem nada disso é
 * **novo**, e não «confirmado»: hoje ninguém o confirmou.
 *
 * Devolve `null` quando não há hora de levantamento: o modelo precisa dela, e
 * quem chama manda então o texto simples de antes. Um pedido nunca se perde
 * por causa da moldura.
 */
export function emailDaCompraParaLoja(pedido: {
  referencia: string;
  criadoEm: Date;
  modoDeTeste: boolean;
  levantamento: Date | null;
  aConfirmar: boolean;
  dados: DadosCompra;
  itens: readonly ItemCesto[];
}): { assunto: string; texto: string; html: string } | null {
  if (!pedido.levantamento || !/^DAM-.+-.+$/.test(pedido.referencia)) return null;
  const { somaCent, semPreco } = estimativa([...pedido.itens]);

  const dados: DadosEmailPedido = {
    referencia: pedido.referencia as DadosEmailPedido["referencia"],
    estado: semPreco > 0 || pedido.aConfirmar ? "por-confirmar" : "confirmado",
    cliente: {
      nome: pedido.dados.nome,
      email: pedido.dados.email,
      telefone: pedido.dados.telefone,
      nif: pedido.dados.nif || null,
    },
    linhas: pedido.itens.map((item) => ({
      nome: item.nome,
      /* O modelo não tem sítio para as notas da linha, e a mensagem do bolo não
         se pode perder: vai no detalhe, entre aspas, depois da variante e do sabor. */
      detalhe: [
        item.variante,
        item.escolha,
        /* O bolo personalizado, escolha a escolha, e as fotos com o endereço:
           sem elas a gerente não faz o orçamento. A de imprimir em maiúsculas,
           como no talão, para não se confundir com as de referência. */
        ...(item.detalhes ?? []),
        ...(item.bolo?.fotosReferencia ?? []).map((foto, i) => `Foto de referência ${i + 1}: ${urlDaFotoDoBolo(foto)}`),
        item.bolo?.fotoImprimir ? `FOTO PARA IMPRIMIR NO BOLO: ${urlDaFotoDoBolo(item.bolo.fotoImprimir)}` : null,
        item.notas ? `«${item.notas.replace(/\s+/g, " ").trim()}»` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      quantidade: item.quantidade,
      unidade: item.unidade,
      precoUnitCent: item.precoCent,
      totalCent: item.precoCent === null ? null : totalDaLinha(item.precoCent, item.quantidade),
      aoQuilo: item.unidade === "kg",
    })),
    totalCent: somaCent,
    faltamPrecos: semPreco > 0,
    criadoEm: pedido.criadoEm,
    levantamentoEm: pedido.levantamento,
    observacoes: pedido.dados.observacoes || null,
    modoDeTeste: pedido.modoDeTeste,
    soPorEmail: true,
  };

  const daCasa: DadosCasa = {
    nome: casa.nome,
    morada: casa.morada,
    localidade: [casa.codigoPostal, casa.cidade].filter(Boolean).join(" ") || null,
    telefone: casa.telefone ?? "—",
  };
  return escreverEmail("criado-loja", dados, daCasa, "pt");
}
