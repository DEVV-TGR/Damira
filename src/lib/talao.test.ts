import { describe, expect, it } from "vitest";
import { COLUNAS, type Linha, normalizar, partir, talaoDeCancelamento, talaoDeCarateres, talaoDoPedido } from "./talao";
import { emEposPrint, enderecoDoServico, envelopeSoap, ipDaRedeLocal, lerResposta } from "./talao-epos";
import { pedidoDeExemplo } from "./talao-exemplo";

/** Quinta-feira, 8 de outubro de 2026, 10:00 em Lisboa (verão: UTC+1). */
const QUINTA = new Date("2026-10-08T09:00:00Z");

const textos = (linhas: Linha[]) => linhas.map((l) => l.texto.trim());
/** O talão como texto corrido, para procurar uma frase que a largura do papel partiu. */
const corrido = (linhas: Linha[]) => textos(linhas).join(" ");
const largura = (l: Linha) => (l.grande ? COLUNAS / 2 : COLUNAS);

describe("o talão de um pedido para hoje", () => {
  const pedido = pedidoDeExemplo(QUINTA, "hoje");
  const talao = talaoDoPedido(pedido, { agora: QUINTA, fundo: "bloco" });

  it("abre com o bloco invertido «HOJE · QUINTA 14:30», da largura do papel", () => {
    const bloco = talao.find((l) => l.invertido)!;
    expect(bloco.texto.trim()).toBe("HOJE · QUINTA 14:30");
    expect(bloco.grande).toBe(true);
    expect(bloco.texto).toHaveLength(COLUNAS / 2);
  });

  it("só o bloco é invertido", () => {
    expect(talao.filter((l) => l.invertido)).toHaveLength(1);
  });

  it("nenhuma linha passa da largura do papel", () => {
    for (const linha of talao) expect(linha.texto.length).toBeLessThanOrEqual(largura(linha));
  });

  it("leva o que o impressao.md pede", () => {
    const tudo = corrido(talao);
    expect(tudo).toContain(pedido.referencia);
    expect(tudo).toContain("Levantamento: quinta-feira, 8 de outubro, 14:30");
    expect(tudo).toContain("Cliente de Teste");
    expect(tudo).toContain("Tel. +351900000000");
    expect(tudo).toContain("Nota: Escrever «Parabéns, Leonor!» no bolo");
    expect(tudo).toContain("1,5 kg Bolo vegan de chocolate");
    expect(tudo).toContain("OBSERVAÇÕES");
    expect(tudo).toContain("Documento sem valor fiscal");
    expect(tudo).not.toContain("NIF");
  });

  it("diz que se paga na loja, e quanto, em duas linhas grandes", () => {
    const i = talao.findIndex((l) => l.texto.trim() === "A PAGAR NA LOJA");
    expect(talao[i].grande).toBe(true);
    expect(talao[i + 1].texto.trim()).toBe("233,30 €");
  });

  it("nunca diz PAGO nem SINAL: desde 04/11 paga-se na loja", () => {
    const tudo = corrido(talao);
    expect(tudo).not.toMatch(/\bPAGO\b/);
    expect(tudo).not.toContain("SINAL");
  });

  it("o preço fica à direita, na primeira linha de um nome que não cabe", () => {
    const i = talao.findIndex((l) => l.texto.includes("Kit Premium"));
    expect(talao[i].texto).toMatch(/185,00 €$/);
    expect(talao[i].texto).toHaveLength(COLUNAS);
    expect(talao[i + 1].texto).not.toContain("€");
  });

  it("o total em cêntimos chega ao papel sem espaço inquebrável", () => {
    const total = talao.find((l) => l.texto.startsWith("TOTAL"))!;
    expect(total.texto).toMatch(/ 233,30 €$/);
    expect(total.texto).not.toMatch(/ /);
  });
});

describe("o dia é o de Lisboa", () => {
  it("à 00:30 de sexta em Lisboa (23:30 de quinta em UTC), um levantamento de quinta já não é «HOJE»", () => {
    const pedido = pedidoDeExemplo(QUINTA, "hoje");
    const sextaMeiaNoite = new Date("2026-10-08T23:30:00Z");
    const talao = talaoDoPedido(pedido, { agora: sextaMeiaNoite, fundo: "bloco" });
    expect(talao.some((l) => l.invertido)).toBe(false);
    expect(textos(talao)).toContain("QUINTA 08/10 14:30");
  });
});

describe("o talão de um pedido para amanhã", () => {
  const pedido = pedidoDeExemplo(QUINTA, "amanha");
  const talao = talaoDoPedido(pedido, { agora: QUINTA, fundo: "bloco" });

  it("diz o dia e a data em grande, sem bloco invertido", () => {
    expect(talao.some((l) => l.invertido)).toBe(false);
    expect(textos(talao)).toContain("SEXTA 09/10 14:30");
  });

  it("leva o NIF quando o cliente o deu", () => {
    expect(textos(talao)).toContain("NIF 999999990");
  });
});

