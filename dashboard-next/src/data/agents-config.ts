import type { Team, Agent } from '@/types/agents'

function mkAgent(opts: {
  id: string
  name: string
  role: string
  team: Team['id']
  model: Agent['model']
}): Agent {
  return {
    ...opts,
    status: 'idle',
    elapsedSeconds: 0,
    currentTask: null,
    currentSubtask: null,
    reviewTarget: null,
    reviewedBy: null,
  }
}

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'orquestracao',
    name: 'Orquestração',
    description: 'Coordena o fluxo da tarefa de ponta a ponta',
    color: 'orquestracao',
    icon: '◈',
    agents: [
      mkAgent({
        id: 'orquestrador',
        name: 'Orquestrador',
        role: 'Classifica, planeja e direciona',
        team: 'orquestracao',
        model: 'opus',
      }),
    ],
  },
  {
    id: 'desenvolvimento',
    name: 'Desenvolvimento',
    description: 'Tech Lead + 5 devs com review por sorteio',
    color: 'desenvolvimento',
    icon: '⬡',
    agents: [
      mkAgent({
        id: 'dev-tech-lead',
        name: 'Dev Tech Lead',
        role: 'Distribui subtarefas e coordena reviews',
        team: 'desenvolvimento',
        model: 'opus',
      }),
      ...[1, 2, 3, 4, 5].map((n) =>
        mkAgent({
          id: `dev-especialista-${n}`,
          name: `Dev ${n}`,
          role: 'Implementação + revisão sorteada',
          team: 'desenvolvimento',
          model: 'sonnet',
        }),
      ),
    ],
  },
  {
    id: 'testes',
    name: 'Testes',
    description: 'Quality Gate, cobertura, segurança e performance',
    color: 'testes',
    icon: '◉',
    agents: [
      mkAgent({
        id: 'teste-tech-lead',
        name: 'Teste Tech Lead',
        role: 'Coordena a esteira de qualidade',
        team: 'testes',
        model: 'opus',
      }),
      mkAgent({
        id: 'teste-quality-gate',
        name: 'Quality Gate',
        role: 'Format + lint + types + smells',
        team: 'testes',
        model: 'sonnet',
      }),
      mkAgent({
        id: 'teste-cobertura',
        name: 'Cobertura',
        role: 'Testes unitários / integração / e2e',
        team: 'testes',
        model: 'sonnet',
      }),
      mkAgent({
        id: 'teste-seguranca',
        name: 'Segurança',
        role: 'OWASP, dependências e secrets',
        team: 'testes',
        model: 'sonnet',
      }),
      mkAgent({
        id: 'teste-performance',
        name: 'Performance',
        role: 'Bundle, N+1, regressão',
        team: 'testes',
        model: 'sonnet',
      }),
    ],
  },
  {
    id: 'documentacao',
    name: 'Documentação',
    description: 'Compila a jornada e gera o relatório PDF',
    color: 'documentacao',
    icon: '✎',
    agents: [
      mkAgent({
        id: 'doc-especialista',
        name: 'Doc Especialista',
        role: 'Monta o PDF Itaú detalhado',
        team: 'documentacao',
        model: 'opus',
      }),
    ],
  },
]

export const ALL_AGENT_IDS = INITIAL_TEAMS.flatMap((t) => t.agents.map((a) => a.id))
export const TOTAL_AGENTS = ALL_AGENT_IDS.length

export const AGENT_TEAM_COLOR: Record<string, Team['color']> = INITIAL_TEAMS.reduce(
  (acc, team) => {
    for (const a of team.agents) acc[a.id] = team.color
    return acc
  },
  {} as Record<string, Team['color']>,
)

export const PIPELINE_STAGES = [
  { id: 'analise' as const, label: 'Análise', order: 1 },
  { id: 'desenvolvimento' as const, label: 'Desenvolvimento', order: 2 },
  { id: 'review' as const, label: 'Review', order: 3 },
  { id: 'testes' as const, label: 'Testes', order: 4 },
  { id: 'documentacao' as const, label: 'Documentação', order: 5 },
]
