import { afterEach, expect, it, vi } from "vitest";
const { enviar, verificar, ligar } = vi.hoisted(() => ({ enviar: vi.fn(), verificar: vi.fn(), ligar: vi.fn(() => ({ db: {} })) }));
vi.mock("./enviar", () => ({ enviarEmailsPendentes: enviar }));
vi.mock("@/lib/dados/bd-neon", () => ({ baseDaNeon: ligar }));
vi.mock("@/lib/dados/bd-emails", () => ({ haEmailsDefinitivamenteFalhados: verificar }));
import { recuperarEmailsDoAmbiente } from "./recuperacao-servidor";
afterEach(() => vi.clearAllMocks());
it("um cron sem trabalho elegível não dá verde enquanto houver intervenção pendente", async () => {
  enviar.mockResolvedValue({ enviados: 0, falhados: 0, saltados: 0 }); verificar.mockResolvedValue(true);
  expect(await recuperarEmailsDoAmbiente(new Date())).toMatchObject({ paragem: "intervencao-necessaria" });
});
it("uma fila sem falhas terminais pode terminar normalmente", async () => {
  enviar.mockResolvedValue({ enviados: 0, falhados: 0, saltados: 0 }); verificar.mockResolvedValue(false);
  expect(await recuperarEmailsDoAmbiente(new Date())).toMatchObject({ paragem: "sem-trabalho" });
});
it("não acrescenta uma consulta se o envio já encontrou uma avaria", async () => {
  enviar.mockResolvedValue({ enviados: 0, falhados: 1, saltados: 0 });
  expect(await recuperarEmailsDoAmbiente(new Date())).toMatchObject({ paragem: "falha" });
  expect(verificar).not.toHaveBeenCalled(); expect(ligar).not.toHaveBeenCalled();
});
