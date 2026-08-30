"use server";

import { getTranslations } from "next-intl/server";
import {
  EsquemaPedido,
  corpoDoPedido,
  DESTINO_PEDIDOS,
  REMETENTE_PEDIDOS,
  type Pedido,
} from "@/lib/pedidos";
import { casa } from "@/data/casa";

/**
 * O que a página recebe de volta depois de submeter.
 *
 * `estado: "sem-servico"` não é um erro — é o caso em que o site **não tem
 * serviço de email configurado** e devolve o pedido escrito para a pessoa o
 * enviar do seu próprio correio. Ver `enviarPedido`.
 */
export type Resultado =
  | { estado: "inicial" }
  | { estado: "enviado" }
  | { estado: "sem-servico"; assunto: string; corpo: string; destino: string }
  | { estado: "erro"; campos: Record<string, string>; geral?: string };

/**
 * Recebe o pedido, valida-o e envia-o por email.
 *
 * ## Porque uma Server Action e não um Route Handler
 *
 * Porque o formulário funciona **sem JavaScript**: um `<form action={...}>` com
 * uma Server Action é submetido pelo browser como um POST normal quando o React
 * ainda não hidratou. Um Route Handler exigia `fetch` do lado do cliente, e
 * quem chegasse com a rede lenta ficava com um botão que não faz nada.
 *
 * ## Porque o envio é `fetch` e não uma biblioteca
 *
 * O serviço de email é uma chamada HTTP com um JSON de quatro campos. Uma
 * dependência para isso são mais um pacote na árvore, mais uma superfície para
 * actualizar e mais uma coisa que pode partir num `npm install` — para poupar
 * dez linhas. Ver o `package.json`: este projeto tem seis dependências.
 */
export async function enviarPedido(
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const t = await getTranslations("encomendas.formulario");

  const bruto = {
    tipo: dados.get("tipo"),
    nome: dados.get("nome"),
    email: dados.get("email") ?? "",
    telefone: dados.get("telefone") ?? "",
    data: dados.get("data"),
    pessoas: dados.get("pessoas") || null,
    detalhe: dados.get("detalhe"),
    consentimento: dados.get("consentimento") === "sim",
    armadilha: dados.get("armadilha") ?? "",
  };

  const validado = EsquemaPedido.safeParse(bruto);

  if (!validado.success) {
    /* A armadilha falha como qualquer outro campo, mas **não se diz porquê** —
       e nem sequer se devolve erro: para o robô, o pedido foi aceite. Dizer-lhe
       que foi apanhado é ensiná-lo a contornar. */
    if (String(bruto.armadilha).length > 0) return { estado: "enviado" };

    const campos: Record<string, string> = {};
    for (const problema of validado.error.issues) {
      const campo = String(problema.path[0] ?? "geral");
      /* Só o primeiro erro de cada campo: dois avisos por baixo da mesma caixa
         não ajudam ninguém a corrigi-la. */
      campos[campo] ??= t(`erros.${problema.message}`);
    }
    return { estado: "erro", campos };
  }

  const pedido: Pedido = validado.data;

  const rotulos = Object.fromEntries(
    (["festa", "bolo", "box", "outro"] as const).map((tipo) => [
      tipo,
      t(`tipos.${tipo}`),
    ]),
  );

  const assunto = t("assunto", { nome: pedido.nome, data: pedido.data });
  const corpo = corpoDoPedido(pedido, rotulos);
  const chave = process.env.RESEND_API_KEY?.trim();

  /**
   * ⚠️ **Sem chave configurada, o pedido não se perde.**
   *
   * A alternativa preguiçosa era rebentar com "erro ao enviar" e deixar a
   * pessoa a olhar para um formulário que escreveu duas vezes. Em vez disso, o
   * pedido volta **já escrito** para ela o enviar do seu próprio email — que é
   * o que ela faria de qualquer maneira, e agora sem ter de resumir nada.
   *
   * É também o estado em que a demonstração vive até alguém pôr a chave no
   * painel da Vercel, e por isso tem de ser um caminho digno e não uma avaria.
   */
  if (!chave) {
    return { estado: "sem-servico", assunto, corpo, destino: DESTINO_PEDIDOS };
  }

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${casa.nome} <${REMETENTE_PEDIDOS}>`,
        to: [DESTINO_PEDIDOS],
        /* Responder ao email abre uma resposta para quem encomendou, e não para
           o remetente técnico. É uma linha, e é a diferença entre responder e
           ter de copiar o endereço à mão. */
        ...(pedido.email ? { reply_to: pedido.email } : {}),
        subject: assunto,
        text: corpo,
      }),
    });

    if (!resposta.ok) {
      /* O corpo do erro fica no registo do servidor e **não vai para o ecrã**:
         traz detalhes da conta e da chave que não são para mostrar a quem está
         a encomendar um bolo. */
      console.error(
        `[pedidos] o serviço de email recusou (${resposta.status}):`,
        await resposta.text(),
      );
      return { estado: "sem-servico", assunto, corpo, destino: DESTINO_PEDIDOS };
    }

    return { estado: "enviado" };
  } catch (erro) {
    console.error("[pedidos] falha a contactar o serviço de email:", erro);
    return { estado: "sem-servico", assunto, corpo, destino: DESTINO_PEDIDOS };
  }
}
