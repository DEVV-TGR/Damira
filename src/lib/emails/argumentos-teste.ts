import type { Locale } from "../../i18n/routing";
import { MODELOS_EMAIL, type ModeloEmail } from "./tipos";

export function validarEmailTeste(valor: string): string {
  const email = valor.trim();
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) {
    throw new Error(`Email inválido: ${email}`);
  }
  return email;
}

export function lerArgumentosTeste(argumentos: string[]) {
  const opcoes: {
    para: string[];
    enviar: boolean;
    modelo?: ModeloEmail;
    lingua?: Locale;
    responderPara?: string;
  } = { para: [], enviar: false };
  const vistos = new Set<string>();
  for (let indice = 0; indice < argumentos.length; indice++) {
    const argumento = argumentos[indice];
    if (!["--para", "--modelo", "--lingua", "--responder-para", "--enviar"].includes(argumento)) {
      throw new Error(`Opção desconhecida: ${argumento}`);
    }
    if (vistos.has(argumento)) throw new Error(`Opção repetida: ${argumento}`);
    vistos.add(argumento);
    if (argumento === "--enviar") {
      opcoes.enviar = true;
      continue;
    }
    const valor = argumentos[++indice];
    if (!valor || valor.startsWith("--")) throw new Error(`Falta o valor de ${argumento}.`);
    switch (argumento) {
      case "--para":
        opcoes.para = valor.split(",").map(validarEmailTeste);
        if (opcoes.para.length > 5) throw new Error("--para aceita no máximo 5 destinatários.");
        break;
      case "--modelo":
        if (!MODELOS_EMAIL.includes(valor as ModeloEmail)) {
          throw new Error(`Modelo inválido: ${valor}. Modelos: ${MODELOS_EMAIL.join(", ")}`);
        }
        opcoes.modelo = valor as ModeloEmail;
        break;
      case "--lingua":
        if (valor !== "pt" && valor !== "en") throw new Error("--lingua aceita apenas pt ou en.");
        opcoes.lingua = valor;
        break;
      case "--responder-para":
        opcoes.responderPara = validarEmailTeste(valor);
        break;
    }
  }
  if (!opcoes.para.length) throw new Error("--para <email> é obrigatório; não há destinatário por defeito.");
  return opcoes;
}
