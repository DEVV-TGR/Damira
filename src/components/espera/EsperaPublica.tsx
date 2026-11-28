import Imagem from "next/image";
import { useTranslations } from "next-intl";
import { ImagensDoDestino } from "./ImagensDoDestino";
import "./espera.css";

export function EsperaPublica() {
  const t = useTranslations("espera");

  return (
    <>
      <ImagensDoDestino />
      <div className="espera-publica" role="status">
        <div>
          <Imagem
            unoptimized
            alt=""
            className="espera-publica__marca"
            src="/marca/damira-espera.svg"
            loading="eager"
            fetchPriority="low"
            width={430}
            height={122}
          />
          <p className="espera-publica__mensagem">{t("mensagem")}</p>
          <span className="espera-publica__percentagem espera-publica__percentagem--inicio">0%</span>
          <span className="espera-publica__percentagem espera-publica__percentagem--estrutura">50%</span>
          <span className="espera-publica__percentagem espera-publica__percentagem--fim">100%</span>
        </div>
      </div>
    </>
  );
}
