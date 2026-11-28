"use server";

import { contextoDoPainel } from "@/lib/painel-servidor";
import type { Fundo } from "@/lib/talao";
import {
  emEposPrint,
  enderecoDoServico,
  envelopeSoap,
  ipDaRedeLocal,
  lerResposta,
  type RespostaImpressora,
} from "@/lib/talao-epos";
import { linhasDeTeste, TESTES, type Teste } from "@/lib/talao-exemplo";

/**
 * # Imprimir o talão de teste pelo portátil
 *
 * O segundo caminho da página `/painel/talao`. O primeiro é o browser falar
 * direto com a impressora, que é como o tablet vai imprimir se a loja tiver a
 * TM-m30II base; mas esse depende de a impressora aceitar pedidos de outra
 * origem (CORS) e de o browser não os bloquear. Se não aceitar, este caminho
 * imprime na mesma — o servidor do portátil está na rede da loja e fala com a
 * impressora sem browser pelo meio — e o teste do fundo preto faz-se no dia.
 *
 * ⚠️ **Só funciona com o site a correr no portátil, na rede da loja.** Na
 * Vercel o servidor não vê a rede da loja, e por isso recusa logo. E só manda
 * para IPs da rede local: um servidor que manda pedidos para onde o browser
 * disser é uma porta para outras redes.
 *
 * O browser escolhe só o teste; o talão monta-se aqui, a partir dos exemplos —
 * nunca XML vindo de fora.
 */

export type ResultadoImpressaoTeste = RespostaImpressora | { ok: false; codigo: "sem-permissao" | "na-vercel" | "ip-invalido" | "dados-invalidos" | "sem-ligacao"; estado: null; detalhe?: string };

export async function imprimirPeloPortatil(
  ip: string,
  teste: Teste,
  fundo: Fundo,
): Promise<ResultadoImpressaoTeste> {
  const ctx = await contextoDoPainel();
  if (!ctx) return { ok: false, codigo: "sem-permissao", estado: null };
  if (process.env.VERCEL) return { ok: false, codigo: "na-vercel", estado: null };
  if (!ipDaRedeLocal(ip)) return { ok: false, codigo: "ip-invalido", estado: null };
  if (!TESTES.includes(teste) || !["bloco", "inteiro"].includes(fundo)) {
    return { ok: false, codigo: "dados-invalidos", estado: null };
  }

  const xml = emEposPrint(linhasDeTeste(teste, fundo, ctx.agora));
  try {
    /* O portátil fala com a impressora em http: está na mesma rede, e assim
       não depende do certificado dela. */
    const resposta = await fetch(enderecoDoServico(ip.trim(), "http"), {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
      body: envelopeSoap(xml),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
      /* ⚠️ Sem seguir redirecionamentos: o `ipDaRedeLocal` só valida o endereço
         de partida, e um redirecionamento levava o pedido para onde a resposta
         dissesse — fora da rede local. */
      redirect: "error",
    });
    return lerResposta(await resposta.text());
  } catch (erro) {
    return { ok: false, codigo: "sem-ligacao", estado: null, detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}
