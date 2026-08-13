import { useTranslations } from "next-intl";
import { marca } from "@/data/marca";
import { restaurantes, moradaCompleta, urlDirecoes } from "@/data/restaurantes";
import { URL_ESTUDIO } from "@/lib/site";

/**
 * O rodapé é o chão do site: numa página clara é o que diz que acabou. O magenta
 * chapado que aqui esteve antes competia com o herói pelo mesmo papel — e hoje o
 * magenta chapado é mesmo só do herói.
 *
 * **Não é o único bloco escuro**, ao contrário do que este comentário dizia
 * durante um tempo. Na homepage é o terceiro andar de um chão que começa no
 * fecho e passa pela fita dos santos — os três na mesma tinta, de propósito,
 * para o fim da página se ler de uma vez. Há ainda a escalada, a meio, e as
 * notas da carta na ementa; e essa era a razão do defeito a seguir.
 *
 * ⚠️ **A marca saiu daqui.** Estava numa quarta coluna, empilhada e a `text-3xl`.
 * Na homepage isso punha-a **duas vezes no mesmo bloco escuro**, a dois centímetros
 * de distância e quase do mesmo tamanho: o fecho mostra-a em grande — é a única
 * vez em todo o site — e o rodapé repetia-a logo por baixo, com a fita dos santos
 * a fazer de intervalo. Repetir uma marca a essa distância não a reforça, mostra
 * que ninguém compôs o fim da página.
 *
 * O rodapé não fica sem ela: está no cabeçalho de todas as páginas, e a linha do
 * copyright escreve-lhe o nome. O que aqui vive é o que se **procura** — moradas,
 * telefone, redes.
 *
 * ⚠️ **Sem margem por cima.** Tinha `mt-[var(--espaco-seccao)]`, e como a margem
 * mostra o fundo do `body`, isso abria **uma faixa de papel entre dois blocos
 * escuros** nas duas páginas: entre as notas da carta e o rodapé, na ementa, e
 * entre a fita dos santos e o rodapé, na homepage. O espaço que falta é dado por
 * quem vem antes — o `.seccao` já traz `padding-block`.
 */
export function Rodape() {
  const t = useTranslations("rodape");
  const ano = new Date().getFullYear();

  const redes = [
    { href: marca.instagram, rotulo: "Instagram" },
    { href: marca.tiktok, rotulo: "TikTok" },
    { href: marca.facebook, rotulo: "Facebook" },
  ].filter((rede): rede is { href: string; rotulo: string } => rede.href !== null);

  return (
    <footer className="bg-tinta text-papel">
      <div className="envolvente grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {restaurantes.map((casa) => (
          <div key={casa.id} className="text-sm leading-relaxed">
            <p className="text-xs font-semibold uppercase tracking-widest text-papel/60">
              {casa.cidade}
            </p>
            <a
              href={urlDirecoes(casa)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block underline decoration-magenta decoration-2 underline-offset-4"
            >
              {moradaCompleta(casa)}
            </a>
            {casa.telefone && (
              <a
                href={`tel:${casa.telefone.replace(/\s/g, "")}`}
                className="mt-1 block"
              >
                {casa.telefone}
              </a>
            )}
          </div>
        ))}

        {redes.length > 0 && (
          <div className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-papel/60">
              {t("seguirNos")}
            </p>
            <ul className="mt-2 space-y-1">
              {redes.map((rede) => (
                <li key={rede.rotulo}>
                  <a
                    href={rede.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {rede.rotulo}
                  </a>
                </li>
              ))}
            </ul>
            {marca.instagramUtilizador && (
              <p className="mt-3 text-papel/60">{marca.instagramUtilizador}</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-papel/15">
        <div className="envolvente flex flex-wrap justify-between gap-2 py-5 text-xs text-papel/70">
          <p>
            © {ano} {marca.nome}. {t("direitos")}
          </p>
          <p>
            {t("feitoPor")}{" "}
            <a
              href={URL_ESTUDIO}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              {t("estudio")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
