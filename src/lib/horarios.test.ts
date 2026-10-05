import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  dentroDoPrazoDeCancelamento,
  inicioDaProducao,
  primeiroLevantamento,
  prontoEm,
  vagas,
  validarLevantamento,
  type ArtigoDoCesto,
  type ConfiguracaoHorarios,
  type HorarioSemanal,
  type Intervalo,
} from "./horarios";

/* Os casos saem de `docs/loja/horarios.md`, secção «Os testes deixam de ser
   opcionais aqui». Quando um exemplo do ficheiro mudar, muda aqui também — e ao
   contrário: um teste que deixa de bater certo com o texto quer dizer que um
   dos dois está errado.

   As datas são de outubro de 2026, que começa numa quinta: 05/10 é segunda.
   A cozinha das 8h às 18h e a loja das 7h às 21h são as do exemplo do ficheiro
   e as do `casa.json`; a cozinha verdadeira está «À espera da Damira». */

const LISBOA = "Europe/Lisbon";

const todosOsDias = (...intervalos: Intervalo[]): HorarioSemanal => ({
  segunda: intervalos,
  terca: intervalos,
  quarta: intervalos,
  quinta: intervalos,
  sexta: intervalos,
  sabado: intervalos,
  domingo: intervalos,
});

const BASE: ConfiguracaoHorarios = {
  cozinha: todosOsDias({ abre: "08:00", fecha: "18:00" }),
  loja: todosOsDias({ abre: "07:00", fecha: "21:00" }),
  diasFechados: [],
  duracaoVagaMinutos: 30,
  limitePorVaga: null,
  diasAFrente: 30,
};

const com = (alteracoes: Partial<ConfiguracaoHorarios>): ConfiguracaoHorarios => ({
  ...BASE,
  ...alteracoes,
});

/** «2026-10-05 15:00», em hora de Lisboa, para instante. */
const lisboa = (texto: string): Date => {
  const [data, hora] = texto.split(" ");
  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return new TZDate(ano, mes - 1, dia, h, m, LISBOA);
};

/** O inverso: um instante escrito como se lê no relógio da loja. */
const emLisboa = (instante: Date | null): string | null =>
  instante && format(instante, "yyyy-MM-dd HH:mm", { in: tz(LISBOA) });

/** O instante em UTC, com `Z`. O `toISOString()` de um `TZDate` escreve com o
   desvio de Lisboa (`+01:00`), que é o mesmo instante mas não o mesmo texto. */
const utc = (instante: Date | null | undefined): string | null =>
  instante ? new Date(instante.getTime()).toISOString() : null;

const horas = (valor: number, esgotadoHoje = false): ArtigoDoCesto => ({
  tempo: { unidade: "horas", valor },
  esgotadoHoje,
});

const dias = (valor: number, esgotadoHoje = false): ArtigoDoCesto => ({
  tempo: { unidade: "dias", valor },
  esgotadoHoje,
});

describe("o ambiente de teste", () => {
  it("corre fora de Lisboa e fora de UTC, para a hora local não passar por acaso", () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(-14 * 60);
  });
});

describe("os instantes que o módulo devolve", () => {
  it("são de Lisboa: getHours dá a hora da loja, mesmo com o processo noutro fuso", () => {
    const levantamento = primeiroLevantamento([horas(6)], lisboa("2026-10-05 15:00"), BASE)!;
    expect(levantamento.getHours()).toBe(11);
  });

  it("e o toISOString escreve o desvio de Lisboa, não o Z — mesmo instante, outro texto", () => {
    const levantamento = primeiroLevantamento([horas(6)], lisboa("2026-10-05 15:00"), BASE)!;
    expect(levantamento.toISOString()).toBe("2026-10-06T11:00:00.000+01:00");
    expect(utc(levantamento)).toBe("2026-10-06T10:00:00.000Z");
  });
});

