import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { marca } from "@/data/marca";
import {
  casa,
  horariosAgrupados,
  moradaCompleta,
  urlDirecoes,
  telefoneMarcavel,
} from "@/data/casa";
import { URL_ESTUDIO } from "@/lib/site";
import { Marca } from "@/components/Marca";

/**
 * O rodapé é o chão do site: numa página clara é o que diz que acabou.
 *
 * ## O que aqui vive, e porquê agora é mais
 *
 * A primeira versão tinha três colunas de texto pequeno — morada, contacto,
 * redes — e nada mais, porque o fecho da página inicial mostrava a marca em
 * grande logo acima. Esse fecho já não existe, a página inicial passou a
 * acabar num colofão, e a ementa e as encomendas nunca tiveram fecho nenhum.
 * O cliente pediu um rodapé melhor, e o que faltava era concreto:
 *
 * - **a marca**, porque é o único sítio das três páginas onde o nome da casa
 *   aparece no fim;
 * - **as três páginas**, porque quem chega ao fundo da ementa e quer encomendar
 *   não devia ter de subir ao cabeçalho;
 * - **o horário**, que não estava em lado nenhum do rodapé e é a segunda coisa
 *   que se procura numa pastelaria, a seguir à morada;
 * - **o telefone em grande**, porque é como a maioria das encomendas chega.
 *
 * ## Tudo o que se toca tem 44 px
 *
 * As ligações são blocos com altura mínima, não palavras sublinhadas num
 * parágrafo. É o mesmo critério do resto do site: um rodapé usa-se com o
 * polegar, no fim de uma página longa, e é onde mais se falha o alvo.
 *
 * ⚠️ **Sem margem por cima.** A margem mostrava o fundo do `body` e abria uma
 * faixa de papel entre dois blocos escuros. O espaço é dado por quem vem antes.
 */
export function Rodape() {
  const t = useTranslations("rodape");
  const nav = useTranslations("nav");
  const dias = useTranslations("casa.dias");
  const tCasa = useTranslations("casa");
  const tMarca = useTranslations("marca");
  const ano = new Date().getFullYear();
  const telefone = telefoneMarcavel();
  const grupos = horariosAgrupados();

  const redes = [
    { href: marca.instagram, rotulo: "Instagram", detalhe: marca.instagramUtilizador },
    { href: marca.tiktok, rotulo: "TikTok", detalhe: null },
    { href: marca.facebook, rotulo: "Facebook", detalhe: null },
  ].filter((r): r is { href: string; rotulo: string; detalhe: string | null } => r.href !== null);

  const ligacao =
    "alvo-toque inline-flex min-h-11 items-center underline decoration-tijolo decoration-2 underline-offset-4 hover:text-papel";
  const rotulo = "text-xs font-semibold uppercase tracking-[0.2em] text-papel/55";

  return (
    <footer className="bg-tinta text-papel">
      <div className="envolvente py-14 sm:py-16">
        {/* A marca e a assinatura, como no topo dos impressos. */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-papel/15 pb-8">
          <div>
            <Link href="/" aria-label={nav("inicio")} className="alvo-toque inline-block text-[2rem] text-papel">
              <Marca />
            </Link>
            <p className="mt-2 text-sm text-papel/70">
              {tMarca("nome")} · {tMarca("desde", { ano: casa.desde })}
            </p>
          </div>
          <nav aria-label={t("paginas")} className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold uppercase tracking-widest">
            <Link href="/" className={ligacao}>{nav("inicio")}</Link>
            <Link href="/ementa" className={ligacao}>{nav("ementa")}</Link>
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
            {telefone && (
              <a href={telefone} className="alvo-toque titulo-display mt-2 block text-2xl leading-tight text-papel">
                {casa.telefone}
              </a>
            )}
            {casa.email && (
              <a href={`mailto:${casa.email}`} className={`${ligacao} mt-1 break-all`}>
                {casa.email}
              </a>
            )}
          </div>

          {/* O horário sai do casa.json, agrupado: sete dias iguais são uma
              linha, não sete. Ver horariosAgrupados. */}
          {grupos && (
            <div className="text-sm leading-relaxed">
              <p className={rotulo}>{t("horario")}</p>
              <ul className="mt-3 space-y-1.5 text-papel/85">
                {grupos.map((g) => {
                  const nome =
                    g.dias.length === 1
                      ? dias(g.dias[0])
                      : tCasa("intervaloDias", { primeiro: dias(g.dias[0]), ultimo: dias(g.dias[g.dias.length - 1]) });
                  return (
                    <li key={g.dias.join()} className="flex justify-between gap-4">
                      <span>{nome}</span>
                      <span className="tabular-nums">
                        {g.horario ? `${g.horario.abre}–${g.horario.fecha}` : tCasa("encerrado")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

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
