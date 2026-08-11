import { useTranslations } from "next-intl";
import { porPao } from "@/data/ementa";
import { Link } from "@/i18n/navigation";

/**
 * O pão rosa e o pão azul.
 *
 * São **dez santos de pão rosa e seis de azul**, e no site eram duas etiquetas
 * de doze pixéis dentro da ementa. É um argumento de venda que se vê da rua — um
 * pão cor-de-rosa numa mesa faz-se fotografar sozinho — e estava escondido.
 *
 * As duas listas saem do campo `paes` em `ementa.json`. Nada aqui é escrito à
 * mão, incluindo o remate: o *Mega Santo* aparece nos dois lados porque leva os
 * dois pães, e é o próprio ficheiro que o diz.
 */
export function Paes() {
  const t = useTranslations("inicio.paes");

  return (
    <section aria-labelledby="paes" className="seccao">
      <div className="envolvente">
        <p className="olho">{t("olho")}</p>
        <h2
          id="paes"
          className="titulo-display mt-4 max-w-[14ch] text-[clamp(2.5rem,6vw,4.5rem)]"
        >
          {t("titulo")}
        </h2>
        <p className="mt-4 max-w-[48ch] text-tinta-suave">{t("texto")}</p>
      </div>

      <div className="mt-14 grid gap-px bg-tinta/10 sm:grid-cols-2">
        {/* O painel do rosa usa o magenta escuro e não o da marca: leva uma lista
            de nomes em corpo pequeno, e o magenta claro não chega aos 4,5:1 —
            ver a tabela de contraste em `globals.css`. */}
        <Painel
          cor="bloco-magenta-texto"
          titulo={t("rosa")}
          santos={porPao("rosa")}
          decoracao="text-papel/25"
        />
        <Painel
          cor="bloco-turquesa"
          titulo={t("azul")}
          santos={porPao("azul")}
          decoracao="text-tinta/20"
        />
      </div>
    </section>
  );
}

function Painel({
  cor,
  titulo,
  santos,
  decoracao,
}: {
  cor: string;
  titulo: string;
  santos: { id: string; nome: string; paes: string[] }[];
  decoracao: string;
}) {
  return (
    <div className={`relative overflow-hidden px-[clamp(1.5rem,4vw,3rem)] py-14 ${cor}`}>
      <span
        aria-hidden
        className={`traco pointer-events-none absolute -bottom-10 -right-10 size-56 ${decoracao}`}
        style={{
          maskImage: "url(/tracos/hamburguer.png)",
          WebkitMaskImage: "url(/tracos/hamburguer.png)",
        }}
      />

      <div className="relative">
        <h3 className="titulo-display text-3xl">{titulo}</h3>
        <p className="mt-2 text-sm opacity-70">{santos.length}</p>

        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
          {santos.map((santo) => (
            <li key={santo.id}>
              <Link
                href={`/ementa#${santo.id}`}
                className="text-lg underline decoration-current/40 underline-offset-4 hover:decoration-current"
              >
                {santo.nome}
              </Link>
              {/* Quem leva os dois pães aparece nos dois painéis, e leva a marca
                  nos dois — é o remate da secção e sai do próprio ficheiro. */}
              {santo.paes.length === 2 && (
                <span aria-hidden className="ml-1.5 align-super text-xs opacity-70">
                  ★
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
