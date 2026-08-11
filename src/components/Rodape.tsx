import { useTranslations } from "next-intl";
import { marca } from "@/data/marca";
import { restaurantes, moradaCompleta, urlDirecoes } from "@/data/restaurantes";
import { URL_ESTUDIO } from "@/lib/site";
import { Marca } from "./Marca";

export function Rodape() {
  const t = useTranslations("rodape");
  const ano = new Date().getFullYear();

  const redes = [
    { href: marca.instagram, rotulo: "Instagram" },
    { href: marca.tiktok, rotulo: "TikTok" },
    { href: marca.facebook, rotulo: "Facebook" },
  ].filter((rede): rede is { href: string; rotulo: string } => rede.href !== null);

  return (
    <footer className="bloco-magenta mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <Marca className="text-4xl" empilhado />

        {restaurantes.map((casa) => (
          <div key={casa.id} className="text-sm leading-relaxed">
            <p className="font-bold uppercase tracking-wide">{casa.nome}</p>
            <a
              href={urlDirecoes(casa)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              {moradaCompleta(casa)}
            </a>
            {casa.telefone && (
              <p>
                <a href={`tel:${casa.telefone.replace(/\s/g, "")}`}>{casa.telefone}</a>
              </p>
            )}
          </div>
        ))}

        <div className="text-sm">
          {redes.length > 0 && (
            <>
              <p className="font-bold uppercase tracking-wide">{t("seguirNos")}</p>
              <ul className="mt-1 space-y-1">
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
            </>
          )}
        </div>
      </div>

      <div className="border-t border-papel/30">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-4 text-xs">
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
