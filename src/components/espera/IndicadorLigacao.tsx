"use client";

import { useLinkStatus } from "next/link";

export function IndicadorLigacao() {
  const { pending } = useLinkStatus();
  return pending ? <span hidden className="etapa-espera-ligacao" /> : null;
}
