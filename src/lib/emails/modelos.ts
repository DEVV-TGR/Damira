/**
 * Texto simples abre em qualquer cliente de correio e adapta-se ao telemóvel.
 * A loja recebe sempre português porque a mensagem é para a equipa, seja qual for a língua do cliente.
 * Não se fazem contas de dinheiro: o pedido guarda os valores do momento e o servidor dá os totais.
 * As datas usam Lisboa porque é aí que se prepara e levanta o pedido, independentemente do fuso do servidor.
 */
import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { enGB, pt } from "date-fns/locale";
import type { Locale } from "@/i18n/routing";
import { FUSO } from "@/lib/horarios";
import { formatarCent } from "@/lib/preco";
import { telefoneArrumado } from "@/lib/telefone";
import { BLOCOS, NOME_REMETENTE, TEXTOS_EN, TEXTOS_LOJA, TEXTOS_PT, type ModeloCliente, type TextoModelo } from "./textos";
import { escreverHtmlEmail } from "./html";
import type { DadosCasa, DadosEmailPedido, ModeloEmail } from "./tipos";

export function escreverEmail(
  modelo: ModeloEmail,
  dados: DadosEmailPedido,
  casa: DadosCasa,
  locale: Locale,
): { assunto: string; texto: string; html: string } {
  const exigePrecos = [
    "criado-confirmado-cliente", "confirmado-cliente", "aceite-cliente", "aceite-loja",
    "reagendado-cliente", "reagendado-loja",
  ].includes(modelo) || (modelo === "criado-loja" && dados.estado === "confirmado");
  // Uma confirmação com montantes incompletos anuncia ao cliente um pedido que ainda não pode seguir.
  if (exigePrecos && (dados.faltamPrecos || dados.linhas.some((linha) => linha.totalCent === null))) {
    throw new Error(`${modelo}: um pedido confirmado tem de ter todas as linhas com preço.`);
  }
  const loja = modelo.endsWith("-loja");
  const lingua = loja ? "pt" : locale;
  const blocos = BLOCOS[lingua];
  const textos: TextoModelo = lingua === "pt" ? TEXTOS_PT[modelo] : TEXTOS_EN[modelo as ModeloCliente];
  const opcoes = { in: tz(FUSO), locale: lingua === "pt" ? pt : enGB };
  // «10h30», como a Andreia escreve e como se diz em Portugal; o inglês fica com «10:30».
  const data = (instante: Date) => format(instante,
    lingua === "pt" ? "EEEE, d 'de' MMMM 'de' yyyy, 'às' HH'h'mm" : "EEEE d MMMM yyyy 'at' HH:mm", opcoes);
  const dataSemAno = (instante: Date) => format(instante,
    lingua === "pt" ? "EEEE, d 'de' MMMM, 'às' HH'h'mm" : "EEEE d MMMM 'at' HH:mm", opcoes);
  const hora = (instante: Date) => format(instante, lingua === "pt" ? "HH'h'mm" : "HH:mm", opcoes);
  const mesmoDia = (a: Date, b: Date) => format(a, "yyyy-MM-dd", opcoes) === format(b, "yyyy-MM-dd", opcoes);
  // A data do levantamento abre a linha debaixo do título («DATA DE LEVANTAMENTO»): começa por maiúscula.
  const maiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase(lingua === "pt" ? "pt-PT" : "en-GB") + texto.slice(1);
  const dataCurta = (instante: Date) => format(instante, "EEE d/M HH:mm", opcoes).replace(".", "");
  const dinheiro = (cent: number) => {
    if (!Number.isSafeInteger(cent) || cent < 0) throw new Error("O dinheiro do email tem de chegar em cêntimos inteiros não negativos.");
    return formatarCent(cent, lingua);
  };
  const obrigatorio = <T,>(valor: T | undefined, campo: string): T => {
    if (valor === undefined || valor === "") throw new Error(`${modelo}: falta ${campo}.`);
    return valor;
  };
  const nomeLinha = (linha: DadosEmailPedido["linhas"][number]) =>
    linha.detalhe ? `${linha.nome} (${linha.detalhe})` : linha.nome;
  const partesLinhas = (paraLoja: boolean, comUnitario: boolean) => dados.linhas.map((linha) => {
    const nome = nomeLinha(linha);
    const quantidade = linha.unidade === "kg"
      ? `${new Intl.NumberFormat(lingua === "pt" ? "pt-PT" : "en-GB", { maximumFractionDigits: 20 }).format(linha.quantidade)} kg`
      : String(linha.quantidade);
    const unitario = linha.precoUnitCent === null ? null : dinheiro(linha.precoUnitCent);
    const inicio = `${quantidade} × ${nome}`;
    if (linha.totalCent === null) return { nome: inicio, valor: paraLoja ? TEXTOS_LOJA.semPreco : blocos.semPreco };
    const total = dinheiro(linha.totalCent);
    if (linha.aoQuilo && unitario !== null) return { nome: `${inicio} (${unitario}/kg)`, valor: total };
    if (paraLoja && comUnitario && unitario !== null && !linha.fixadoAgora) return { nome: `${inicio} — ${unitario}`, valor: total };
    return { nome: inicio, valor: total };
  });
  const linhas = (paraLoja: boolean, comUnitario: boolean) => partesLinhas(paraLoja, comUnitario)
    .map((linha) => `${linha.nome} — ${linha.valor}`).join("\n");
  const temAoQuilo = dados.linhas.some((linha) => linha.aoQuilo);
  const indicativo = temAoQuilo ? blocos.sufixoIndicativo : "";
  const campos: Record<string, string | (() => string)> = {
    referencia: dados.referencia,
    primeiroNome: dados.cliente.nome.trim().split(/\s+/)[0],
    nomeCompleto: dados.cliente.nome,
    email: dados.cliente.email,
    telefoneCliente: telefoneArrumado(dados.cliente.telefone),
    nif: dados.cliente.nif || TEXTOS_LOJA.naoIndicado,
    nomeCasa: casa.nome,
    morada: [casa.morada, casa.localidade].filter(Boolean).join(", "),
    telefoneCasa: casa.telefone,
    levantamento: maiuscula(data(dados.levantamentoEm)),
    dataAssunto: format(dados.levantamentoEm,
      lingua === "pt" ? "EEEE, d 'de' MMMM, HH:mm" : "EEEE d MMMM, HH:mm", opcoes),
    dataCurta: dataCurta(dados.levantamentoEm),
    criado: data(dados.criadoEm),
    anterior: () => maiuscula(data(obrigatorio(dados.levantamentoAnteriorEm, "levantamentoAnteriorEm"))),
    expira: () => data(obrigatorio(dados.expiraEm, "expiraEm")),
    expiraCurta: () => dataCurta(obrigatorio(dados.expiraEm, "expiraEm")),
    aceite: () => data(obrigatorio(dados.aceiteEm, "aceiteEm")),
    reagendado: () => data(obrigatorio(dados.reagendadoEm, "reagendadoEm")),
    linkAceitar: () => obrigatorio(dados.linkAceitar, "linkAceitar"),
    linhas: () => linhas(false, false),
    linhasLoja: () => linhas(true, true),
    linhasLembrete: () => linhas(true, false),
    observacoes: dados.observacoes || TEXTOS_LOJA.naoIndicado,
    valor: () => dinheiro(dados.totalCent),
    indicativo,
    semPrecos: () => dados.linhas.filter((linha) => linha.totalCent === null)
      .map((linha) => nomeLinha(linha)).join(", "),
    estado: dados.estado === "confirmado" ? TEXTOS_LOJA.confirmado : TEXTOS_LOJA.porConfirmar,
    estadoAssunto: () => dados.estado === "confirmado" ? TEXTOS_LOJA.confirmado : preencher(TEXTOS_LOJA.porConfirmarAte),
    levantamentoAssunto: dados.estado === "confirmado" ? ` · ${dataCurta(dados.levantamentoEm)}` : "",
    avisoPrazo: () => dados.estado === "por-confirmar" ? `\n${preencher(TEXTOS_LOJA.avisoPrazo)}` : "",
    pretendida: dados.estado === "por-confirmar" ? TEXTOS_LOJA.pretendida : "",
    fimLoja: dados.estado === "confirmado" ? TEXTOS_LOJA.fimConfirmado : TEXTOS_LOJA.fimPorConfirmar,
    pagamentoLoja: () => preencher(dados.faltamPrecos ? TEXTOS_LOJA.pagamentoIncompleto : TEXTOS_LOJA.pagamento),
    saudacao: () => preencher(blocos.saudacao),
    pagar: blocos.pagar,
    fila: blocos.fila,
    rodape: () => preencher(blocos.rodape),
    rodapePendente: () => preencher(blocos.rodapePendente),
    assinatura: () => preencher(blocos.assinatura),
    nomeRemetente: NOME_REMETENTE,
    blocoIndicativo: temAoQuilo ? `\n\n${blocos.indicativo}` : "",
    total: () => preencher(dados.faltamPrecos ? blocos.totalConhecido : blocos.total),
    mudancas: () => {
      const precos = dados.linhas.filter((linha) => linha.fixadoAgora).map((linha) =>
        `${nomeLinha(linha)}: ${linha.totalCent === null ? blocos.semPreco : dinheiro(linha.totalCent)}`);
      const antes = dados.levantamentoAnteriorEm;
      // No mesmo dia basta a hora («12h00 (em vez das 10h30)»); noutro dia, a data inteira.
      if (antes) precos.push(mesmoDia(antes, dados.levantamentoEm)
        ? preencher(blocos.mudancaHora, { antes: hora(antes), depois: hora(dados.levantamentoEm) })
        : preencher(blocos.mudancaData, { antes: dataSemAno(antes), depois: maiuscula(dataSemAno(dados.levantamentoEm)) }));
      return precos.join("\n");
    },
  };
  function preencher(texto: string, adicionais: Partial<Record<string, string>> = {}): string {
    // Uma só passagem: um nome ou uma observação com chavetas nunca vira um marcador.
    return texto.replace(/\{(\w+)\}/g, (_, chave: string) => {
      const valor = adicionais[chave] ?? campos[chave];
      if (valor === undefined) throw new Error(`Marcador de email desconhecido: ${chave}`);
      return typeof valor === "function" ? valor() : valor;
    });
  }
  const corpo = modelo === "cancelado-cliente" && obrigatorio(dados.canceladoPor, "canceladoPor") === "gerente"
    ? (textos.corpoGerente ?? textos.corpo) : textos.corpo;
  const texto = preencher(corpo);
  return {
    assunto: `${dados.modoDeTeste ? "[TESTE] " : ""}${preencher(textos.assunto)}`,
    texto: `${dados.modoDeTeste ? `${blocos.teste}\n\n` : ""}${texto}`,
    html: escreverHtmlEmail({ corpo, campos, partesLinhas, blocos, dados, casa, lingua }),
  };
}
