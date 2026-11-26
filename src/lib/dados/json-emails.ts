import { JANELA_RESERVA_MS, MAXIMO_TENTATIVAS, modeloSuportado, reservaDisponivel } from "@/lib/emails/emissor";
import type { FonteEmails, LinhaEmail, Pedido } from "./tipos";

/** Só para a fonte provisória e testes; uma fila em memória não serve envios reais. */
export function criarEmailsJson(pedidos: () => Pedido[], linhas: LinhaEmail[] = []): FonteEmails {
  const fila = structuredClone(linhas);
  const recibos = ["criado-confirmado-cliente", "criado-por-confirmar-cliente"];
  const anterior = (a: LinhaEmail, b: LinhaEmail) => {
    const prioridade = Number(!recibos.includes(a.modelo)) - Number(!recibos.includes(b.modelo));
    return prioridade < 0 || (prioridade === 0 && (+a.criadoEm < +b.criadoEm || (+a.criadoEm === +b.criadoEm && a.id < b.id)));
  };
  const temAnterior = (linha: LinhaEmail, agora: Date, soIndisponiveis = false) => fila.some(l =>
    modeloSuportado(l.modelo) && l.pedidoId === linha.pedidoId && l.destinatario === linha.destinatario && anterior(l, linha) &&
    l.enviadoEm === null && (l.tentativas < MAXIMO_TENTATIVAS ||
      (l.ultimoErro === null && l.ultimaTentativaEm !== null && +l.ultimaTentativaEm + JANELA_RESERVA_MS > +agora)) &&
    (!soIndisponiveis || !reservaDisponivel(l, agora)));
  const minha = (reserva: LinhaEmail) => fila.find(l => l.id === reserva.id && l.enviadoEm === null &&
    l.tentativas === reserva.tentativas && l.ultimaTentativaEm?.getTime() === reserva.ultimaTentativaEm?.getTime());
  return {
    async emailsPendentes({ agora, limite }) {
      return structuredClone(fila.filter(l => modeloSuportado(l.modelo) && reservaDisponivel(l, agora) && !temAnterior(l, agora, true))
        .sort((a, b) => +a.criadoEm - +b.criadoEm || a.id.localeCompare(b.id)).slice(0, limite));
    },
    async reservarEmail(id, agora) {
      const linha = fila.find(l => l.id === id);
      if (!linha || !modeloSuportado(linha.modelo) || !reservaDisponivel(linha, agora)) return null;
      if (temAnterior(linha, agora)) return null;
      linha.tentativas++; linha.ultimaTentativaEm = agora; linha.ultimoErro = null;
      return structuredClone(linha);
    },
    async marcarEmailEnviado(reserva, agora) {
      const linha = minha(reserva);
      if (linha) { linha.enviadoEm = agora; linha.ultimoErro = null; }
    },
    async registarFalhaEmail(reserva, codigo, definitiva) {
      const linha = minha(reserva);
      if (linha) { linha.ultimoErro = codigo; if (definitiva) linha.tentativas = MAXIMO_TENTATIVAS; }
    },
    async pedidoDoEmail(id) { return structuredClone(pedidos().find(p => p.id === id) ?? null); },
    async emailsFalhados(limite) {
      return structuredClone(fila.filter(l => l.enviadoEm === null && (l.ultimoErro !== null || l.tentativas >= MAXIMO_TENTATIVAS))
        .slice(0, limite).map(l => ({ ...l, saltado: l.ultimoErro?.startsWith("saltado: ") ?? false })));
    },
  };
}
