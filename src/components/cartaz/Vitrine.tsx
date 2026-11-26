import { useTranslations } from "next-intl";
import { VitrineGrelha } from "./VitrineGrelha";

/** A ordem intercala a montra, a padaria e a pastelaria. As fotos de Natal
 * ficam juntas no fim para a primeira grelha mostrar a oferta habitual.
 */
const FOTOS = [
  { ficheiro: "montra-panoramica", chave: "montraPanoramica", larga: true },
  { ficheiro: "montra", chave: "montra" },
  { ficheiro: "bolo-frutos-vermelhos", chave: "boloFrutosVermelhos" },
  { ficheiro: "sortido-laminado", chave: "sortidoLaminado" },
  { ficheiro: "bolachas", chave: "bolachas", larga: true },
  { ficheiro: "montra-interior", chave: "montraInterior" },
  { ficheiro: "bolo-cobertura", chave: "boloCobertura" },
  { ficheiro: "pao-sementes", chave: "paoSementes" },
  { ficheiro: "balcao-pao", chave: "balcaoPao", larga: true },
  { ficheiro: "sortido-pastelaria", chave: "sortidoPastelaria" },
  { ficheiro: "tartelete", chave: "tartelete" },
  { ficheiro: "tabuleiro", chave: "tabuleiro" },
  { ficheiro: "sala", chave: "sala" },
  { ficheiro: "natal-bolo-frutas", chave: "natalBoloFrutas" },
  { ficheiro: "natal-doces", chave: "natalDoces" },
  { ficheiro: "natal-bolo-acucar", chave: "natalBoloAcucar", larga: true },
  { ficheiro: "natal-bolo-cobertura", chave: "natalBoloCobertura" },
  { ficheiro: "natal-mesa", chave: "natalMesa", larga: true },
  { ficheiro: "natal-bolo-fatia", chave: "natalBoloFatia" },
];

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
        <p className="cap__olho">
          <span className="cap__numeral">{t("numeral")}</span> {t("olho")}
        </p>
        <h2 id="vitrine" className="cap__titulo">
          {t("titulo")}
        </h2>
        <p className="cap__texto">{t("texto")}</p>
      </div>

      {/* Seis fotos fecham duas filas no computador. A pedido da casa (#80),
          as restantes aparecem depois de «Ver mais». */}
      <VitrineGrelha
        fotos={FOTOS.map((foto) => ({
          ficheiro: foto.ficheiro,
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
