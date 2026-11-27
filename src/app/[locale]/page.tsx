import { setRequestLocale } from "next-intl/server";
import { Motor } from "@/components/cartaz/Motor";
import { FolhaDeRosto } from "@/components/cartaz/FolhaDeRosto";
import { Natal, Vitrine } from "@/components/cartaz/Vitrine";
import { Bolos } from "@/components/cartaz/Bolos";
import { Raro } from "@/components/cartaz/Raro";
import { Catering } from "@/components/cartaz/Catering";
import { Reels } from "@/components/cartaz/Reels";
import { routing } from "@/i18n/routing";
import "../cartaz-motor.css";
import "../cartaz.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Ordem do comentário da Damira de 25/11. A secção de cookies aguarda conteúdo.
export default async function PaginaInicial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div id="cartaz" className="cartaz">
      <Motor />
      <FolhaDeRosto />
      <Natal />
      <Bolos />
      <Raro />
      <Catering />
      <Vitrine />
      <Reels />
    </div>
  );
}