describe("tempo de produção em horas", () => {
  it("o exemplo do ficheiro: 6 h pedidas às 15h00 levantam-se amanhã às 11h00", () => {
    const agora = lisboa("2026-10-05 15:00");
    expect(emLisboa(prontoEm([horas(6)], agora, BASE))).toBe("2026-10-06 11:00");
    expect(emLisboa(primeiroLevantamento([horas(6)], agora, BASE))).toBe(
      "2026-10-06 11:00",
    );
  });

  it("com a cozinha fechada, começa a contar quando ela abre (de madrugada)", () => {
    const agora = lisboa("2026-10-05 05:00");
    expect(emLisboa(prontoEm([horas(2)], agora, BASE))).toBe("2026-10-05 10:00");
  });

  it("com a cozinha fechada, começa a contar quando ela abre (à noite)", () => {
    const agora = lisboa("2026-10-05 20:00");
    expect(emLisboa(prontoEm([horas(2)], agora, BASE))).toBe("2026-10-06 10:00");
  });

  it("um pedido feito à hora de fecho da cozinha já não conta esse dia", () => {
    const agora = lisboa("2026-10-05 18:00");
    expect(emLisboa(prontoEm([horas(2)], agora, BASE))).toBe("2026-10-06 10:00");
  });

  it("um minuto antes do fecho conta esse minuto, e a vaga arredonda para a seguinte", () => {
    const agora = lisboa("2026-10-05 17:59");
    expect(emLisboa(prontoEm([horas(2)], agora, BASE))).toBe("2026-10-06 09:59");
    expect(emLisboa(primeiroLevantamento([horas(2)], agora, BASE))).toBe(
      "2026-10-06 10:00",
    );
  });

  it("pronto exatamente ao fecho da cozinha levanta-se a essa hora, se a loja está aberta", () => {
    const agora = lisboa("2026-10-05 16:00");
    expect(emLisboa(primeiroLevantamento([horas(2)], agora, BASE))).toBe(
      "2026-10-05 18:00",
    );
  });

  it("um pedido feito à hora de fecho da loja passa para a abertura do dia seguinte", () => {
    const agora = lisboa("2026-10-05 21:00");
    expect(emLisboa(primeiroLevantamento([horas(0)], agora, BASE))).toBe(
      "2026-10-06 07:00",
    );
  });

  it("um dia sem cozinha no horário semanal não conta horas", () => {
    const config = com({
      cozinha: { ...BASE.cozinha, domingo: [] },
    });
    // sábado 10/10 às 15h: 3 h no sábado, domingo não conta, 3 h na segunda
    const agora = lisboa("2026-10-10 15:00");
    expect(emLisboa(prontoEm([horas(6)], agora, config))).toBe("2026-10-12 11:00");
  });

  it("uma cozinha com pausa ao almoço não conta a pausa", () => {
    const config = com({
      cozinha: todosOsDias(
        { abre: "08:00", fecha: "12:00" },
        { abre: "14:00", fecha: "18:00" },
      ),
    });
    const agora = lisboa("2026-10-05 09:00");
    expect(emLisboa(prontoEm([horas(6)], agora, config))).toBe("2026-10-05 17:00");
  });
});

describe("tempo de produção em dias", () => {
  it("o exemplo do ficheiro: um bolo de 3 dias pedido na segunda levanta-se na quinta, à abertura", () => {
    const agora = lisboa("2026-10-05 14:00");
    expect(emLisboa(primeiroLevantamento([dias(3)], agora, BASE))).toBe(
      "2026-10-08 07:00",
    );
  });

  it("a hora do pedido não importa, só o dia", () => {
    const deManha = lisboa("2026-10-05 07:01");
    const aNoite = lisboa("2026-10-05 23:59");
    expect(emLisboa(primeiroLevantamento([dias(3)], deManha, BASE))).toBe(
      "2026-10-08 07:00",
    );
    expect(emLisboa(primeiroLevantamento([dias(3)], aNoite, BASE))).toBe(
      "2026-10-08 07:00",
    );
  });

  it("o exemplo do ficheiro: com a cozinha fechada à quarta, passa para sexta", () => {
    const config = com({ diasFechados: [{ data: "2026-10-07", fecha: "cozinha" }] });
    const agora = lisboa("2026-10-05 14:00");
    expect(emLisboa(primeiroLevantamento([dias(3)], agora, config))).toBe(
      "2026-10-09 07:00",
    );
  });
});