describe("uma linha sem preço", () => {
  it("diz «a definir» em vez de 0,00 €", () => {
    const pedido = pedidoDeExemplo(QUINTA, "hoje");
    const semPreco = { ...pedido, linhas: [{ ...pedido.linhas[0], precoUnitarioCent: null, totalCent: null }] };
    const linha = talaoDoPedido(semPreco, { agora: QUINTA, fundo: "bloco" }).find((l) => l.texto.includes("Kit Premium"))!;
    expect(linha.texto).toMatch(/a definir$/);
  });
});

describe("o pagamento online, a dormir", () => {
  it("um pedido do Stripe continua a dizer PAGO", () => {
    const pedido = { ...pedidoDeExemplo(QUINTA, "hoje"), modoPagamento: "total" as const };
    const pago = { ...pedido, pagoOnlineCent: pedido.totalCent };
    expect(textos(talaoDoPedido(pago, { agora: QUINTA, fundo: "bloco" }))).toContain("PAGO");
  });
});

describe("o talão inteiro a preto", () => {
  const talao = talaoDoPedido(pedidoDeExemplo(QUINTA, "hoje"), { agora: QUINTA, fundo: "inteiro" });

  it("inverte todas as linhas, cada uma da largura do papel", () => {
    for (const linha of talao) {
      expect(linha.invertido).toBe(true);
      expect(linha.texto).toHaveLength(largura(linha));
    }
  });
});

describe("o talão de cancelamento", () => {
  const talao = talaoDeCancelamento(pedidoDeExemplo(QUINTA, "hoje"), { agora: QUINTA, fundo: "bloco" });

  it("leva CANCELADO invertido, a referência e o levantamento previsto", () => {
    expect(talao.find((l) => l.invertido)?.texto.trim()).toBe("CANCELADO");
    expect(corrido(talao)).toContain("Levantamento previsto: quinta-feira, 8 de outubro, 14:30");
  });

  it("leva os artigos, sem preços", () => {
    const tudo = corrido(talao);
    expect(tudo).toContain("24 x Salgados fritos - Rissol de leitão");
    expect(tudo).not.toContain("€");
  });
});

describe("partir e normalizar", () => {
  it("parte pelas palavras", () => {
    expect(partir("um dois três quatro", 9)).toEqual(["um dois", "três", "quatro"]);
  });

  it("corta uma palavra maior do que a linha", () => {
    expect(partir("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("uma linha vazia continua a ser uma linha", () => {
    expect(partir("", 10)).toEqual([""]);
  });

  it("troca o que nenhuma tabela da impressora tem", () => {
    expect(normalizar("12,50 € — já…")).toBe("12,50 € - já...");
  });
});

describe("ePOS-Print", () => {
  it("põe a margem de 1,5 mm antes do talão, e volta à de origem depois do corte", () => {
    const xml = emEposPrint(talaoDeCarateres());
    /* GS L 12 0 · GS W 552 (0x0228) */
    expect(xml.indexOf("<command>1d4c0c001d572802</command>")).toBeLessThan(xml.indexOf("<text"));
    /* GS L 0 0 · GS W 576 (0x0240) */
    expect(xml.indexOf("<command>1d4c00001d574002</command>")).toBeGreaterThan(xml.indexOf("<cut"));
  });

  it("escapa o XML e marca o invertido", () => {
    const xml = emEposPrint([{ texto: "A & B <C>", grande: false, negrito: true, invertido: true }]);
    expect(xml).toContain("<text>A &amp; B &lt;C&gt;&#10;</text>");
    expect(xml).toContain('reverse="true"');
    expect(xml).toContain('em="true"');
  });

  it("cola as linhas só quando há fundo preto seguido", () => {
    const hoje = pedidoDeExemplo(QUINTA, "hoje");
    expect(emEposPrint(talaoDoPedido(hoje, { agora: QUINTA, fundo: "bloco" }))).not.toContain("linespc");
    expect(emEposPrint(talaoDoPedido(hoje, { agora: QUINTA, fundo: "inteiro" }))).toContain(
      'linespc="24"',
    );
  });

  it("fala com a impressora no protocolo pedido", () => {
    expect(enderecoDoServico("192.168.1.50", "https")).toMatch(/^https:\/\/192\.168\.1\.50\/cgi-bin\/epos\/service\.cgi\?/);
    expect(enderecoDoServico("192.168.1.50", "http")).toMatch(/^http:\/\//);
  });

  it("vai num envelope SOAP", () => {
    expect(envelopeSoap("<epos-print/>")).toContain("<s:Body><epos-print/></s:Body>");
  });

  it("lê a resposta da impressora", () => {
    expect(lerResposta('<response success="true" code="" status="251658262"/>')).toEqual({ ok: true });
    expect(lerResposta('<response success="false" code="EPTR_REC_EMPTY" status="5"/>')).toEqual({
      ok: false,
      codigo: "EPTR_REC_EMPTY",
      estado: "5",
    });
  });
});

describe("o envio pelo portátil só vai para a rede local", () => {
  it.each(["192.168.1.50", "10.0.0.7", "172.16.4.2", "172.31.255.255"])("aceita %s", (ip) => {
    expect(ipDaRedeLocal(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "172.32.0.1", "169.254.169.254", "127.0.0.1", "192.168.1.300", "impressora.local", "192.168.1.5:80"])(
    "recusa %s",
    (ip) => {
      expect(ipDaRedeLocal(ip)).toBe(false);
    },
  );
});
