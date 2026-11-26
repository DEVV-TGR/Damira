import { describe, expect, it } from "vitest";
import { criarEmailsJson } from "./json-emails";
import { agora, linhaDeEmail, pedidoDeEmail } from "@/lib/emails/exemplo-emissor-teste";

it("sem base nem fila não há emails para enviar", async () => {
  const fonte = criarEmailsJson(() => []);
  expect(await fonte.emailsPendentes({ agora, limite: 10 })).toEqual([]);
});
describe("a fila provisória segue a reserva da BD", () => {
  it("reserva só uma vez, retoma depois do prazo e distingue saltados", async () => {
    const linha = linhaDeEmail(); const fonte = criarEmailsJson(() => [pedidoDeEmail()], [linha]);
    const [a, b] = await Promise.all([fonte.reservarEmail(linha.id, agora), fonte.reservarEmail(linha.id, agora)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const nova = (await fonte.reservarEmail(linha.id, new Date(+agora + 120000)))!;
    await fonte.marcarEmailEnviado(a!, agora);
    await fonte.registarFalhaEmail(nova, "saltado: lembrete-sem-espera", true);
    expect(await fonte.emailsFalhados(10)).toMatchObject([{ enviadoEm: null, tentativas: 5, saltado: true }]);
    expect(await fonte.pedidoDoEmail(linha.pedidoId)).toEqual(pedidoDeEmail());
  });
});
