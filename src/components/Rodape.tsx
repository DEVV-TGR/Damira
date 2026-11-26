import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { marca } from "@/data/marca";
import {
  casa,
  moradaCompleta,
  urlDirecoes,
  telefoneMarcavel,
} from "@/data/casa";
import { URL_ESTUDIO } from "@/lib/site";

// Em 25/11 confirmou-se que este horário se aplica só ao rodapé. Os contactos
// são os do PDF de design e não configuram o envio das encomendas.
const HORARIO_RODAPE = "07:00–21:00";
const EMAILS_RODAPE = ["geral@damira.pt", "encomendas@damira.pt"];

/** O rodapé encosta à secção anterior para o fundo do body não abrir uma faixa. */
export function Rodape() {
  const t = useTranslations("rodape");
  const nav = useTranslations("nav");
  const dias = useTranslations("casa.dias");
  const tCasa = useTranslations("casa");
  const tMarca = useTranslations("marca");
  const ano = new Date().getFullYear();
  const telefone = telefoneMarcavel();

  const redes = [
    { href: marca.facebook, rotulo: "Facebook", detalhe: null },
    { href: marca.instagram, rotulo: "Instagram", detalhe: marca.instagramUtilizador },
    { href: marca.tiktok, rotulo: "TikTok", detalhe: null },
  ].filter((r): r is { href: string; rotulo: string; detalhe: string | null } => r.href !== null);

  // A letra do telefone acompanha os emails sem reduzir o alvo de toque.
  const ligacao =
    "alvo-toque inline-flex min-h-11 items-center underline decoration-tijolo decoration-2 underline-offset-4 hover:text-papel";
  const rotulo = "text-xs font-semibold uppercase tracking-[0.2em] text-papel/55";

  return (
    <footer className="bg-tinta text-papel">
      <div className="envolvente py-14 sm:py-16">
        {/* A marca e a assinatura, como no topo dos impressos. */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-papel/15 pb-8">
          <div>
            <Link href="/" className="alvo-toque inline-flex min-h-11 items-center">
              <Image
                src="/marca/damira-branco.png"
                alt={marca.nomeCurto}
                width={1379}
                height={315}
                className="h-auto w-28 sm:w-32"
                unoptimized
              />
            </Link>
            <p className="mt-2 text-sm text-papel/70">
              {tMarca("nome")} · {tMarca("desde", { ano: casa.desde })}
            </p>
          </div>
          <nav aria-label={t("paginas")} className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold uppercase tracking-widest">
            <Link href="/" className={ligacao}>{nav("inicio")}</Link>
            <Link href="/encomendas" className={ligacao}>{nav("encomendas")}</Link>
          </nav>
        </div>

        <div className="grid gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-sm leading-relaxed">
            <p className={rotulo}>{casa.cidade}</p>
            <p className="mt-3 text-papel/85">{moradaCompleta()}</p>
            <a href={urlDirecoes()} target="_blank" rel="noreferrer" className={`${ligacao} mt-1`}>
              {t("verMapa")}
            </a>
          </div>

          <div className="text-sm leading-relaxed">
            <p className={rotulo}>{t("falarConnosco")}</p>
            <ul className="mt-2">
              {telefone && (
                <li>
                  <a href={telefone} className={ligacao}>{casa.telefone}</a>
                </li>
              )}
              {EMAILS_RODAPE.map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`} className={ligacao}>{email}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm leading-relaxed">
            <p className={rotulo}>{t("horario")}</p>
            <p className="mt-3 flex flex-wrap justify-between gap-x-4 text-papel/85">
              <span>{tCasa("intervaloDias", { primeiro: dias("segunda"), ultimo: dias("domingo") })}</span>
              <span className="tabular-nums">{HORARIO_RODAPE}</span>
            </p>
          </div>

          {redes.length > 0 && (
            <div className="text-sm">
              <p className={rotulo}>{t("seguirNos")}</p>
              <ul className="mt-2">
                {redes.map((rede) => (
                  <li key={rede.rotulo}>
                    <a href={rede.href} target="_blank" rel="noreferrer" className={ligacao}>
                      {rede.rotulo}
                      {rede.detalhe && <span className="ml-2 text-papel/55 no-underline">{rede.detalhe}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-papel/15">
        <div className="envolvente flex flex-wrap justify-between gap-2 py-5 text-xs text-papel/60">
          <p>© {ano} {marca.nome}. {t("direitos")}</p>
          <p>
            {t("feitoPor")}{" "}
            <a href={URL_ESTUDIO} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {t("estudio")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
