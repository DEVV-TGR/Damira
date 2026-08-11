import { marca } from "@/data/marca";
import { restaurantes, type Restaurante } from "@/data/restaurantes";
import { URL_SITE } from "@/lib/site";

/**
 * `schema.org/Restaurant`, um por casa.
 *
 * É o que faz o Google mostrar morada e horário no painel lateral em vez de o
 * adivinhar de agregadores desactualizados — e, para um restaurante com duas
 * moradas, é o que impede que as duas sejam tomadas por uma só.
 *
 * ## Um `<script>` por casa, e não um array com as duas
 *
 * ⚠️ Isto **já rebentou uma vez**, em Safari:
 *
 * ```
 * undefined is not an object (evaluating 'r["@context"].toLowerCase')
 * ```
 *
 * A causa era um array no topo do bloco — `[{…}, {…}]`. Um array não tem
 * `@context`, e quem lê dados estruturados costuma fazer
 * `JSON.parse(bloco)["@context"].toLowerCase()` para normalizar o valor; com um
 * array à frente, isso é `undefined.toLowerCase()`. O leitor era uma extensão do
 * browser e não o Next — mas o array era nosso, e a fragilidade também.
 *
 * Dois blocos independentes, cada um um objeto completo, não têm essa aresta: o
 * Google aceita vários blocos por página e cada um traz o seu `@context` e o seu
 * `@type`. A alternativa era um objeto só com `@graph`, que também resolvia o
 * `@context` — mas deixa o topo sem `@type`, e há consumidores que também lhe
 * pegam.
 *
 * **Só entra aqui o que está confirmado.** Um `openingHours` inventado propaga-se
 * para fora do site e passa a ser o horário que o Google mostra a toda a gente;
 * a `null` no JSON, a propriedade nem chega a ser escrita.
 */
function dadosDaCasa(casa: Restaurante, descricao: string) {
  return {
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
  };
}

export function DadosEstruturados({ descricao }: { descricao: string }) {
  return (
    <>
      {restaurantes.map((casa) => (
        <script
          key={casa.id}
          type="application/ld+json"
          /* Alimentado por `restaurantes.json` e `marca.json`, os dois validados
             por `zod` e sem entrada de utilizador. É o único
             `dangerouslySetInnerHTML` do site — ver o comentário da CSP em
             `next.config.ts`. */
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(dadosDaCasa(casa, descricao)),
          }}
        />
      ))}
    </>
  );
}