describe("dias fechados", () => {
  it("com a loja fechada no dia em que fica pronto, passa para o dia seguinte", () => {
    const config = com({ diasFechados: [{ data: "2026-10-06", fecha: "loja" }] });
    const agora = lisboa("2026-10-05 15:00");
    expect(emLisboa(primeiroLevantamento([horas(6)], agora, config))).toBe(
      "2026-10-07 07:00",
    );
    expect(
      vagas([horas(6)], agora, config).some((vaga) => vaga.data === "2026-10-06"),
    ).toBe(false);
  });

  it("com só a cozinha fechada, a loja continua a ter vagas nesse dia", () => {
    const config = com({ diasFechados: [{ data: "2026-10-07", fecha: "cozinha" }] });
    const agora = lisboa("2026-10-05 15:00");
    expect(
      vagas([horas(0)], agora, config).filter((vaga) => vaga.data === "2026-10-07"),
    ).toHaveLength(28);
  });

  it("fechado para as duas: não conta para a produção e não tem vagas", () => {
    const config = com({ diasFechados: [{ data: "2026-10-07", fecha: "ambas" }] });
    const agora = lisboa("2026-10-05 14:00");
    expect(emLisboa(primeiroLevantamento([dias(3)], agora, config))).toBe(
      "2026-10-09 07:00",
    );
    expect(
      vagas([horas(0)], agora, config).some((vaga) => vaga.data === "2026-10-07"),
    ).toBe(false);
  });
});

describe("cesto com unidades misturadas", () => {
  it("fica o mais tardio — aqui ganham as horas", () => {
    const agora = lisboa("2026-10-05 15:00");
    // 1 dia → terça 07h00; 6 h → terça 11h00
    expect(emLisboa(primeiroLevantamento([dias(1), horas(6)], agora, BASE))).toBe(
      "2026-10-06 11:00",
    );
  });

  it("fica o mais tardio — aqui ganham os dias", () => {
    const agora = lisboa("2026-10-05 15:00");
    // 2 h → segunda 17h00; 2 dias → quarta 07h00
    expect(emLisboa(primeiroLevantamento([horas(2), dias(2)], agora, BASE))).toBe(
      "2026-10-07 07:00",
    );
  });

  it("a produção do pedido começa com o artigo que começa mais cedo", () => {
    const levantamento = lisboa("2026-10-07 07:00");
    // 2 h → terça 16h00; 2 dias (terça e quarta) → terça 08h00
    expect(emLisboa(inicioDaProducao([horas(2), dias(2)], levantamento, BASE))).toBe(
      "2026-10-06 08:00",
    );
  });
});

