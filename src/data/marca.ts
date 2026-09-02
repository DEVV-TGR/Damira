import { z } from "zod";
import dados from "./marca.json";

/**
 * Factos sobre a marca — nome e redes. É a fonte única do header, do rodapé e
 * dos dados estruturados.
 *
 * O que **não** vive aqui: textos. Uma frase de assinatura é copy e vive nas
 * mensagens, nas duas línguas; aqui só entra o que é facto e igual em qualquer
 * língua. A regra evita o caso clássico de haver duas versões da mesma frase,
 * uma no JSON e outra nas traduções, e ninguém saber qual é a boa.
 */
const EsquemaMarca = z.object({
  /**
   * O nome completo, como está na placa da porta: "Confeitaria e Pão Quente
   * Damira". É o que vai para as `metadata`, para os dados estruturados e para
   * o copyright — os sítios onde o nome é uma identificação legal e não uma
   * etiqueta.
   */
  nome: z.string().min(1),
  /**
   * Como a casa é tratada por quem lá vai.
   *
   * ⚠️ **Existe porque o nome completo tem trinta caracteres** e não cabe em
   * metade dos sítios onde um nome aparece — um `aria-label`, uma frase de
   * copy, a assinatura de um email. Escrever "Damira" à mão nesses sítios era o
   * caminho para o dia em que a casa muda de nome e sobram sete versões
   * espalhadas pelo código.
   */
  nomeCurto: z.string().min(1),
  instagram: z.url().nullable(),
  instagramUtilizador: z.string().startsWith("@").nullable(),
  tiktok: z.url().nullable(),
  facebook: z.url().nullable(),
  email: z.email().nullable(),
});

export type Marca = z.infer<typeof EsquemaMarca>;

const resultado = EsquemaMarca.safeParse(dados);

if (!resultado.success) {
  throw new Error(
    `src/data/marca.json inválido:\n${z.prettifyError(resultado.error)}`,
  );
}

export const marca: Marca = resultado.data;
