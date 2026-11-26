"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmar, entregar } from "@/app/painel/acoes-balcao";
import type { Pedido } from "@/lib/dados/tipos";
import { caminhoDaFotoDoBolo } from "@/lib/bolo-personalizado";
import { aFazer, balcaoPodeConfirmar, diaPorExtenso, faltaPagarCent, rotuloPagamento } from "@/lib/painel";
import { horaDeLisboa } from "@/lib/painel-ligacao";
import { formatarCent } from "@/lib/preco";
import { telefoneArrumado } from "@/lib/telefone";
import { usePainel } from "../PainelAberto";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, MENSAGENS, quantidade } from "./comum";

/**
 * Um pedido, como o balcão o vê (`painel-balcao.md` › O que se vê): referência,
 * nome e telefone, hora, artigos com variante, escolhas, quantidade e notas,
 * observações e o pagamento em grande.
 *
 * Os de hoje levam o cabeçalho em **bloco invertido**, como no talão. Um
 * cancelado fica riscado, sem botão.
 */
export function PedidoCartao({
  pedido,
  destaque = false,
  soLeitura = false,
  onEntregue,
  comecaAte,
}: {
  pedido: Pedido;
  destaque?: boolean;
  /** Sem «Entregue»: para comparar dois pedidos, não para os despachar. */
  soLeitura?: boolean;
  onEntregue?: (pedido: Pedido) => void;
  /** Num `por-confirmar`: quando a produção teria de começar (`organizarBalcao`). */
  comecaAte?: Date | null;
}) {
  const router = useRouter();
  const { ocupado } = usePainel();
  const [confirmarFalta, setConfirmarFalta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, iniciar] = useTransition();
  /* Num pedido pago na loja nada está pago online, e o «falta» seria o total
     inteiro: o dinheiro entra no toque do «Entregue» (`pedidos.md`). */
  const falta = pedido.modoPagamento === "na-loja" ? 0 : faltaPagarCent(pedido);
  const cancelado = pedido.estado === "cancelado";
  const aEspera = pedido.estado === "por-confirmar" || pedido.estado === "a-aguardar-aceite";

  const confirmarJa = () =>
    iniciar(async () => {
      setErro(null);
      const libertar = ocupado();
      try {
        const resultado = await confirmar(pedido.id);
        if (resultado.ok) {
          router.refresh();
          return;
        }
        setErro(MENSAGENS[resultado.erro]);
        if (resultado.erro === "estado-mudou") router.refresh();
      } catch {
        setErro("Sem ligação: não ficou confirmado. Tente outra vez.");
      } finally {
        libertar();
      }
    });

  const entregarJa = (faltaCobrada: boolean) =>
    iniciar(async () => {
      setErro(null);
      /* Nada de recarregar o painel a meio de um «entregue» (versão nova do site). */
      const libertar = ocupado();
      try {
        const resultado = await entregar(pedido.id, faltaCobrada);
        if (resultado.ok) {
          onEntregue?.(resultado.valor);
          router.refresh();
          return;
        }
        setErro(MENSAGENS[resultado.erro]);
        if (resultado.erro === "estado-mudou") router.refresh();
      } catch {
        /* «Entregue» sem rede falha à vista, nunca em silêncio (`robustez.md`). */
        setErro("Sem ligação: não ficou marcado. Tente outra vez.");
      } finally {
        libertar();
        setConfirmarFalta(false);
      }
    });

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-tinta/15 bg-papel ${cancelado ? "opacity-75" : ""}`}
      aria-label={`Pedido ${pedido.referencia}`}
    >
      <header
        className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 ${
          destaque && !cancelado ? "bg-tinta text-papel" : "bg-tinta/5"
        }`}
      >
        <span className={`titulo-display text-3xl tabular-nums ${cancelado ? "line-through" : ""}`}>
          {horaDeLisboa(pedido.levantamentoEm)}
        </span>
        <span className="select-all font-semibold tracking-wider">{pedido.referencia}</span>
      </header>

      <div className="px-5 py-4">
        {cancelado && (
          <p className="mb-3 inline-block rounded-full bg-tijolo px-3 py-1 text-xs font-semibold uppercase tracking-widest text-papel">
            Cancelado
          </p>
        )}
        {aEspera && (
          /* O dia vai por extenso: na lista «Por confirmar» há pedidos de vários
             dias, e a hora do cabeçalho sozinha não diz qual. */
          <p className="mb-3 text-sm">
            <span className="mr-2 inline-block rounded-full bg-tinta px-3 py-1 text-xs font-semibold uppercase tracking-widest text-papel">
              {pedido.estado === "por-confirmar" ? "Por confirmar" : "À espera do cliente"}
            </span>
            <span className="first-letter:uppercase">{diaPorExtenso(pedido.levantamentoEm)}</span>
          </p>
        )}
        <p className={cancelado ? "line-through" : ""}>
          <strong>{pedido.cliente.nome}</strong>
          {pedido.cliente.telefone && (
            <>
              {" · "}
              <a href={`tel:${pedido.cliente.telefone}`} className="underline underline-offset-4">
                {telefoneArrumado(pedido.cliente.telefone)}
              </a>
            </>
          )}
        </p>

        <ul className={`mt-3 space-y-2 ${cancelado ? "line-through" : ""}`}>
          {pedido.linhas.map((linha, i) => (
            <li key={`${linha.produtoId}-${linha.varianteId}-${i}`}>
              <strong className="tabular-nums">{quantidade(linha)}</strong> {linha.nome}
              {linha.variante && <span className="text-tinta-suave"> ({linha.variante})</span>}
              {/* Uma escolha por linha (#88): o sabor, o que se tira, os extras, o que
                  o kit leva. O «SEM» a negrito, como no talão — é a linha que a
                  cozinha não pode falhar (`impressao.md`). */}
              {linha.escolhas.length > 0 && (
                <ul className="pl-4 text-sm text-tinta-suave">
                  {linha.escolhas.map((escolha, k) => (
                    <li key={k}>
                      {escolha.startsWith("SEM ") ? (
                        <>
                          <strong className="text-tinta">SEM</strong>
                          {escolha.slice(3)}
                        </>
                      ) : (
                        escolha
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {linha.notas && <span className="block text-sm text-tinta-suave">Nota: {linha.notas}</span>}
              {linha.personalizacao?.bolo && <FotosDoBolo fotos={linha.personalizacao.bolo.fotos} />}
            </li>
          ))}
        </ul>

        {pedido.observacoes && (
          <p className="mt-3 rounded-xl bg-tinta/5 px-3 py-2 text-sm">
            <strong>Observações:</strong> {pedido.observacoes}
          </p>
        )}

        {/* Num cancelado, o pagamento risca-se com o resto: um «PAGO» por riscar
            lia-se como um pedido a entregar. O reembolso vê-se na gestão (#49). */}
        <p className={`titulo-display mt-4 text-xl ${falta > 0 ? "text-tijolo" : ""} ${cancelado ? "line-through" : ""}`}>
          {rotuloPagamento(pedido)}
        </p>

        {pedido.estado === "por-confirmar" && !soLeitura && (
          <Confirmar pedido={pedido} comecaAte={comecaAte ?? null} aEnviar={aEnviar} onConfirmar={confirmarJa} />
        )}
        {pedido.estado === "a-aguardar-aceite" && pedido.expiraEm && (
          <p className="mt-4 text-sm text-tinta-suave">
            A casa já respondeu. O cliente tem até {diaPorExtenso(pedido.expiraEm)}, {horaDeLisboa(pedido.expiraEm)}, para aceitar.
          </p>
        )}

        {aFazer(pedido) && !soLeitura && (
          <div className="mt-4">
            {confirmarFalta ? (
              /* ⚠️ Entregar sem cobrar o resto é o erro mais caro do balcão, e o mais
                 fácil numa hora de ponta. Pergunta primeiro. */
              <div className="rounded-xl border-2 border-tijolo p-4">
                <p className="font-semibold">Recebeu os {formatarCent(falta, "pt")} em falta?</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => entregarJa(true)} disabled={aEnviar} className={BOTAO_PRINCIPAL}>
                    Sim, recebi
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarFalta(false)}
                    disabled={aEnviar}
                    className={BOTAO_SECUNDARIO}
                  >
                    Ainda não
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (falta > 0 ? setConfirmarFalta(true) : entregarJa(false))}
                disabled={aEnviar}
                className={`${BOTAO_PRINCIPAL} min-h-[60px] w-full text-base`}
              >
                {aEnviar ? "A marcar…" : "✓ Entregue"}
              </button>
            )}
          </div>
        )}
        <p role="alert" className="mt-2 text-sm font-semibold text-tijolo empty:hidden">
          {erro}
        </p>
      </div>
    </article>
  );
}

/**
 * O «sim» do balcão (`pedidos.md` › Quem confirma): o pedido tal como está.
 * Com uma linha sem preço não há «sim» possível — alguém tem de dizer quanto
 * custa, e fixar dinheiro é da gerente. O balcão vê-o dito, em vez de um botão
 * que o servidor ia recusar.
 */
function Confirmar({
  pedido,
  comecaAte,
  aEnviar,
  onConfirmar,
}: {
  pedido: Pedido;
  comecaAte: Date | null;
  aEnviar: boolean;
  onConfirmar: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border-2 border-tinta/15 p-4">
      {pedido.expiraEm && (
        <p className="text-sm">
          Responder até <strong>{diaPorExtenso(pedido.expiraEm)}, {horaDeLisboa(pedido.expiraEm)}</strong>. Depois expira, e a vaga fica
          livre.
        </p>
      )}
      <p className="mt-1 text-sm text-tinta-suave">
        {comecaAte
          ? `A produção teria de começar ${diaPorExtenso(comecaAte)}, às ${horaDeLisboa(comecaAte)}.`
          : "Não se sabe quando a produção teria de começar: falta o tempo de um produto ou o horário da cozinha."}
      </p>
      {balcaoPodeConfirmar(pedido) ? (
        <button type="button" onClick={onConfirmar} disabled={aEnviar} className={`${BOTAO_PRINCIPAL} mt-3 min-h-[60px] w-full text-base`}>
          {aEnviar ? "A confirmar…" : "✓ Confirmar o pedido"}
        </button>
      ) : (
        <p className="mt-3 font-semibold">Tem um artigo sem preço: a gerente responde a este pedido.</p>
      )}
    </div>
  );
}

/**
 * As fotos do bolo personalizado, **em dois blocos com o seu título**
 * (`bolos-personalizados.md` › As duas fotos): a de imprimir em destaque e
 * primeiro, porque é um passo da produção; as de referência a seguir. Tocar
 * abre a foto inteira.
 */
function FotosDoBolo({ fotos }: { fotos: { referencia: string[]; imprimir: string | null } }) {
  const miniatura = (foto: string, alt: string) => (
    <a key={foto} href={caminhoDaFotoDoBolo(foto)} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos do cliente, servidas pela rota do bolo */}
      <img src={caminhoDaFotoDoBolo(foto)} alt={alt} loading="lazy" className="size-24 rounded-lg object-cover" />
    </a>
  );
  return (
    <div className="mt-3 grid gap-3">
      {fotos.imprimir && (
        <div className="rounded-xl border-2 border-tijolo p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-tijolo">Foto para imprimir no bolo</p>
          <div className="mt-2">{miniatura(fotos.imprimir, "Foto para imprimir no bolo")}</div>
        </div>
      )}
      {fotos.referencia.length > 0 && (
        <div className="rounded-xl bg-tinta/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
            Fotos de referência · {fotos.referencia.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fotos.referencia.map((foto, i) => miniatura(foto, `Foto de referência ${i + 1}`))}
          </div>
        </div>
      )}
    </div>
  );
}