describe("mudança de hora de 25/10/2026 (a hora recua, o domingo tem 25 horas)", () => {
  it("as horas de cozinha não ganham a hora que a noite ganhou", () => {
    // sábado às 17h00: 1 h no sábado, 5 h no domingo a partir das 8h00
    const agora = lisboa("2026-10-24 17:00");
    const pronto = prontoEm([horas(6)], agora, BASE);
    expect(emLisboa(pronto)).toBe("2026-10-25 13:00");
    expect(utc(pronto)).toBe("2026-10-25T13:00:00.000Z");
  });

  it("as vagas abrem às 7h00 de Lisboa dos dois lados da mudança", () => {
    const agora = lisboa("2026-10-24 06:00");
    const todas = vagas([horas(0)], agora, BASE);
    const sabado = todas.filter((vaga) => vaga.data === "2026-10-24");
    const domingo = todas.filter((vaga) => vaga.data === "2026-10-25");

    expect(sabado[0].hora).toBe("07:00");
    expect(utc(sabado[0].inicio)).toBe("2026-10-24T06:00:00.000Z");
    expect(domingo[0].hora).toBe("07:00");
    expect(utc(domingo[0].inicio)).toBe("2026-10-25T07:00:00.000Z");
    // um dia de 25 horas não tem mais vagas: a loja abre as mesmas 14 h
    expect(domingo).toHaveLength(28);
    expect(domingo.at(-1)?.hora).toBe("20:30");
  });

  it("o dia do pedido é o de Lisboa e não o de UTC", () => {
    // 23h30 UTC de sábado já é 00h30 de domingo em Lisboa (ainda UTC+1)
    const agora = new Date("2026-10-24T23:30:00Z");
    const levantamento = primeiroLevantamento([dias(1)], agora, BASE);
    expect(emLisboa(levantamento)).toBe("2026-10-26 07:00");
    expect(utc(levantamento)).toBe("2026-10-26T07:00:00.000Z");
  });

  it("um bolo de 1 dia pedido no sábado levanta-se no domingo às 7h00 de Lisboa", () => {
    const agora = lisboa("2026-10-24 10:00");
    const levantamento = primeiroLevantamento([dias(1)], agora, BASE);
    expect(utc(levantamento)).toBe("2026-10-25T07:00:00.000Z");
  });
});

describe("mudança de hora de 28/03/2027 (a hora avança, o domingo tem 23 horas)", () => {
  it("as horas de cozinha não perdem a hora que a noite perdeu", () => {
    // sábado às 17h00 (UTC+0): 1 h no sábado, 5 h no domingo a partir das 8h00
    const agora = lisboa("2027-03-27 17:00");
    const pronto = prontoEm([horas(6)], agora, BASE);
    expect(emLisboa(pronto)).toBe("2027-03-28 13:00");
    expect(utc(pronto)).toBe("2027-03-28T12:00:00.000Z");
  });

  it("as vagas abrem às 7h00 de Lisboa dos dois lados da mudança", () => {
    const agora = lisboa("2027-03-27 06:00");
    const todas = vagas([horas(0)], agora, BASE);
    const sabado = todas.filter((vaga) => vaga.data === "2027-03-27");
    const domingo = todas.filter((vaga) => vaga.data === "2027-03-28");

    expect(utc(sabado[0].inicio)).toBe("2027-03-27T07:00:00.000Z");
    expect(domingo[0].hora).toBe("07:00");
    expect(utc(domingo[0].inicio)).toBe("2027-03-28T06:00:00.000Z");
    expect(domingo).toHaveLength(28);
  });

  it("o início da produção conta para trás atravessando a mudança", () => {
    // segunda às 10h00: 2 h na segunda (8h–10h), 4 h no domingo (14h–18h)
    const levantamento = lisboa("2027-03-29 10:00");
    const inicio = inicioDaProducao([horas(6)], levantamento, BASE);
    expect(emLisboa(inicio)).toBe("2027-03-28 14:00");
    expect(utc(inicio)).toBe("2027-03-28T13:00:00.000Z");
  });
});

