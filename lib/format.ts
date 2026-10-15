// Helpers de formatação usados tanto na lista do guia de profissões
// (careers-section.tsx) quanto na página de detalhe (app/profissoes/[slug]).

export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const fmtData = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
