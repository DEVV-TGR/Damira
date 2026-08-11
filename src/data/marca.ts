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
  nome: z.string().min(1),
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
