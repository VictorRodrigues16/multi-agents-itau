export type AgentStatus =
  | 'idle'
  | 'spawning'
  | 'working'
  | 'reviewing'
  | 'completed'
  | 'blocked'
  | 'error'
  | 'timeout'

export type TeamId = 'orquestracao' | 'desenvolvimento' | 'testes' | 'documentacao'

export type TeamColor = 'orquestracao' | 'desenvolvimento' | 'testes' | 'documentacao'

export type AgentModel = 'opus' | 'sonnet' | 'haiku'

export type ViewMode = 'times' | 'pipeline' | 'projetos' | 'historico' | 'agentes'

export interface Projeto {
  id: string
  nome: string
  caminho: string
  stack?: string[]
  descricao?: string
  criado_em: string
  ativo: boolean
  git?: {
    branch: string | null
    arquivos_modificados: number
    last_commit?: string
  }
}

export interface TarefaHistorico {
  id: string
  titulo: string
  tipo: string
  projetos: string[]
  status: 'pendente' | 'em-execucao' | 'concluida' | 'falha'
  criado_em?: string
  inicio?: number
  fim?: number
  duracao_ms?: number
  veredicto?: 'PASS' | 'WARN' | 'FAIL'
  nota?: number
  agentes_envolvidos: string[]
  pdf?: { path: string; size_kb: number; existe: boolean }
}

export type PipelineStage =
  | 'analise'
  | 'desenvolvimento'
  | 'review'
  | 'testes'
  | 'documentacao'

export interface Agent {
  id: string
  name: string
  role: string
  team: TeamId
  status: AgentStatus
  model: AgentModel
  currentTask?: string | null
  currentSubtask?: string | null
  elapsedSeconds: number
  reviewTarget?: string | null
  reviewedBy?: string | null
  lastActivity?: string
  lastSummary?: string
  startTime?: number
}

export interface Team {
  id: TeamId
  name: string
  description: string
  color: TeamColor
  icon: string
  agents: Agent[]
}

export interface AgentEvent {
  ts: number
  tipo: 'spawning' | 'stopped' | 'log'
  agente: string
  taskId: string
  status?: 'success' | 'error'
  descricao: string
}

export interface ActivityEntry {
  id: string
  timestamp: Date
  agentId: string
  agentName: string
  teamColor: TeamColor
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface TaskInfo {
  id: string
  title: string
  stage: PipelineStage
  completedStages: PipelineStage[]
  startTime: number
}

export interface DashboardStats {
  tasksCompletedToday: number
  avgCompletionMinutes: number
  qualityGatePassed: number
  qualityGateFailed: number
  activeAgents: number
  totalAgents: number
  reviewsCompleted: number
  reportsGenerated: number
}

export interface TempAgent {
  id: string
  parent: string
  description: string
  startTime: number
}
