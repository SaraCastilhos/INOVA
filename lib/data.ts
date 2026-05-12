import type { Profissao, FormaIngresso, Universidade, Depoimento, RIASECQuestion } from './types'

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

export const PROFISSOES: Profissao[] = [
  // Realista
  { id: '1', nome: 'Engenheiro Civil', tipo: 'R', salario: 'R$ 8.000 - 15.000', descricao: 'Projeta e gerencia obras de construção.', areas: ['construção', 'infraestrutura'] },
  { id: '2', nome: 'Mecânico Industrial', tipo: 'R', salario: 'R$ 3.500 - 7.000', descricao: 'Realiza manutenção de máquinas e equipamentos.', areas: ['indústria', 'manutenção'] },
  
  // Investigativo
  { id: '3', nome: 'Cientista de Dados', tipo: 'I', salario: 'R$ 7.000 - 20.000', descricao: 'Analisa dados para decisões estratégicas.', areas: ['tecnologia', 'análise'] },
  { id: '4', nome: 'Pesquisador Científico', tipo: 'I', salario: 'R$ 5.000 - 12.000', descricao: 'Desenvolve pesquisas em laboratórios e universidades.', areas: ['pesquisa', 'ciência'] },
  
  // Artístico
  { id: '5', nome: 'Designer Gráfico', tipo: 'A', salario: 'R$ 3.500 - 10.000', descricao: 'Cria identidades visuais e materiais gráficos.', areas: ['design', 'comunicação'] },
  { id: '6', nome: 'Arquiteto', tipo: 'A', salario: 'R$ 5.000 - 15.000', descricao: 'Projeta espaços e edifícios com estética e funcionalidade.', areas: ['arquitetura', 'design'] },
  
  // Social
  { id: '7', nome: 'Psicólogo', tipo: 'S', salario: 'R$ 3.500 - 12.000', descricao: 'Auxilia pessoas em questões emocionais e comportamentais.', areas: ['saúde mental', 'terapia'] },
  { id: '8', nome: 'Professor', tipo: 'S', salario: 'R$ 2.500 - 8.000', descricao: 'Educa e orienta estudantes em diversas áreas.', areas: ['educação', 'ensino'] },
  
  // Empreendedor
  { id: '9', nome: 'Administrador de Empresas', tipo: 'E', salario: 'R$ 4.000 - 15.000', descricao: 'Gerencia recursos e processos organizacionais.', areas: ['gestão', 'negócios'] },
  { id: '10', nome: 'Gerente de Vendas', tipo: 'E', salario: 'R$ 5.000 - 20.000', descricao: 'Lidera equipes comerciais e estratégias de vendas.', areas: ['vendas', 'liderança'] },
  
  // Convencional
  { id: '11', nome: 'Contador', tipo: 'C', salario: 'R$ 4.000 - 12.000', descricao: 'Gerencia finanças e obrigações fiscais.', areas: ['finanças', 'contabilidade'] },
  { id: '12', nome: 'Analista de Sistemas', tipo: 'C', salario: 'R$ 5.000 - 15.000', descricao: 'Desenvolve e mantém sistemas de informação.', areas: ['tecnologia', 'sistemas'] },
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

export const DEPOIMENTOS_INICIAIS: Depoimento[] = [
  {
    id: '1',
    profissao: 'Psicóloga',
    autor: 'Ana Carolina',
    tempoExperiencia: '8 anos',
    tipoRIASEC: 'S',
    depoimento: 'O que mais me surpreendeu na psicologia foi a intensidade emocional do trabalho. Cada sessão é única e me ensina algo novo sobre a natureza humana. É desafiador manter o equilíbrio entre empatia e profissionalismo, mas extremamente gratificante ver a evolução dos pacientes.',
    conselho: 'Prepare-se para uma jornada de autoconhecimento constante. Você vai precisar de supervisão e terapia pessoal, e isso é parte essencial da formação.',
    diaTipico: 'Atendo em média 6 pacientes por dia, intercalando com pausas para registros e estudos de caso.',
    melhorParte: 'Ver a transformação e crescimento das pessoas que acompanho.',
    piorParte: 'A carga emocional pode ser pesada em alguns casos.',
    tags: ['saúde mental', 'clínica', 'atendimento'],
    status: 'aprovado',
    dataEnvio: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    profissao: 'Engenheiro de Software',
    autor: 'Lucas Mendes',
    tempoExperiencia: '5 anos',
    tipoRIASEC: 'I',
    depoimento: 'A tecnologia muda muito rápido, o que é desafiador e empolgante ao mesmo tempo. Trabalho remoto me deu qualidade de vida, mas exige muita disciplina. O mais legal é ver sistemas que criei sendo usados por milhares de pessoas.',
    conselho: 'Nunca pare de estudar. Tecnologias vêm e vão, mas os fundamentos de lógica e arquitetura permanecem. E invista em soft skills também!',
    diaTipico: 'Reuniões de alinhamento pela manhã, desenvolvimento focado à tarde, code review no final do dia.',
    melhorParte: 'Criar soluções que impactam a vida das pessoas e trabalhar com autonomia.',
    piorParte: 'Pressão por prazos e a necessidade constante de atualização.',
    tags: ['tecnologia', 'desenvolvimento', 'remoto'],
    status: 'aprovado',
    dataEnvio: '2024-02-20T14:30:00Z'
  },
  {
    id: '3',
    profissao: 'Designer Gráfico',
    autor: 'Marina Santos',
    tempoExperiencia: '10 anos',
    tipoRIASEC: 'A',
    depoimento: 'Trabalhar com criatividade é libertador, mas prazos apertados existem e fazem parte da rotina. O mercado é competitivo, então é importante ter um portfólio forte e se especializar em alguma área. Adoro quando um cliente se emociona ao ver sua marca finalizada.',
    conselho: 'Desenvolva um estilo próprio, mas saiba também se adaptar às necessidades do cliente. E nunca trabalhe de graça achando que é exposição!',
    diaTipico: 'Briefing com clientes, brainstorm de ideias, execução criativa e apresentação de propostas.',
    melhorParte: 'A liberdade criativa e ver ideias se tornarem realidade.',
    piorParte: 'Clientes que pedem muitas alterações ou não valorizam o trabalho criativo.',
    tags: ['design', 'criatividade', 'freelancer'],
    status: 'aprovado',
    dataEnvio: '2024-03-10T09:15:00Z'
  },
  {
    id: '4',
    profissao: 'Administrador de Empresas',
    autor: 'Roberto Silva',
    tempoExperiencia: '12 anos',
    tipoRIASEC: 'E',
    depoimento: 'Liderar pessoas é a parte mais difícil e mais gratificante da minha carreira. Passei por várias áreas: RH, finanças, operações. Essa visão ampla é o diferencial de um bom administrador. Hoje gerencio uma equipe de 30 pessoas e cada dia é um aprendizado.',
    conselho: 'Busque experiências diversas no início da carreira para entender qual área te motiva mais. E lembre-se: resultados vêm através das pessoas.',
    diaTipico: 'Reuniões estratégicas, análise de indicadores, alinhamento com equipes e resolução de problemas.',
    melhorParte: 'Ver o crescimento da equipe e os resultados do trabalho coletivo.',
    piorParte: 'Tomar decisões difíceis que afetam a vida das pessoas.',
    tags: ['gestão', 'liderança', 'negócios'],
    status: 'aprovado',
    dataEnvio: '2024-04-05T11:45:00Z'
  },
]
