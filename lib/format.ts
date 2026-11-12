// Helpers de formatação usados tanto na lista do guia de profissões
// (careers-section.tsx) quanto na página de detalhe (app/profissoes/[slug]).

export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const fmtData = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// Para busca: tira acentos e caixa, assim "medico" acha "Médico" e
// "tecnico" acha "Técnico em…".
export const normalizarBusca = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
