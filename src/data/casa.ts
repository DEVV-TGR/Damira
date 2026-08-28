import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./casa.json";

/**
 * A casa. Fonte única: o rodapé, a secção de contactos, os dados estruturados e
 * o botão de direções leem todos daqui.
 *
 * ## Porque é um objeto e não uma lista
 *
 * O Santo Burga, de onde este site vem, tinha duas casas e uma lista. A Damira
 * tem **uma** — a de Ermesinde, aberta em 1996 —, e uma lista de um elemento
 * obriga cada página a fazer `restaurantes[0]` ou a mapear uma lista que nunca
 * dá mais do que uma volta. No dia em que abrir a segunda, isto volta a ser um
 * array; até lá, o modelo diz a verdade.
 *
 * ⚠️ **Os campos a `null` não são esquecimento — são o que ainda não se
 * confirmou.** Um campo a `null` desaparece do site em vez de aparecer vazio,
 * que é o comportamento certo: mais vale não dizer nada do que mandar alguém a
 * uma porta fechada. Ver a lista *Antes de publicar* no README.
 */

const Horario = z
  .object({
    abre: z.string().regex(/^\d{2}:\d{2}$/),
    fecha: z.string().regex(/^\d{2}:\d{2}$/),
  })
  /** `null` num dia é **encerrado**, e o site escreve-o com todas as letras. */
  .nullable();

const EsquemaCasa = z.object({
  nome: z.string().min(1),
  cidade: z.string().min(1),
  /** Rua e número. Chega para o botão de direções — ver `urlDirecoes`. */
  morada: z.string().min(1),
  codigoPostal: z
    .string()
    .regex(/^\d{4}-\d{3}$/, "formato 0000-000")
    .nullable(),
  distrito: z.string().min(1).nullable(),
  telefone: z.string().nullable(),
  email: z.email().nullable(),
  /**
   * O ano do "desde 1996" que está no logótipo. É facto, é argumento e aparece
   * em dois sítios (a assinatura e os dados estruturados) — por isso é um campo
   * e não um número escrito à mão nas mensagens, onde uma das duas línguas
   * ficaria para trás.
   */
  desde: z.number().int().min(1800).max(2100),
  /**
   * `null` no objeto inteiro significa **ainda não confirmado** e esconde a
   * secção; `null` num dia significa **encerrado nesse dia**. São duas coisas
   * diferentes e é de propósito que se distinguem.
   *
   * ⚠️ O horário de 07:00–21:00 vem do cartão de contactos da casa e **está por
   * confirmar dia a dia** — em particular o domingo. Ver o README.
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
  fotos: z.array(z.string().startsWith("/casa/")),
  /**
   * As plataformas de entrega. O Bolt Food está confirmado — o endereço veio da
   * própria casa; o Uber Eats e o Glovo ficam a `null` até haver loja mesmo.
   *
   * A `null` o botão simplesmente não aparece, que é melhor do que um link
   * adivinhado que dá 404 a quem tem fome.
   */
  entregas: z.object({
    uberEats: z.url().nullable(),
    glovo: z.url().nullable(),
    boltFood: z.url().nullable(),
  }),
});

export type Casa = z.infer<typeof EsquemaCasa>;
export type DiaDaSemana = keyof NonNullable<Casa["horarios"]>;

export const DIAS_DA_SEMANA = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

const resultado = EsquemaCasa.safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/casa.json", resultado.error, dados);
}

export const casa: Casa = resultado.data;

/** "Rua Dom António Castro Meireles 155, 4445-397 Ermesinde" */
export const moradaCompleta = () =>
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
export const urlDirecoes = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${casa.nome}, ${moradaCompleta()}`,
  )}`;

/** O telefone em formato marcável: `tel:+351229730939`. */
export const telefoneMarcavel = () =>
  casa.telefone ? `tel:${casa.telefone.replace(/\s/g, "")}` : null;

/**
 * Os dias agrupados por horário igual, pela ordem da semana.
 *
 * Existe porque a casa abre os sete dias à mesma hora, e sete linhas iguais
 * numa tabela de horários é ruído: quem olha quer ler "todos os dias, 7h–21h" e
 * seguir caminho. No dia em que o domingo for diferente — e é o candidato — a
 * função parte o grupo sozinha, sem ninguém ter de reescrever a tabela.
 */
export const horariosAgrupados = () => {
  if (!casa.horarios) return null;

  const grupos: { dias: DiaDaSemana[]; horario: { abre: string; fecha: string } | null }[] = [];

  for (const dia of DIAS_DA_SEMANA) {
    const horario = casa.horarios[dia];
    const ultimo = grupos.at(-1);
    const igual =
      ultimo &&
      ultimo.horario?.abre === horario?.abre &&
      ultimo.horario?.fecha === horario?.fecha;

    if (igual) ultimo.dias.push(dia);
    else grupos.push({ dias: [dia], horario });
  }

  return grupos;
};
