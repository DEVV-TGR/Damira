import type { Artigo, Categoria } from "@/data/ementa";

/**
 * Fotografia de recurso para artigos que ainda não têm a sua.
 *
 * ## Porque isto existe e porque é temporário
 *
 * O Santo Burga não tem — ou não nos deu — fotografia por prato. As dez imagens
 * em `public/comida/` são **fotografia de marca**: sabe-se que são, porque as
 * mesmas aparecem nas páginas das duas casas. Uma foto ao lado de um preço é uma
 * promessa, e nenhuma destas pode prometer ser *aquele* hambúrguer.
 *
 * ⚠️ **Por isso não estão escritas no `ementa.json`.** Se lá estivessem, daqui a
 * três meses ninguém distinguia uma fotografia provisória de uma real, e o aviso
 * de "imagem ilustrativa" ficava a mentir a metade da carta. A separação é toda
 * a ideia:
 *
 * - `artigo.foto` significa **a fotografia deste prato**, e hoje é `null` nos 122.
 *   É o campo que o cliente preenche.
 * - Este módulo devolve uma imagem de marca **só quando `foto` é `null`**, e
 *   marca-a como ilustrativa.
 * - A interface mostra o aviso apenas quando `ilustrativa` é `true`.
 *
 * No dia em que a fotografia real de um santo entrar no JSON, o aviso desaparece
 * sozinho **nesse artigo**. O andaime apaga-se sem ninguém se lembrar dele.
 */

const HAMBURGUERES = [
  "/comida/01.webp",
  "/comida/02.webp",
  "/comida/03.webp",
  "/comida/04.webp",
];
const ENTRADAS = ["/comida/05.webp", "/comida/07.webp"];
const SALADAS = ["/comida/06.webp"];
const SOBREMESAS = ["/comida/08.webp", "/comida/09.webp"];
const BEBIDAS = ["/comida/10.webp"];

/**
 * A reserva é escolhida **por família**, não à sorte: uma sobremesa com foto de
 * hambúrguer seria ilustrativa e errada ao mesmo tempo.
 *
 * `vegetariano-saladas` leva a salada, e é a escolha conservadora: a categoria
 * mistura três hambúrgueres vegetarianos com três saladas e não há campo que os
 * separe. Uma salada ao lado de um hambúrguer vegetariano engana pouco; um
 * hambúrguer de novilho ao lado de uma salada de frango engana muito.
 *
 * `aperitivos` são caipirinhas e gin — vão para a reserva das bebidas.
 *
 * Sem entrada aqui (`extras`), não há fotografia nenhuma: uma dose de cebola
 * frita não precisa de retrato.
 */
const RESERVAS: Partial<Record<Categoria, string[]>> = {
  aperitivos: BEBIDAS,
  entradas: ENTRADAS,
  "santos-novilho": HAMBURGUERES,
  "carnes-maturadas": HAMBURGUERES,
  "para-os-corajosos": HAMBURGUERES,
  "santos-frango": HAMBURGUERES,
  "outros-santos": HAMBURGUERES,
  "vegetariano-saladas": SALADAS,
  "menu-infantil": HAMBURGUERES,
  sobremesas: SOBREMESAS,
  bebidas: BEBIDAS,
};

/**
 * Um número estável a partir do `id`.
 *
 * Tem de ser estável — e não `Math.random()` — para o mesmo santo levar sempre a
 * mesma imagem. Sem isso, a foto mudava entre o cartão da homepage e o painel da
 * ementa, e o site parecia estar a inventar.
 */
function semente(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) {
    n = (n * 31 + id.charCodeAt(i)) >>> 0;
  }
  return n;
}

export type FotoDeArtigo = { src: string; ilustrativa: boolean };

/** `null` quando não há fotografia nem reserva — o chamador desenha outra coisa. */
export function fotoDoArtigo(artigo: Artigo): FotoDeArtigo | null {
  if (artigo.foto) return { src: artigo.foto, ilustrativa: false };

  const reserva = RESERVAS[artigo.categoria];
  if (!reserva || reserva.length === 0) return null;

  return {
    src: reserva[semente(artigo.id) % reserva.length],
    ilustrativa: true,
  };
}
