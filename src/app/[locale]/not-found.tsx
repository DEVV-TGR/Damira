import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NaoEncontrada() {
  const t = useTranslations("naoEncontrada");

  return (
    <div className="mx-auto max-w-6xl px-5 py-28">
      <h1 className="titulo-display text-5xl sm:text-7xl">{t("titulo")}</h1>
      <p className="mt-4 max-w-[46ch]">{t("texto")}</p>
      <Link
        href="/"
        className="bloco-tijolo mt-8 inline-block rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide"
      >
        {t("voltar")}
      </Link>
    </div>
  );
}
