import { RIASEC_INFO, type RIASECType } from '@/lib/types'

// Hexágono de Holland com a forma do perfil: cada vértice é um tipo (mesma
// ordem e posição do hexágono da landing: R no alto à esquerda, sentido
// horário) e a distância do centro é a pontuação do tipo. Os tipos
// predominantes ganham ponto maior e rótulo colorido.

const ORDEM: RIASECType[] = ['R', 'I', 'A', 'S', 'E', 'C']
const RAIO = 92

// Ângulo de cada vértice em coordenadas de tela (y para baixo).
const angulo = (i: number) => ((-120 + i * 60) * Math.PI) / 180

const ponto = (i: number, r: number) => [Math.cos(angulo(i)) * r, Math.sin(angulo(i)) * r] as const

const fmt = (n: number) => (Math.round(n * 10) / 10).toString()

const poligono = (raioDe: (tipo: RIASECType) => number) =>
  ORDEM.map((tipo, i) => ponto(i, raioDe(tipo)).map(fmt).join(',')).join(' ')

interface HexagonoResultadoProps {
  scores: Record<RIASECType, number>
  max: number
  destaques: RIASECType[]
}

export function HexagonoResultado({ scores, max, destaques }: HexagonoResultadoProps) {
  const raioDoScore = (tipo: RIASECType) => (RAIO * Math.min(scores[tipo], max)) / max

  return (
    <svg
      viewBox="-200 -122 400 254"
      className="w-full h-auto"
      role="img"
      aria-label={`Hexágono RIASEC com as pontuações: ${ORDEM.map(
        (t) => `${RIASEC_INFO[t].nome} ${scores[t]} de ${max}`,
      ).join(', ')}`}
    >
      {/* Anéis de 25%, 50%, 75% e 100% da pontuação máxima */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={poligono(() => RAIO * f)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={f === 1 ? 1.5 : 1}
        />
      ))}
      {ORDEM.map((tipo, i) => {
        const [x, y] = ponto(i, RAIO)
        return <line key={tipo} x1={0} y1={0} x2={fmt(x)} y2={fmt(y)} stroke="var(--border)" />
      })}

      <polygon
        points={poligono(raioDoScore)}
        fill="var(--primary)"
        fillOpacity={0.14}
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {ORDEM.map((tipo, i) => {
        const [x, y] = ponto(i, raioDoScore(tipo))
        const destaque = destaques.includes(tipo)
        return (
          <circle
            key={tipo}
            cx={fmt(x)}
            cy={fmt(y)}
            r={destaque ? 5 : 3}
            fill={destaque ? RIASEC_INFO[tipo].corForte : 'var(--muted-foreground)'}
            stroke="var(--card)"
            strokeWidth={1.5}
          />
        )
      })}

      {ORDEM.map((tipo, i) => {
        // Rótulo em duas linhas (letra em cima, nome embaixo) para caber nas
        // laterais: Artístico e Convencional ficam à direita/esquerda do
        // hexágono; os outros quatro, acima ou abaixo dos vértices.
        const [x, y] = ponto(i, RAIO + 14)
        const destaque = destaques.includes(tipo)
        const ancora = Math.abs(y) < 5 ? (x > 0 ? 'start' : 'end') : 'middle'
        const topo = Math.abs(y) < 5 ? y - 6 : y < 0 ? y - 24 : y + 4
        return (
          <text key={tipo} textAnchor={ancora} aria-hidden="true">
            <tspan
              x={fmt(x)}
              y={fmt(topo + 14)}
              fontSize={16}
              fontWeight={800}
              fill={destaque ? RIASEC_INFO[tipo].corForte : 'var(--muted-foreground)'}
            >
              {tipo}
            </tspan>
            <tspan
              x={fmt(x)}
              y={fmt(topo + 29)}
              fontSize={12.5}
              fontWeight={destaque ? 600 : 400}
              fill={destaque ? 'var(--foreground)' : 'var(--muted-foreground)'}
            >
              {RIASEC_INFO[tipo].nome}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
