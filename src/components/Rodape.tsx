import { useTranslations } from "next-intl";
import { marca } from "@/data/marca";
import {
  casa,
  moradaCompleta,
  urlDirecoes,
  telefoneMarcavel,
} from "@/data/casa";
import { URL_ESTUDIO } from "@/lib/site";

/**
 * O rodapé é o chão do site: numa página clara é o que diz que acabou. Partilha
 * a tinta com o fecho, e os dois leem-se como um bloco só.
 *
 * ⚠️ **A marca não está aqui.** O fecho mostra-a em grande, a dois centímetros
 * de distância; repeti-la logo por baixo não a reforça, mostra que ninguém
 * compôs o fim da página. Está no cabeçalho de todas as páginas, e a linha do
 * copyright escreve-lhe o nome. O que aqui vive é o que se **procura** — morada,
 * telefone, correio.
 *
 * ⚠️ **Sem margem por cima.** Como a margem mostra o fundo do `body`, isso abria
 * uma faixa de papel entre dois blocos escuros. O espaço que falta é dado por
 * quem vem antes — o `.seccao` já traz `padding-block`.
 */
export function Rodape() {
  const t = useTranslations("rodape");
  const ano = new Date().getFullYear();
  const telefone = telefoneMarcavel();

  const redes = [
    { href: marca.instagram, rotulo: "Instagram" },
    { href: marca.tiktok, rotulo: "TikTok" },
    { href: marca.facebook, rotulo: "Facebook" },
  ].filter((rede): rede is { href: string; rotulo: string } => rede.href !== null);

  return (
    <footer className="bg-tinta text-papel">
      <div className="envolvente grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-3">
        <div className="text-sm leading-relaxed">
          <p className="text-xs font-semibold uppercase tracking-widest text-papel/60">
            {casa.cidade}
          </p>
          <a
            href={urlDirecoes()}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block underline decoration-tijolo decoration-2 underline-offset-4"
          >
            {moradaCompleta()}
          </a>
        </div>

        <div className="text-sm leading-relaxed">
          <p className="text-xs font-semibold uppercase tracking-widest text-papel/60">
            {t("falarConnosco")}
          </p>
          {telefone && (
            <a href={telefone} className="alvo-toque mt-2 block">
              {casa.telefone}
            </a>
          )}
          {casa.email && (
            <a href={`mailto:${casa.email}`} className="alvo-toque mt-1 block break-all">
              {casa.email}
            </a>
          )}
        </div>

        {/* ⚠️ Enquanto não houver endereços de redes confirmados, esta coluna
            não aparece de todo — e é o comportamento certo. Um cabeçalho
            "Seguir" sozinho, sem nada por baixo, é pior do que a sua ausência.
            Ver `marca.json`. */}
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
