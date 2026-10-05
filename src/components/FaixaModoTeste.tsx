import { useTranslations } from "next-intl";
import { emModoDeTeste } from "@/lib/modo-teste";

/**
 * A faixa do modo de teste, no topo de todas as páginas.
 *
 * ⚠️ **Não se apaga, e não se esconde.** É ela que torna aceitável o site no ar
 * ter prazos de exemplo e um pagamento que não cobra: sem ela, quem visse o
 * calendário acreditava num prazo que fomos nós a inventar. Ver
 * `src/lib/modo-teste.ts`.
 *
 * Fica **antes** do cabeçalho e no fluxo da página: sobe com a rolagem e o
 * cabeçalho cola-se ao topo como sempre, sem mudar as alturas de que dependem
 * as âncoras (`scroll-padding-top`, a barra da ementa). Componente de servidor:
 * não leva nada para o browser.
 */
export function FaixaModoTeste() {
  const t = useTranslations("modoTeste");
  if (!emModoDeTeste()) return null;

  return (
    <div className="bg-tinta px-4 py-2 text-center text-xs font-semibold tracking-wide text-papel">
      <span className="mr-2 inline-block rounded-full bg-tijolo px-2 py-0.5 uppercase tracking-widest">
        {t("etiqueta")}
      </span>
      {t("aviso")}
    </div>
  );
}
