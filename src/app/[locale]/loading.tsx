export default function ACarregarPagina() {
  // Se a estrutura da rota chegou primeiro, a espera do layout fica visível
  // até o Next substituir este fallback pelo conteúdo ou pelo erro da página.
  return <div aria-hidden className="etapa-espera-rota min-h-[55vh]" />;
}
