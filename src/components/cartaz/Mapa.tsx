"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { casa, moradaCompleta, urlDirecoes } from "@/data/casa";
import { marca } from "@/data/marca";

/**
 * O mapa do Google, **carregado só quando se pede**.
 *
 * ## Porque não carrega logo
 *
 * Um `<iframe>` do Maps na página inicial faz o Google ver todas as visitas ao
 * site antes de a pessoa ter decidido alguma coisa — e arrasta consentimento de
 * cookies atrás, que é justamente o que a CSP fechada deste site existe para
 * evitar (ver `next.config.ts`). Com o botão, o iframe só existe para quem o
 * quis: quem carrega em «ver o mapa» está a pedir ao Google um mapa, e isso é
 * uma coisa que se pode fazer sem aviso de cookies.
 *
 * O endereço é o mesmo do botão de direcções, com `output=embed`: não precisa
 * de chave de API e mostra o pino no sítio certo a partir da morada escrita.
 */
export function Mapa() {
  const t = useTranslations("cartaz.colofao");
  const [aberto, setAberto] = useState(false);

  const consulta = encodeURIComponent(`${casa.nome}, ${moradaCompleta()}`);

  return (
    <div className="colofao__mapa">
      {aberto ? (
        <iframe
          title={t("mapaTitulo", { nome: marca.nomeCurto })}
          src={`https://www.google.com/maps?q=${consulta}&z=16&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button type="button" className="colofao__mapaBotao" onClick={() => setAberto(true)}>
          <span className="colofao__mapaPino" aria-hidden />
          <span>{t("verMapa")}</span>
          <small>{t("mapaNota")}</small>
        </button>
      )}
      <a
        className="colofao__mapaLigacao"
        href={urlDirecoes()}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("abrirNoMaps")}
      </a>
    </div>
  );
}
