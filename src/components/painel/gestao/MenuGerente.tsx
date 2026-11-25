"use client";

import { useEffect, useRef, useState } from "react";

/**
 * # Os três menus da gerente — Produtos, Pedidos, Loja (proposta de 25/11)
 *
 * Substituem a fila de sete separadores, que no telemóvel rolava para o lado e
 * escondia metade. Cada menu abre uma lista curta; escolher fecha-a e as
 * migalhas por baixo dizem onde se está.
 *
 * É um *disclosure* (botão + lista de botões) e não um `role="menu"`: com Tab
 * percorre-se como tudo o resto, e não é preciso ensinar as setas a ninguém.
 * Escape e um toque fora fecham, e o foco volta ao botão do menu.
 *
 * ⚠️ No telemóvel a lista abre **à largura da barra** e não do botão: o menu
 * «Loja» fica encostado à direita, e uma lista de 16 rem presa a ele saía do
 * ecrã a 320 px. Por isso o `relative` do botão só liga a partir do `sm`.
 */

export type ItemMenu<V extends string> = { id: V; rotulo: string; contagem?: number; alerta?: boolean };
export type Menu<V extends string> = { id: string; rotulo: string; icone: React.ReactNode; itens: ItemMenu<V>[] };

export function MenusGerente<V extends string>({
  menus,
  vista,
  onEscolher,
}: {
  menus: Menu<V>[];
  vista: V;
  onEscolher: (vista: V) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(null);
      botoes.current[aberto]?.focus();
    };
    const fora = (e: PointerEvent) => {
      if (!barra.current?.contains(e.target as Node)) setAberto(null);
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", fora);
    };
  }, [aberto]);

  return (
    <div ref={barra} className="relative grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
      {menus.map((menu) => {
        const atual = menu.itens.some((i) => i.id === vista);
        const alerta = menu.itens.some((i) => i.alerta);
        const idLista = `menu-gerente-${menu.id}`;
        return (
          <div key={menu.id} className="sm:relative">
            <button
              ref={(b) => {
                botoes.current[menu.id] = b;
              }}
              type="button"
              aria-expanded={aberto === menu.id}
              aria-controls={idLista}
              onClick={() => setAberto(aberto === menu.id ? null : menu.id)}
              className={`premivel relative inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full px-2 text-sm sm:gap-2 sm:px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijolo ${
                atual ? "bg-tijolo text-papel" : "border border-tinta/15 bg-papel"
              }`}
            >
              <span aria-hidden className="hidden sm:inline-flex">
                {menu.icone}
              </span>
              {menu.rotulo}
              {/* Abaixo de 360 px, um terço da barra não leva «Produtos» e a seta
                  juntos: a seta saía do botão. O `aria-expanded` diz o mesmo. */}
              <span className="max-[359px]:hidden">
                <Seta aberta={aberto === menu.id} />
              </span>
              {alerta && !atual && (
                <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-papel bg-tijolo">
                  <span className="sr-only"> · precisa de atenção</span>
                </span>
              )}
            </button>
            {aberto === menu.id && (
              <ul
                id={idLista}
                aria-label={menu.rotulo}
                className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-tinta/15 bg-papel p-2 shadow-lg sm:left-auto sm:right-0 sm:w-64"
              >
                <li aria-hidden className="px-3 pb-1 pt-1 text-xs font-semibold text-tinta-suave">
                  {menu.rotulo}
                </li>
                {menu.itens.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={item.id === vista ? "page" : undefined}
                      onClick={() => {
                        setAberto(null);
                        onEscolher(item.id);
                      }}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-tijolo ${
                        item.id === vista ? "bg-tijolo/10 font-semibold text-tijolo" : "hover:bg-tinta/5"
                      }`}
                    >
                      <span className="mr-auto">{item.rotulo}</span>
                      {item.contagem !== undefined && item.contagem > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            item.alerta ? "bg-tijolo text-papel" : "bg-tinta/10"
                          }`}
                        >
                          {item.contagem}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Onde se está: «Pedidos › Levantam hoje». */
export function Migalhas<V extends string>({ menus, vista }: { menus: Menu<V>[]; vista: V }) {
  const menu = menus.find((m) => m.itens.some((i) => i.id === vista));
  const item = menu?.itens.find((i) => i.id === vista);
  if (!menu || !item) return null;
  return (
    <p className="mt-3 text-sm text-tinta-suave">
      {menu.rotulo} <span aria-hidden>›</span>
      <span className="sr-only">,</span> <span className="font-semibold text-tinta">{item.rotulo}</span>
    </p>
  );
}

function Seta({ aberta }: { aberta: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={`block size-3 transition-transform ${aberta ? "rotate-180" : ""}`}>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Ícones de traço, desenhados aqui: sem pacote nem fonte de ícones de fora. */
const traco = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ICONES = {
  produtos: (
    <svg viewBox="0 0 16 16" className="size-4">
      <path {...traco} d="M8 1.75 14 4.5v7L8 14.25 2 11.5v-7L8 1.75Zm0 0v12.5M2 4.5l6 2.75 6-2.75" />
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 16 16" className="size-4">
      <path {...traco} d="M3.5 1.75h9v12.5h-9zM5.75 5h4.5M5.75 8h4.5M5.75 11h2.5" />
    </svg>
  ),
  loja: (
    <svg viewBox="0 0 16 16" className="size-4">
      <path {...traco} d="M2 6.25 3.25 2h9.5L14 6.25M2 6.25h12M2 6.25v7.5h12v-7.5M6.25 13.75V9.5h3.5v4.25" />
    </svg>
  ),
};
