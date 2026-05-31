import type { AgentStatus, TeamColor } from '@/types/agents'

export function getTeamColorVar(color: TeamColor): string {
  return `var(--color-${color})`
}

export function getTeamColorDim(color: TeamColor): string {
  return `var(--color-${color}-dim)`
}

export function getTeamColorGlow(color: TeamColor): string {
  return `var(--color-${color}-glow)`
}

export function getTeamColorValue(color: TeamColor): string {
  const mapa: Record<TeamColor, string> = {
    orquestracao: '#ec7000',
    desenvolvimento: '#22c55e',
    testes: '#3b82f6',
    documentacao: '#a855f7',
  }
  return mapa[color] || '#ec7000'
}

export function getStatusColor(status: AgentStatus): string {
  const mapa: Record<AgentStatus, string> = {
    idle: 'var(--status-idle)',
    spawning: 'var(--status-spawning)',
    working: 'var(--status-working)',
    reviewing: 'var(--status-reviewing)',
    completed: 'var(--status-completed)',
    blocked: 'var(--status-blocked)',
    error: 'var(--color-rose)',
    timeout: 'var(--color-amber)',
  }
  return mapa[status]
}

export function getStatusLabel(status: AgentStatus): string {
  const mapa: Record<AgentStatus, string> = {
    idle: 'Aguardando',
    spawning: 'Iniciando',
    working: 'Trabalhando',
    reviewing: 'Revisando',
    completed: 'Concluido',
    blocked: 'Bloqueado',
    error: 'Erro',
    timeout: 'Timeout',
  }
  return mapa[status]
}

export function formatElapsed(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const mr = m % 60
  return `${h}h ${mr}m`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
