import type { Artigo } from "@/data/ementa";

/**
 * ⚠️ **Tira acentos e maiúsculas antes de comparar.**
 *
 * Quem escreve num telemóvel não põe acentos. Uma procura por "pao" que não
 * encontra *Pão da Aldeia*, ou "cafe" que não encontra *Café*, está avariada aos
 * olhos de quem a usou — e numa ementa portuguesa isso é metade dos artigos.
 *
 * O `NFD` separa a letra do acento e o intervalo `̀-ͯ` apaga os
 * acentos que ficaram soltos. É o mesmo que o resto do sítio faz para gerar
 * identificadores.
 */
export const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Um artigo corresponde à procura se o termo aparecer no nome, na descrição ou
 * nos sabores — **nas duas línguas ao mesmo tempo**.
 *
 * Filtrar só a língua activa era esconder metade da informação que já está
 * carregada: um inglês que escreva "chocolate" tem de acertar no artigo cujo
 * nome português é *Chocolate do Dubai*, e um português que escreva "cookie"
 * tem de acertar no nome inglês. São dados que temos à mão nos dois idiomas.
 */
export function correspondeArtigo(artigo: Artigo, termo: string): boolean {
  const t = normalizar(termo);
  if (t.length === 0) return true;

  const campos = [
    artigo.nome,
    artigo.nomeEn,
    artigo.descricao?.pt,
    artigo.descricao?.en,
    ...artigo.sabores,
  ];

  return campos.some((campo) => campo && normalizar(campo).includes(t));
}

/** O filtro completo: a procura e o interruptor do vegan, numa função só. */
export const filtrarArtigos = (
  artigos: Artigo[],
  termo: string,
  soVegan: boolean,
): Artigo[] =>
  artigos.filter(
    (artigo) =>
      (!soVegan || artigo.vegan) && correspondeArtigo(artigo, termo),
  );
