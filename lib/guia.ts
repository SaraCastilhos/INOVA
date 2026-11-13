import type { FormaIngresso } from './types'

// Dados do guia de carreiras. As profissões vivem em data/professions.json
// (conteúdo curado e versionado) e são reexportadas daqui; formas de ingresso
// ficam neste arquivo; instituições e cursos, em data/cursos.json (lib/cursos.ts).
export { PROFISSOES, AREAS, guiaAtualizadoEm } from './professions'

export const FORMAS_INGRESSO: FormaIngresso[] = [
  {
    id: '1',
    nome: 'Exame Nacional do Ensino Médio',
    sigla: 'ENEM',
    descricao: 'Prova nacional que avalia o desempenho de estudantes do ensino médio e serve como porta de entrada para diversas universidades.',
    publicoAlvo: 'Estudantes que concluíram ou estão concluindo o ensino médio.',
    requisitos: ['Inscrição no período determinado', 'Pagamento da taxa (isenções disponíveis)', 'Documento de identidade válido'],
    link: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem'
  },
  {
    id: '2',
    nome: 'Sistema de Seleção Unificada',
    sigla: 'SISU',
    descricao: 'Sistema informatizado do MEC que seleciona candidatos para vagas em instituições públicas de ensino superior usando a nota do ENEM.',
    publicoAlvo: 'Candidatos que realizaram o ENEM no ano anterior e não zeraram a redação.',
    requisitos: ['Nota do ENEM válida', 'Não ter zerado a redação', 'Inscrição gratuita no portal'],
    link: 'https://sisu.mec.gov.br'
  },
  {
    id: '3',
    nome: 'Programa Universidade para Todos',
    sigla: 'PROUNI',
    descricao: 'Programa do governo federal que concede bolsas de estudo integrais e parciais em instituições privadas de ensino superior.',
    publicoAlvo: 'Estudantes de baixa renda que cursaram ensino médio em escola pública ou bolsistas em escolas particulares.',
    requisitos: ['Renda familiar per capita máxima definida', 'Nota mínima de 450 pontos no ENEM', 'Não ter diploma de ensino superior'],
    link: 'https://prouniportal.mec.gov.br'
  },
  {
    id: '4',
    nome: 'Fundo de Financiamento Estudantil',
    sigla: 'FIES',
    descricao: 'Programa do governo federal de financiamento para estudantes em cursos superiores não gratuitos, com condições especiais de pagamento.',
    publicoAlvo: 'Estudantes matriculados em cursos superiores com avaliação positiva no MEC.',
    requisitos: ['Nota mínima no ENEM', 'Renda familiar dentro dos limites', 'Fiador ou FGEDUC'],
    link: 'https://fies.mec.gov.br'
  },
  {
    id: '5',
    nome: 'Vestibular Tradicional',
    sigla: 'Vestibular',
    descricao: 'Processo seletivo próprio de cada instituição de ensino, com provas específicas que avaliam conhecimentos do ensino médio.',
    publicoAlvo: 'Qualquer pessoa que tenha concluído o ensino médio.',
    requisitos: ['Inscrição na instituição desejada', 'Pagamento da taxa de inscrição', 'Documentos exigidos pela instituição'],
    link: '#'
  },
]

