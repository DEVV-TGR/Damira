"use client";

/**
 * ⚠️ **Nunca uma página em branco** (`robustez.md`). No tablet do balcão, um
 * ecrã branco lê-se como «o painel está desligado», e ninguém sabe se há
 * pedidos. Diz o que aconteceu e dá as duas saídas.
 */
export default function ErroPainel({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-tijolo">Painel</p>
      <h1 className="titulo-display mt-2 text-4xl">Algo correu mal</h1>
      <p className="mt-4 text-tinta-suave">
        O painel não conseguiu mostrar esta página. Os pedidos continuam guardados — tente outra vez, ou
        recarregue.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="premivel min-h-14 rounded-full bg-tijolo px-8 text-sm font-semibold uppercase tracking-widest text-papel"
        >
          Tentar outra vez
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-14 rounded-full border border-tinta/25 px-8 text-sm font-semibold uppercase tracking-widest"
        >
          Recarregar
        </button>
      </div>
    </main>
  );
}
