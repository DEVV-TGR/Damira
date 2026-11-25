import { EsquemaOpcoesBolo, type OpcoesBolo } from "@/lib/dados/tipos";
import { erroDeFicheiro } from "./erros";
import dados from "./bolos-personalizados.json";

/**
 * # As opções do bolo personalizado, como a casa as deu
 *
 * Saem do PDF «Bolos Personalizados» da Damira (novembro de 2026): 21 massas e
 * as coberturas que cada uma leva, 42 recheios, 24 «à volta» e 32 toppings —
 * estes três com todas as coberturas. É a **lista positiva** de
 * `bolos-personalizados.md`: o que não está marcado, a casa não faz.
 *
 * ⚠️ **Substitui o `bolos.json` para o configurador.** Esse é mais antigo (tem
 * 25 «coberturas» que no PDF passaram a recheios e toppings) e fica só para os
 * textos da página inicial, até alguém os rever.
 *
 * ⚠️ **Os tamanhos estão vazios** até a casa os dar: sem eles, o bolo é só
 * «sob orçamento», sem «a partir de». A gerente preenche-os no painel.
 *
 * É o ponto de partida dos JSON (e da migração, quando houver tabela). Lê-se
 * **só** pela fronteira (`src/lib/dados/`), como os outros dados.
 */
const resultado = EsquemaOpcoesBolo.safeParse(dados);

if (!resultado.success) {
  throw erroDeFicheiro("src/data/bolos-personalizados.json", resultado.error, dados);
}

export const OPCOES_BOLO: OpcoesBolo = resultado.data;
