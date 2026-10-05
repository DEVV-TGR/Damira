"use client";

import { useMemo } from "react";
import { aoEscrever, ehPais, paises, PAIS_POR_DEFEITO } from "@/lib/telefone";

/**
 * O telefone, com o país (decidido a 05/10): um seletor com a bandeira e o
 * indicativo (🇵🇹 +351 por defeito) e o número, que se arruma enquanto se
 * escreve como o país o escreve — `911 222 333`.
 *
 * O seletor é um `<select>` nativo por baixo da bandeira: no telemóvel abre a
 * roda do sistema, com procura, e o teclado chega lá. O que se vê é só a
 * bandeira e o indicativo, que é o que importa ao escrever; o nome do país está
 * na lista e no `aria-label`.
 *
 * Quem valida é o servidor (`telefoneValido`), com os metadados completos.
 */
export function CampoTelefone({
  id,
  rotulo,
  rotuloPais,
  locale,
  pais,
  numero,
  erro,
  ajuda,
  aoMudarPais,
  aoMudarNumero,
}: {
  id: string;
  rotulo: string;
  rotuloPais: string;
  locale: string;
  pais: string;
  numero: string;
  erro?: string;
  ajuda?: string;
  aoMudarPais: (pais: string) => void;
  aoMudarNumero: (numero: string) => void;
}) {
  const lista = useMemo(() => paises(locale), [locale]);
  const codigo = ehPais(pais) ? pais : PAIS_POR_DEFEITO;
  const atual = lista.find((p) => p.codigo === codigo) ?? lista[0];

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        {rotulo}
      </label>
      <div className="mt-2 flex gap-2">
        <div className="relative shrink-0">
          {/* O que se vê; o `<select>` está por cima, invisível, e é ele que recebe o toque. */}
          <span
            aria-hidden
            className="flex h-full min-h-12 items-center gap-1.5 rounded-xl border border-tinta/20 bg-papel px-3 tabular-nums"
          >
            <span className="text-lg leading-none">{atual.bandeira}</span>
            {atual.indicativo}
            <span className="text-xs text-tinta-suave">▾</span>
          </span>
          <select
            name="pais"
            value={codigo}
            aria-label={`${rotuloPais}: ${atual.nome}`}
            onChange={(e) => {
              aoMudarPais(e.target.value);
              if (ehPais(e.target.value)) aoMudarNumero(aoEscrever(numero.replace(/[^\d+]/g, ""), e.target.value));
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {lista.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.bandeira} {p.nome} ({p.indicativo})
              </option>
            ))}
          </select>
        </div>
        <input
          id={id}
          name="telefone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel-national"
          value={numero}
          placeholder={codigo === "PT" ? "911 222 333" : undefined}
          onChange={(e) => aoMudarNumero(aoEscrever(e.target.value, codigo))}
          aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
          aria-invalid={erro ? true : undefined}
          /* `w-0 flex-1`: sem isto, a largura natural do campo (uns 20 caracteres)
             somava-se à da bandeira e a página ganhava rolagem a 320 px. */
          className="w-0 min-w-0 flex-1 rounded-xl border border-tinta/20 bg-papel px-4 py-3 tabular-nums placeholder:text-tinta-suave/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo"
        />
      </div>
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="mt-1.5 text-sm text-tinta-suave">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-sm font-semibold text-tijolo">
          {erro}
        </p>
      )}
    </div>
  );
}
