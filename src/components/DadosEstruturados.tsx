import { marca } from "@/data/marca";
import { restaurantes } from "@/data/restaurantes";
import { URL_SITE } from "@/lib/site";

/**
 * `schema.org/Restaurant`, um por casa.
 *
 * É o que faz o Google mostrar morada e horário no painel lateral em vez de o
 * adivinhar de agregadores desactualizados — e, para um restaurante com duas
 * moradas, é o que impede que as duas sejam tomadas por uma só.
 *
 * **Só entra aqui o que está confirmado.** Um `openingHours` inventado propaga-se
 * para fora do site e passa a ser o horário que o Google mostra a toda a gente;
 * a `null` no JSON, a propriedade nem chega a ser escrita.
 */
export function DadosEstruturados({ descricao }: { descricao: string }) {
  const json = restaurantes.map((casa) => ({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: casa.nome,
    description: descricao,
    url: URL_SITE,
    servesCuisine: "Burgers",
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: casa.morada,
      addressLocality: casa.cidade,
      addressCountry: "PT",
      ...(casa.codigoPostal ? { postalCode: casa.codigoPostal } : {}),
    },
    ...(casa.telefone ? { telephone: casa.telefone } : {}),
    ...(marca.instagram || marca.tiktok
      ? { sameAs: [marca.instagram, marca.tiktok].filter(Boolean) }
      : {}),
    hasMenu: `${URL_SITE}/ementa`,
  }));

  return (
    <script
      type="application/ld+json"
      /* Alimentado por `restaurantes.json` e `marca.json`, os dois validados
         por `zod` e sem entrada de utilizador. É o único `dangerouslySetInnerHTML`
         do site — ver o comentário da CSP em `next.config.ts`. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
