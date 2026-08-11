import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./restaurantes.json";

/**
 * As duas casas — Porto e Leça da Palmeira. Fonte única: o rodapé, a secção das
 * casas na homepage e os dados estruturados leem todos daqui.
 *
 * **A ordem do array é a ordem em que aparecem no site.** O Porto vem primeiro
 * por ser a casa da cidade e a que mais gente procura por nome; Leça vem a
 * seguir, e é a que tem a esplanada.
 *
 * ⚠️ **Os campos a `null` não são esquecimento — são o que ainda não se
 * confirmou.** Um campo a `null` desaparece do site em vez de aparecer vazio,
 * que é o comportamento certo: mais vale não dizer o horário do que mandar
 * alguém a uma porta fechada. Ver a lista *Antes de publicar* no README.
 */

const Horario = z
  .object({ abre: z.string().regex(/^\d{2}:\d{2}$/), fecha: z.string().regex(/^\d{2}:\d{2}$/) })
  /** `null` num dia é **encerrado**, e o site escreve-o com todas as letras. */
  .nullable();

const EsquemaRestaurante = z.object({
  id: z.enum(["porto", "leca"]),
  nome: z.string().min(1),
  cidade: z.string().min(1),
  /** Rua e número. Chega para o botão de direções — ver `urlDirecoes`. */
  morada: z.string().min(1),
  codigoPostal: z
    .string()
    .regex(/^\d{4}-\d{3}$/, "formato 0000-000")
    .nullable(),
  telefone: z.string().nullable(),
  /**
   * `null` no objeto inteiro significa **ainda não confirmado** e esconde a
   * secção; `null` num dia significa **encerrado nesse dia**. São duas coisas
   * diferentes e é de propósito que se distinguem.
   */
  horarios: z
    .object({
      segunda: Horario,
      terca: Horario,
      quarta: Horario,
      quinta: Horario,
      sexta: Horario,
      sabado: Horario,
      domingo: Horario,
    })
    .nullable(),
  /** Caminhos a partir de `public/`. A primeira é a capa do bloco da casa. */
  fotos: z.array(z.string().startsWith("/casas/")),
  /**
   * Uma loja por casa e por plataforma — o Uber Eats tem endereços distintos
   * para a Constituição e para Leça, e mandar quem está em Leça para a loja do
   * Porto é mandá-lo esperar por uma entrega que não vem.
   *
   * O Glovo e o Bolt Food estão no menu impresso mas ainda sem endereço
   * confirmado: a `null` o botão simplesmente não aparece, que é melhor do que
   * um link adivinhado que dá 404.
   */
  entregas: z.object({
    uberEats: z.url().nullable(),
    glovo: z.url().nullable(),
    boltFood: z.url().nullable(),
  }),
});

export type Restaurante = z.infer<typeof EsquemaRestaurante>;
export type DiaDaSemana = keyof NonNullable<Restaurante["horarios"]>;

export const DIAS_DA_SEMANA = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

const resultado = z.array(EsquemaRestaurante).length(2).safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/restaurantes.json", resultado.error, dados);
}

export const restaurantes: Restaurante[] = resultado.data;

export const restaurantePorId = (id: string) =>
  restaurantes.find((casa) => casa.id === id);

/** "Rua Egas Moniz 490, 4050-232 Porto" — sem código postal enquanto não houver. */
export const moradaCompleta = (casa: Restaurante) =>
  [casa.morada, [casa.codigoPostal, casa.cidade].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

/**
 * O botão de direções abre o Google Maps numa **pesquisa pela morada**, e não
 * num par de coordenadas.
 *
 * É de propósito, e poupa um campo de dados: a pesquisa por morada acerta
 * sempre e é o que o Maps faz melhor, enquanto umas coordenadas mal copiadas
 * põem o visitante a 200 metros do sítio sem ninguém dar por isso. Também evita
 * embeber um `<iframe>` do Maps, que arrastava terceiros e consentimento de
 * cookies atrás — ver o comentário da CSP em `next.config.ts`.
 */
export const urlDirecoes = (casa: Restaurante) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${casa.nome}, ${moradaCompleta(casa)}`,
  )}`;