describe("vagas", () => {
  it("de 30 em 30 minutos, a começar no primeiro levantamento", () => {
    const agora = lisboa("2026-10-05 15:00");
    const lista = vagas([horas(6)], agora, BASE);
    expect(lista.slice(0, 3).map((vaga) => `${vaga.data} ${vaga.hora}`)).toEqual([
      "2026-10-06 11:00",
      "2026-10-06 11:30",
      "2026-10-06 12:00",
    ]);
    expect(emLisboa(lista[0].fim)).toBe("2026-10-06 11:30");
  });

  it("o tamanho da vaga é configurável", () => {
    const agora = lisboa("2026-10-05 06:00");
    const lista = vagas([horas(0)], agora, com({ duracaoVagaMinutos: 60 }));
    const segunda = lista.filter((vaga) => vaga.data === "2026-10-05");
    expect(segunda).toHaveLength(14);
    expect(segunda.slice(0, 2).map((vaga) => vaga.hora)).toEqual(["07:00", "08:00"]);
  });

  it("vão até ao limite de dias à frente, e não mais", () => {
    const agora = lisboa("2026-10-05 10:00");
    const lista = vagas([horas(0)], agora, com({ diasAFrente: 2 }));
    expect(`${lista[0].data} ${lista[0].hora}`).toBe("2026-10-05 10:00");
    expect(`${lista.at(-1)?.data} ${lista.at(-1)?.hora}`).toBe("2026-10-07 20:30");
  });

  it("um artigo que precisa de mais dias do que o calendário mostra não tem vagas", () => {
    const agora = lisboa("2026-10-05 10:00");
    expect(vagas([dias(40)], agora, BASE)).toEqual([]);
    expect(primeiroLevantamento([dias(40)], agora, BASE)).toBeNull();
  });

  it("sem limite por vaga, nenhuma enche", () => {
    const agora = lisboa("2026-10-05 15:00");
    const ocupadas = [{ inicio: lisboa("2026-10-06 11:00"), pedidos: 50 }];
    const [primeira] = vagas([horas(6)], agora, BASE, ocupadas);
    expect(primeira).toMatchObject({ ocupadas: 50, livre: true });
  });

  it("com limite por vaga, a vaga cheia continua na lista mas deixa de estar livre", () => {
    const agora = lisboa("2026-10-05 15:00");
    const ocupadas = [
      { inicio: lisboa("2026-10-06 11:00"), pedidos: 2 },
      { inicio: lisboa("2026-10-06 11:30"), pedidos: 1 },
    ];
    const [onze, onzeEMeia, meioDia] = vagas(
      [horas(6)],
      agora,
      com({ limitePorVaga: 2 }),
      ocupadas,
    );
    expect(onze).toMatchObject({ hora: "11:00", ocupadas: 2, livre: false });
    expect(onzeEMeia).toMatchObject({ hora: "11:30", ocupadas: 1, livre: true });
    expect(meioDia).toMatchObject({ hora: "12:00", ocupadas: 0, livre: true });
  });

  it("«esgotado hoje» tira as vagas de hoje ao cesto inteiro, e só as de hoje", () => {
    const agora = lisboa("2026-10-05 10:00");
    const semEsgotado = vagas([horas(0), horas(0)], agora, BASE);
    const comEsgotado = vagas([horas(0), horas(0, true)], agora, BASE);
    expect(`${semEsgotado[0].data} ${semEsgotado[0].hora}`).toBe("2026-10-05 10:00");
    expect(`${comEsgotado[0].data} ${comEsgotado[0].hora}`).toBe("2026-10-06 07:00");
  });
});

