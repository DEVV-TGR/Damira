import { EntradaPainel } from "@/components/painel/EntradaPainel";
import { PainelAberto } from "@/components/painel/PainelAberto";
import { VERSAO_DO_SITE, versaoEmCache } from "@/lib/painel-versao";
import { sessao } from "@/lib/sessao-painel";

/**
 * # `/painel` — uma página, dois papéis (`painel.md`)
 *
 * Lê a sessão a cada pedido, por isso é dinâmica: o painel nunca vai para a
 * cache (regra 7 do AGENTS.md). Sem sessão, a entrada; com sessão, o painel.
 * `?entrar=gerente` abre a entrada da gerente por cima do balcão.
 */
export const dynamic = "force-dynamic";

export default async function Painel({ searchParams }: { searchParams: Promise<{ entrar?: string }> }) {
  const agora = new Date();
  const { entrar } = await searchParams;
  const atual = await sessao.sessaoAtual(agora);

  if (!sessao.ligada) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-tijolo">Painel</p>
        <h1 className="titulo-display mt-2 text-4xl">A entrada ainda não está ligada</h1>
        <p className="mt-4 text-tinta-suave">
          O painel abre quando a entrada da equipa estiver configurada. Até lá, os pedidos continuam a chegar
          por email.
        </p>
      </main>
    );
  }

  const aviso = sessao.provisoria ? <AvisoEntradaProvisoria /> : null;
  const querGerente = entrar === "gerente" && atual?.papel !== "gerente";

  if (!atual || querGerente) {
    return (
      <>
        {aviso}
        <EntradaPainel
          inicial={querGerente ? "gerente" : "equipa"}
          /* ⚠️ A gerente num tablet que já é do balcão: «lembrar» desligado por
             defeito, senão os preços e os reembolsos ficavam ao alcance da
             equipa durante 30 dias (`painel.md`). */
          lembrarPorDefeito={!(await sessao.temSessaoDeEquipa(agora))}
          podeVoltar={atual !== null}
        />
      </>
    );
  }

  return (
    <>
      {aviso}
      <PainelAberto papel={atual.papel} versaoInicial={await versaoEmCache()} site={VERSAO_DO_SITE} />
    </>
  );
}

/**
 * ⚠️ **Não se apaga enquanto a entrada provisória estiver ligada.** É ela que
 * torna aceitável haver um PIN de teste: sem ela, alguém tomava esta entrada
 * pela verdadeira. Sai quando a entrada da #33 entrar (`painel.md`).
 */
function AvisoEntradaProvisoria() {
  return (
    <div className="bg-tinta px-4 py-2 text-center text-xs font-semibold tracking-wide text-papel">
      <span className="mr-2 inline-block rounded-full bg-tijolo px-2 py-0.5 uppercase tracking-widest">
        Entrada de teste
      </span>
      O PIN e o código não são os definitivos. A entrada a sério chega com a base de dados.
    </div>
  );
}
