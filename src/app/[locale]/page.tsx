import { setRequestLocale } from "next-intl/server";
import { Motor } from "@/components/cartaz/Motor";
import { FolhaDeRosto } from "@/components/cartaz/FolhaDeRosto";
import { Natal, Vitrine } from "@/components/cartaz/Vitrine";
import { Bolos } from "@/components/cartaz/Bolos";
import { Raro } from "@/components/cartaz/Raro";
import { Catering } from "@/components/cartaz/Catering";
import { Reels } from "@/components/cartaz/Reels";
import { routing } from "@/i18n/routing";
import { familiasDaLoja } from "@/lib/dados";
import { emLingua } from "@/lib/vista";
import "../cartaz-motor.css";
import "../cartaz.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* «Natal», «Sabores de Natal 🎅», «natal-2026»: sem acentos e sem caixa. */
const falaDeNatal = (texto: string) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes("natal");

// Ordem do comentário da Damira de 25/11. A secção de cookies aguarda conteúdo.
export default async function PaginaInicial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /* ⚠️ **O id da família do Natal lê-se, não se escreve.** É a gerente que a
     cria, e o painel dá-lhe o id a partir do nome **com que foi criada**, que
     depois nunca muda (`emId`): «Natal» dá `natal`, «Sabores de Natal» dá
     `sabores-de-natal`. Um `#natal` escrito à mão aterrava no topo da
     `/encomendas` no dia em que o nome fosse outro. É a mesma leitura do menu
     do cabeçalho (`layout.tsx`), que o painel revalida ao gravar; só traz
     famílias com produtos; sem família do Natal, o botão leva à loja
     inteira. */
  const natal =
    (await familiasDaLoja()).find(
      ({ familia }) => falaDeNatal(familia.id) || falaDeNatal(emLingua(familia.nome, "pt")),
    )?.familia.id ?? null;

  return (
    <div id="cartaz" className="cartaz">
      <Motor />
      <FolhaDeRosto />
      <Natal idDaFamilia={natal} />
      <Bolos />
      <Raro />
      <Catering />
      <Vitrine />
      <Reels />
    </div>
  );
}
