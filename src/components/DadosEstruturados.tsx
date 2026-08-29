import { marca } from "@/data/marca";
import { casa, DIAS_DA_SEMANA } from "@/data/casa";
import { URL_SITE } from "@/lib/site";

/**
 * `schema.org/Bakery` — a casa, uma vez.
 *
 * É o que faz o Google mostrar morada e horário no painel lateral em vez de os
 * adivinhar de agregadores desactualizados. Para uma casa com uma morada só,
 * isso é a diferença entre aparecer na pesquisa local de Ermesinde e não
 * aparecer.
 *
 * ## Porque `Bakery` e não `Restaurant`
 *
 * Porque é o que a casa é. O `Bakery` do schema.org é um subtipo de
 * `FoodEstablishment` e aceita as mesmas propriedades (`servesCuisine`,
 * `hasMenu`, `openingHoursSpecification`), mas diz ao Google que isto é uma
 * pastelaria — e é por "pastelaria em Ermesinde" que alguém procura, não por
 * "restaurante". Ao almoço de fim-de-semana serve pratos; isso faz dela uma
 * pastelaria com cozinha, não um restaurante.
 *
 * ⚠️ **Só entra aqui o que está confirmado.** Um horário inventado propaga-se
 * para fora do site e passa a ser o que o Google mostra a toda a gente — e um
 * horário errado no Google manda gente a uma porta fechada sem que ninguém
 * perceba porquê. A `null` no JSON, a propriedade nem chega a ser escrita.
 *
 * ⚠️ **Um objeto, e nunca um array no topo do bloco.** Herdado do Santo Burga,
 * onde tinha duas casas e um array — e um array não tem `@context`, o que
 * rebentava em leitores que fazem `JSON.parse(bloco)["@context"].toLowerCase()`
 * para normalizar o valor. Aqui só há uma casa, mas a regra fica: se um dia
 * abrir a segunda, são dois `<script>` independentes e não um array.
 */
const DIAS_SCHEMA: Record<string, string> = {
  segunda: "Monday",
  terca: "Tuesday",
  quarta: "Wednesday",
  quinta: "Thursday",
  sexta: "Friday",
  sabado: "Saturday",
  domingo: "Sunday",
};

function dadosDaCasa(descricao: string) {
  const horarios = casa.horarios;

  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: casa.nome,
    description: descricao,
    url: URL_SITE,
    priceRange: "€",
    ...(casa.desde ? { foundingDate: String(casa.desde) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: casa.morada,
      addressLocality: casa.cidade,
      addressCountry: "PT",
      ...(casa.codigoPostal ? { postalCode: casa.codigoPostal } : {}),
      ...(casa.distrito ? { addressRegion: casa.distrito } : {}),
    },
    ...(casa.telefone ? { telephone: casa.telefone } : {}),
    ...(casa.email ? { email: casa.email } : {}),
    ...(horarios
      ? {
          openingHoursSpecification: DIAS_DA_SEMANA.filter(
            (dia) => horarios[dia] !== null,
          ).map((dia) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: DIAS_SCHEMA[dia],
            opens: horarios[dia]!.abre,
            closes: horarios[dia]!.fecha,
          })),
        }
      : {}),
    ...(marca.instagram || marca.tiktok || marca.facebook
      ? {
          sameAs: [marca.instagram, marca.tiktok, marca.facebook].filter(Boolean),
        }
      : {}),
    hasMenu: `${URL_SITE}/ementa`,
  };
}

export function DadosEstruturados({ descricao }: { descricao: string }) {
  return (
    <script
      type="application/ld+json"
      /* Alimentado por `casa.json` e `marca.json`, os dois validados por `zod` e
         sem entrada de utilizador. É o único `dangerouslySetInnerHTML` do site —
         ver o comentário da CSP em `next.config.ts`. */
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dadosDaCasa(descricao)),
      }}
    />
  );
}
