import type { FormaIngresso, Universidade, RIASECQuestion } from './types'

// O guia de profissões vive em data/professions.json (conteúdo curado,
// versionado). Reexportado aqui para manter os imports existentes estáveis.
export { PROFISSOES, AREAS, guiaAtualizadoEm } from './professions'

// LEGADO — não é mais usado pelo app. O teste vocacional passou a usar o
// instrumento versionado em data/instruments/ (adaptação do O*NET Mini-IP), via
// lib/instruments.ts. Este array de 24 itens (escala 1–5) é o questionário
// caseiro que gerou os resultados marcados como 'riasec-legacy-24' no banco
// (migração 015). Mantido só como referência de proveniência desses resultados.
export const RIASEC_QUESTIONS: RIASECQuestion[] = [
  // Realista (R)
  { id: 1, tipo: 'R', texto: 'Gosto de trabalhar com ferramentas e equipamentos manuais.' },
  { id: 2, tipo: 'R', texto: 'Prefiro atividades que envolvam construir ou consertar coisas.' },
  { id: 3, tipo: 'R', texto: 'Me sinto bem trabalhando ao ar livre ou em ambientes práticos.' },
  { id: 4, tipo: 'R', texto: 'Gosto de usar as mãos para criar ou reparar objetos.' },
  
  // Investigativo (I)
  { id: 5, tipo: 'I', texto: 'Adoro resolver problemas complexos e fazer descobertas.' },
  { id: 6, tipo: 'I', texto: 'Gosto de pesquisar e analisar dados.' },
  { id: 7, tipo: 'I', texto: 'Tenho curiosidade por entender como as coisas funcionam.' },
  { id: 8, tipo: 'I', texto: 'Prefiro trabalhar com ideias e teorias do que com pessoas.' },
  
  // Artístico (A)
  { id: 9, tipo: 'A', texto: 'Tenho facilidade para me expressar através da arte, música ou escrita.' },
  { id: 10, tipo: 'A', texto: 'Valorizo a originalidade e a criatividade no trabalho.' },
  { id: 11, tipo: 'A', texto: 'Gosto de ambientes de trabalho não convencionais.' },
  { id: 12, tipo: 'A', texto: 'Me sinto inspirado por atividades que permitem inovação.' },
  
  // Social (S)
  { id: 13, tipo: 'S', texto: 'Sinto prazer em ajudar pessoas a resolverem seus problemas.' },
  { id: 14, tipo: 'S', texto: 'Gosto de ensinar ou orientar outras pessoas.' },
  { id: 15, tipo: 'S', texto: 'Tenho facilidade em me comunicar e trabalhar em equipe.' },
  { id: 16, tipo: 'S', texto: 'Me preocupo com o bem-estar das pessoas ao meu redor.' },
  
  // Empreendedor (E)
  { id: 17, tipo: 'E', texto: 'Gosto de liderar equipes e convencer pessoas.' },
  { id: 18, tipo: 'E', texto: 'Tenho interesse em negócios e em alcançar metas.' },
  { id: 19, tipo: 'E', texto: 'Me sinto motivado por desafios competitivos.' },
  { id: 20, tipo: 'E', texto: 'Gosto de tomar decisões e assumir riscos calculados.' },
  
  // Convencional (C)
  { id: 21, tipo: 'C', texto: 'Sou organizado e gosto de seguir procedimentos claros.' },
  { id: 22, tipo: 'C', texto: 'Prefiro trabalhos com instruções detalhadas e rotinas.' },
  { id: 23, tipo: 'C', texto: 'Tenho habilidade para trabalhar com números e dados.' },
  { id: 24, tipo: 'C', texto: 'Me sinto confortável em ambientes estruturados.' },
]

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

export const UNIVERSIDADES: Universidade[] = [
  {
    id: '1',
    nome: 'Faculdades Integradas de Taquara',
    sigla: 'FACCAT',
    cidade: 'Taquara',
    cursos: ['Administração', 'Direito', 'Psicologia', 'Engenharia de Produção', 'Sistemas de Informação'],
    formasIngresso: ['ENEM', 'Vestibular próprio', 'PROUNI', 'FIES'],
    link: 'https://www.faccat.br'
  },
  {
    id: '2',
    nome: 'Universidade Estadual do Rio Grande do Sul',
    sigla: 'UERGS',
    cidade: 'Várias unidades',
    cursos: ['Pedagogia', 'Gestão Ambiental', 'Administração', 'Desenvolvimento Rural'],
    formasIngresso: ['ENEM/SISU', 'Vestibular próprio'],
    link: 'https://www.uergs.edu.br'
  },
  {
    id: '3',
    nome: 'Universidade do Vale do Rio dos Sinos',
    sigla: 'UNISINOS',
    cidade: 'São Leopoldo',
    cursos: ['Engenharias', 'Medicina', 'Arquitetura', 'Comunicação Social', 'Ciências Contábeis'],
    formasIngresso: ['ENEM', 'Vestibular próprio', 'PROUNI', 'FIES'],
    link: 'https://www.unisinos.br'
  },
  {
    id: '4',
    nome: 'Universidade Feevale',
    sigla: 'FEEVALE',
    cidade: 'Novo Hamburgo',
    cursos: ['Design', 'Jogos Digitais', 'Moda', 'Enfermagem', 'Fisioterapia'],
    formasIngresso: ['ENEM', 'Vestibular próprio', 'PROUNI', 'FIES'],
    link: 'https://www.feevale.br'
  },
  {
    id: '5',
    nome: 'Pontifícia Universidade Católica do RS',
    sigla: 'PUCRS',
    cidade: 'Porto Alegre',
    cursos: ['Medicina', 'Direito', 'Engenharia de Software', 'Comunicação', 'Psicologia'],
    formasIngresso: ['ENEM', 'Vestibular próprio', 'PROUNI', 'FIES'],
    link: 'https://www.pucrs.br'
  },
]
