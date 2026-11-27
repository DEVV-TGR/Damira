import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GaleriaNatal } from "./GaleriaNatal";
import { VitrineGrelha } from "./VitrineGrelha";

const FOTOS = [
  { ficheiro: "bolachas", chave: "bolachas", larga: true },
  { ficheiro: "montra", chave: "montra" },
  { ficheiro: "bolo-frutos-vermelhos", chave: "boloFrutosVermelhos" },
  { ficheiro: "montra-interior", chave: "montraInterior" },
  { ficheiro: "sortido-laminado", chave: "sortidoLaminado", larga: true },
  { ficheiro: "bolo-cobertura", chave: "boloCobertura" },
  { ficheiro: "pao-sementes", chave: "paoSementes" },
  { ficheiro: "balcao-pao", chave: "balcaoPao", larga: true },
  { ficheiro: "sortido-pastelaria", chave: "sortidoPastelaria" },
  { ficheiro: "tartelete", chave: "tartelete" },
  { ficheiro: "tabuleiro", chave: "tabuleiro" },
  { ficheiro: "sala", chave: "sala", larga: true },
  { ficheiro: "prateleiras-pao", pasta: "fotos", chave: "prateleirasPao" },
  { ficheiro: "decoracao-bolo", pasta: "fotos", chave: "decoracaoBolo" },
];

const FOTOS_NATAL = [
  { ficheiro: "natal-bolo-frutas", chave: "natalBoloFrutas" },
  { ficheiro: "natal-doces", chave: "natalDoces" },
  { ficheiro: "natal-bolo-acucar", chave: "natalBoloAcucar", larga: true },
  { ficheiro: "natal-bolo-cobertura", chave: "natalBoloCobertura" },
  { ficheiro: "natal-mesa", chave: "natalMesa", larga: true },
  { ficheiro: "natal-bolo-fatia", chave: "natalBoloFatia" },
];

export function Natal({ idDaFamilia }: { idDaFamilia: string | null }) {
  const t = useTranslations("cartaz.natal");
  const legendas = useTranslations("cartaz.vitrine.legendas");

  return (
    <section id="cap-natal" className="cap cap--natal" data-capitulo data-sc-act="flow" aria-labelledby="natal">
      <div className="cap__caixa" data-sc-in data-sc-stagger="50">
        <h2 id="natal" className="cap__titulo">{t("titulo")}</h2>
        <p className="cap__texto">{t("texto")}</p>
      </div>
      <GaleriaNatal
        fotos={FOTOS_NATAL.map((foto) => ({
          src: `/vitrine/${foto.ficheiro}.webp`,
          alt: legendas(foto.chave),
          larga: foto.larga ?? false,
        }))}
      />
      {/* O id vem da família que a gerente criou (ver `page.tsx`). O botão
          está sempre à vista, pedido da casa a 27/11: sem a família — em
          local, sem base de dados —, leva à `/encomendas` inteira em vez de
          prometer uma âncora que não existe. */}
      <p className="natal__accao">
        <Link
          href={idDaFamilia ? { pathname: "/encomendas", hash: idDaFamilia } : "/encomendas"}
          className="cap__accao cap__accao--principal"
        >
          {t("encomendar")}
        </Link>
      </p>
    </section>
  );
}

export function Vitrine() {
  const t = useTranslations("cartaz.vitrine");

  return (
    <section
      id="cap-vitrine"
      className="cap cap--vitrine"
      data-capitulo
      data-sc-act="flow"
      aria-labelledby="vitrine"
    >
      <div className="cap__caixa" data-sc-in data-sc-stagger="50">
        <h2 id="vitrine" className="cap__titulo">
          {t("titulo")}
        </h2>
        <p className="cap__texto">{t("texto")}</p>
      </div>

      {/* Seis fotos fecham duas filas no computador. A pedido da casa (#80),
          as restantes aparecem depois de «Ver mais». */}
      <VitrineGrelha
        id="vitrine-grelha"
        fotos={FOTOS.map((foto) => ({
          src: `/${foto.pasta ?? "vitrine"}/${foto.ficheiro}.webp`,
          alt: t(`legendas.${foto.chave}`),
          larga: foto.larga ?? false,
        }))}
        visiveis={6}
        rotuloMais={t("verMais")}
      />

      {/* Dizer de quem são não é cortesia: é o que distingue estas de
          fotografia de banco de imagens, que é o que este sítio recusa. */}
      <p className="cap__nota">{t("credito")}</p>
    </section>
  );
}