describe("validar o levantamento no servidor", () => {
  const agora = lisboa("2026-10-05 15:00");

  it("aceita uma vaga livre", () => {
    expect(
      validarLevantamento([horas(6)], lisboa("2026-10-06 11:00"), agora, BASE),
    ).toEqual({ ok: true });
  });

  it("recusa uma vaga antes de o pedido estar pronto", () => {
    expect(
      validarLevantamento([horas(6)], lisboa("2026-10-06 10:30"), agora, BASE),
    ).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("recusa uma hora que não é o início de uma vaga", () => {
    expect(
      validarLevantamento([horas(6)], lisboa("2026-10-06 11:15"), agora, BASE),
    ).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("recusa para lá dos dias à frente", () => {
    expect(
      validarLevantamento([horas(6)], lisboa("2026-11-20 11:00"), agora, BASE),
    ).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("recusa uma vaga cheia, com um motivo próprio", () => {
    const ocupadas = [{ inicio: lisboa("2026-10-06 11:00"), pedidos: 2 }];
    expect(
      validarLevantamento(
        [horas(6)],
        lisboa("2026-10-06 11:00"),
        agora,
        com({ limitePorVaga: 2 }),
        ocupadas,
      ),
    ).toEqual({ ok: false, motivo: "vaga-cheia" });
  });
});

describe("até quando se pode cancelar", () => {
  it("horas: o levantamento menos as horas de cozinha, contadas para trás", () => {
    const levantamento = lisboa("2026-10-06 11:00");
    expect(emLisboa(inicioDaProducao([horas(6)], levantamento, BASE))).toBe(
      "2026-10-05 15:00",
    );
    expect(
      dentroDoPrazoDeCancelamento(
        [horas(6)],
        levantamento,
        lisboa("2026-10-05 14:59"),
        BASE,
      ),
    ).toBe(true);
    expect(
      dentroDoPrazoDeCancelamento(
        [horas(6)],
        levantamento,
        lisboa("2026-10-05 15:00"),
        BASE,
      ),
    ).toBe(false);
  });

  it("dias: a abertura da cozinha no primeiro dos N dias", () => {
    const levantamento = lisboa("2026-10-08 07:00");
    expect(emLisboa(inicioDaProducao([dias(3)], levantamento, BASE))).toBe(
      "2026-10-06 08:00",
    );
    expect(
      dentroDoPrazoDeCancelamento(
        [dias(3)],
        levantamento,
        lisboa("2026-10-06 07:59"),
        BASE,
      ),
    ).toBe(true);
    expect(
      dentroDoPrazoDeCancelamento(
        [dias(3)],
        levantamento,
        lisboa("2026-10-06 08:00"),
        BASE,
      ),
    ).toBe(false);
  });

  it("dias: um levantamento mais tardio dá mais tempo para cancelar", () => {
    // sábado: quinta, sexta e sábado
    const levantamento = lisboa("2026-10-10 15:00");
    expect(emLisboa(inicioDaProducao([dias(3)], levantamento, BASE))).toBe(
      "2026-10-08 08:00",
    );
  });

  it("dias: um dia de cozinha fechada pelo meio não conta", () => {
    const config = com({ diasFechados: [{ data: "2026-10-07", fecha: "cozinha" }] });
    const levantamento = lisboa("2026-10-09 07:00");
    expect(emLisboa(inicioDaProducao([dias(3)], levantamento, config))).toBe(
      "2026-10-06 08:00",
    );
  });

  it("quem escolhe a primeira vaga já não pode cancelar: a produção começa agora", () => {
    const agora = lisboa("2026-10-05 15:00");
    const levantamento = primeiroLevantamento([horas(6)], agora, BASE)!;
    expect(dentroDoPrazoDeCancelamento([horas(6)], levantamento, agora, BASE)).toBe(
      false,
    );
  });
});

describe("configuração inválida rebenta em vez de calcular", () => {
  const agora = lisboa("2026-10-05 15:00");

  it("horas negativas", () => {
    expect(() => prontoEm([horas(-1)], agora, BASE)).toThrow(RangeError);
  });

  it("dias com casas decimais", () => {
    expect(() => prontoEm([dias(1.5)], agora, BASE)).toThrow(RangeError);
  });

  it("uma hora que não existe", () => {
    const config = com({ loja: todosOsDias({ abre: "07:00", fecha: "25:00" }) });
    expect(() => vagas([horas(0)], agora, config)).toThrow(RangeError);
  });

  it("dois períodos sobrepostos, que contavam horas a dobrar", () => {
    const config = com({
      cozinha: todosOsDias(
        { abre: "08:00", fecha: "14:00" },
        { abre: "12:00", fecha: "18:00" },
      ),
    });
    expect(() => prontoEm([horas(1)], agora, config)).toThrow(RangeError);
  });

  it("um intervalo que fecha antes de abrir", () => {
    const config = com({ cozinha: todosOsDias({ abre: "18:00", fecha: "08:00" }) });
    expect(() => prontoEm([horas(1)], agora, config)).toThrow(RangeError);
  });
});

describe("o módulo não lê o relógio", () => {
  it("não há new Date, Date.now nem leituras da hora local em horarios.ts", () => {
    const fonte = readFileSync(
      fileURLToPath(new URL("./horarios.ts", import.meta.url)),
      "utf8",
    );
    expect(fonte).not.toMatch(/new Date\b|Date\.now|\.getHours\(|\.getDay\(/);
  });
});
