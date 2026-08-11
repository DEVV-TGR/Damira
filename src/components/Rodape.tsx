import { useTranslations } from "next-intl";
import { marca } from "@/data/marca";
import { restaurantes, moradaCompleta, urlDirecoes } from "@/data/restaurantes";
import { URL_ESTUDIO } from "@/lib/site";
import { Marca } from "./Marca";

/**
 * O rodapé é o único bloco escuro do site, e é de propósito: numa página toda
 * clara é o que lhe dá chão e diz que acabou. O magenta chapado que aqui esteve
 * antes competia com o herói pelo mesmo papel.
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
    <footer className="mt-[var(--espaco-seccao)] bg-tinta text-papel">
      <div className="envolvente grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <Marca className="text-3xl" empilhado />

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
