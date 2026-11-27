type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const nome = (pessoa: string) => `damira:compra:${pessoa}`;
const valida = (chave: string | null): chave is string =>
  chave !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chave);

/** sessionStorage sobrevive a recarregar, sem partilhar a tentativa entre separadores. */
export function chaveDaCompra(armazenamento: Armazenamento | null, pessoa: string, emMemoria: string | null = null): string {
  let chave = emMemoria;
  try {
    const guardada = armazenamento?.getItem(nome(pessoa)) ?? null;
    if (valida(guardada)) return guardada;
  } catch { /* Modo privado ou armazenamento bloqueado: a tentativa fica em memória. */ }
  if (!valida(chave)) chave = crypto.randomUUID();
  try {
    armazenamento?.setItem(nome(pessoa), chave);
  } catch { /* Não se impede um pedido por uma preferência de armazenamento. */ }
  return chave;
}

/** Uma resposta atrasada nunca apaga a chave de uma tentativa mais recente. */
export function concluirCompra(armazenamento: Armazenamento | null, pessoa: string, chave: string): void {
  try {
    if (armazenamento?.getItem(nome(pessoa)) === chave) armazenamento.removeItem(nome(pessoa));
  } catch { /* O pedido já ficou gravado; a próxima tentativa recupera-o pela mesma chave. */ }
}
