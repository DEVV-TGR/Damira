"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCesto } from "./CestoProvider";

/**
 * No fim da página das encomendas, onde vivia o formulário: o caminho para a
 * página de compra, **só quando há alguma coisa no cesto**. Sem nada escolhido
 * não há o que encomendar, e um botão a levar a um pedido vazio era um beco.
 */
export function IrParaCompra() {
  const t = useTranslations("encomendas.compra");
  const contexto = useCesto();
  if (!contexto?.pronto || contexto.cesto.length === 0) return null;

  return (
    <div className="rounded-2xl border border-papel/25 p-8">
      <p className="max-w-[46ch] text-papel/85">{t("reverTexto")}</p>
      <Link
        href="/encomendas/pedido"
        className="premivel mt-6 inline-flex min-h-12 items-center rounded-full bg-tijolo px-7 text-sm font-semibold uppercase tracking-widest text-papel"
      >
        {t("rever")}
      </Link>
    </div>
  );
}
