"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

/**
 * ⚠️ **Nunca uma página em branco** (`robustez.md`), e sem isto o erro de um
 * componente também não chegava ao Sentry: fica preso na fronteira do React, e
 * o browser nunca o vê. Substitui o layout, por isso traz o seu `<html>`, e vive
 * fora do `next-intl`, por isso só fala português.
 */
export default function ErroGlobal({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
          <h1 className="titulo-display text-4xl">Algo correu mal</h1>
          <p className="mt-4 text-tinta-suave">
            Não conseguimos mostrar esta página. O seu cesto continua guardado: recarregue, ou tente outra vez daqui a
            pouco.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="premivel min-h-14 rounded-full bg-tijolo px-8 text-sm font-semibold uppercase tracking-widest text-papel"
            >
              Recarregar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
