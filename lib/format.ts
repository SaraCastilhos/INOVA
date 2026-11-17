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

// Os salários do guia vêm, quase todos, do Novo CAGED (via Portal Salário):
// registros de contratações e desligamentos com carteira assinada. Isso fica
// abaixo do que ganha quem tem muitos anos na área — usuário do teste piloto
// (17/11/2026) achou os valores "abaixo da média de mercado". A exceção são
// cargos de concurso, cuja fonte é a tabela de vencimentos.
export const salarioEhCaged = (fonte: string) => /Novo CAGED/i.test(fonte)
