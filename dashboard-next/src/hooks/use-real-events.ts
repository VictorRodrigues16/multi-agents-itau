'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type {
  Agent,
  AgentEvent,
  Team,
  ActivityEntry,
  TaskInfo,
  DashboardStats,
  TempAgent,
} from '@/types/agents'
import { INITIAL_TEAMS, AGENT_TEAM_COLOR, TOTAL_AGENTS } from '@/data/agents-config'

interface UseRealEventsResult {
  eventos: AgentEvent[]
  eventosGlobais: AgentEvent[]
  realActivities: ActivityEntry[]
  activeAgentIds: Set<string>
  hasRealEvents: boolean
  isConnected: boolean
  stats: DashboardStats
  currentTask: TaskInfo | null
  elapsedSeconds: number
  teams: Team[]
  outputFiles: Record<string, string | null>
  tempAgents: TempAgent[]
  isPaused: boolean
  togglePause: () => void
  clearEvents: () => void
  taskIdsConhecidos: string[]
}

export function useRealEvents(intervaloMs = 3000, taskFilter: string | null = null): UseRealEventsResult {
  const [eventosGlobais, setEventosGlobais] = useState<AgentEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const inicioTaskRef = useRef<number | null>(null)

  // Eventos filtrados (se taskFilter setado, só os daquela tarefa)
  const eventos = useMemo(() => {
    if (!taskFilter) return eventosGlobais
    return eventosGlobais.filter((e) => e.taskId === taskFilter)
  }, [eventosGlobais, taskFilter])

  // IDs de todas as tarefas conhecidas (sempre globais — pro switcher)
  const taskIdsConhecidos = useMemo(() => {
    const set = new Set<string>()
    for (const e of eventosGlobais) if (e.taskId) set.add(e.taskId)
    return Array.from(set).sort()
  }, [eventosGlobais])

  const fetchEventos = useCallback(async () => {
    if (isPaused) return
    try {
      const res = await fetch('/api/events', { cache: 'no-store' })
      if (!res.ok) {
        setIsConnected(false)
        return
      }
      const data = await res.json()
      setIsConnected(data.exists ?? false)

      const novos: AgentEvent[] = (data.eventos || []).map((e: Record<string, unknown>) => ({
        ts: typeof e.ts === 'number' ? e.ts : Date.parse(String(e.ts || '')),
        tipo: e.tipo as AgentEvent['tipo'],
        agente: String(e.agent_id || e.agente || ''),
        taskId: String(e.task_id || e.taskId || ''),
        status: e.status as AgentEvent['status'],
        descricao: String(e.descricao || e.description || ''),
      }))
      setEventosGlobais(novos)
    } catch {
      setIsConnected(false)
    }
  }, [isPaused])

  useEffect(() => {
    fetchEventos()
    const id = setInterval(fetchEventos, intervaloMs)
    return () => clearInterval(id)
  }, [fetchEventos, intervaloMs])

  // Atividades formatadas (newest first)
  const realActivities = useMemo<ActivityEntry[]>(() => {
    return [...eventos]
      .sort((a, b) => b.ts - a.ts)
      .map((e, idx) => ({
        id: `${e.ts}-${e.agente}-${idx}`,
        timestamp: new Date(e.ts),
        agentId: e.agente,
        agentName: e.agente,
        teamColor: AGENT_TEAM_COLOR[e.agente] ?? 'orquestracao',
        level:
          e.tipo === 'stopped'
            ? e.status === 'success'
              ? 'success'
              : 'error'
            : e.tipo === 'spawning'
              ? 'info'
              : 'info',
        message: e.descricao || (e.tipo === 'spawning' ? 'Iniciou' : e.tipo === 'stopped' ? 'Concluiu' : 'Log'),
      }))
  }, [eventos])

  // Calcula estado dos agentes a partir dos eventos
  const teams = useMemo<Team[]>(() => {
    const baseAgents = new Map<string, Agent>()
    for (const t of INITIAL_TEAMS) {
      for (const a of t.agents) {
        baseAgents.set(a.id, { ...a })
      }
    }

    const ordenados = [...eventos].sort((a, b) => a.ts - b.ts)
    const agora = Date.now()

    for (const ev of ordenados) {
      const ag = baseAgents.get(ev.agente)
      if (!ag) continue

      if (ev.tipo === 'spawning') {
        ag.status = 'working'
        ag.currentTask = ev.taskId
        ag.currentSubtask = ev.descricao
        ag.startTime = ev.ts
        ag.elapsedSeconds = (agora - ev.ts) / 1000
        ag.lastActivity = ev.descricao
      } else if (ev.tipo === 'stopped') {
        ag.status = ev.status === 'success' ? 'completed' : 'error'
        ag.lastSummary = ev.descricao
        ag.currentTask = null
        ag.currentSubtask = null
        ag.elapsedSeconds = ag.startTime ? (ev.ts - ag.startTime) / 1000 : ag.elapsedSeconds
        ag.lastActivity = ev.descricao
      } else if (ev.tipo === 'log') {
        ag.lastActivity = ev.descricao
        if (ag.status === 'working') ag.currentSubtask = ev.descricao
      }
    }

    // Renomeia status 'completed' para 'idle' se faz tempo (>30s)
    for (const ag of baseAgents.values()) {
      if (ag.status === 'completed' && ag.startTime && agora - ag.startTime > 60000) {
        // Mantem 'completed' por 60s, depois volta a idle visual
        // (mas mantemos os dados para historico)
      }
    }

    return INITIAL_TEAMS.map((t) => ({
      ...t,
      agents: t.agents.map((a) => baseAgents.get(a.id)!),
    }))
  }, [eventos])

  // Lista de IDs ativos
  const activeAgentIds = useMemo(() => {
    const set = new Set<string>()
    for (const t of teams) {
      for (const a of t.agents) {
        if (a.status === 'working' || a.status === 'reviewing' || a.status === 'spawning') {
          set.add(a.id)
        }
      }
    }
    return set
  }, [teams])

  // Tarefa "em foco": se filtrada, sempre é a filtrada; senão, a mais recente em execução
  const currentTask = useMemo<TaskInfo | null>(() => {
    let taskAlvo: string | null = taskFilter
    let primeiroSpawn: AgentEvent | undefined

    if (!taskAlvo) {
      // Modo Live: pega tarefa atualmente em execução
      const ativo = eventos
        .filter((e) => e.tipo === 'spawning' && e.taskId)
        .sort((a, b) => b.ts - a.ts)[0]
      if (!ativo) return null
      // Verifica se o orquestrador já encerrou essa task
      const ultimoStopped = eventos.find(
        (e) => e.tipo === 'stopped' && e.taskId === ativo.taskId && e.agente === 'orquestrador',
      )
      if (ultimoStopped && ultimoStopped.ts > ativo.ts) return null
      taskAlvo = ativo.taskId
      primeiroSpawn = ativo
    }

    if (!taskAlvo) return null

    const eventosDaTask = eventos.filter((e) => e.taskId === taskAlvo)
    if (eventosDaTask.length === 0) return null

    if (!primeiroSpawn) {
      primeiroSpawn = eventosDaTask
        .filter((e) => e.tipo === 'spawning')
        .sort((a, b) => a.ts - b.ts)[0]
    }

    const completados: TaskInfo['completedStages'] = []
    if (eventosDaTask.some((e) => e.agente === 'orquestrador' && e.tipo === 'stopped' && e.status === 'success'))
      completados.push('analise')
    if (eventosDaTask.some((e) => e.agente === 'dev-tech-lead' && e.tipo === 'stopped'))
      completados.push('desenvolvimento', 'review')
    if (eventosDaTask.some((e) => e.agente === 'teste-tech-lead' && e.tipo === 'stopped'))
      completados.push('testes')
    if (eventosDaTask.some((e) => e.agente === 'doc-especialista' && e.tipo === 'stopped'))
      completados.push('documentacao')

    // Stage atual: último agente que iniciou e não parou
    let stage: TaskInfo['stage'] = 'analise'
    const ultimoSpawn = eventosDaTask
      .filter((e) => e.tipo === 'spawning')
      .sort((a, b) => b.ts - a.ts)[0]
    if (ultimoSpawn) {
      if (ultimoSpawn.agente.startsWith('dev-')) stage = 'desenvolvimento'
      else if (ultimoSpawn.agente.startsWith('teste-')) stage = 'testes'
      else if (ultimoSpawn.agente === 'doc-especialista') stage = 'documentacao'
      else if (ultimoSpawn.agente === 'orquestrador') stage = 'analise'
    }

    return {
      id: taskAlvo,
      title: primeiroSpawn?.descricao || taskAlvo,
      stage,
      completedStages: completados,
      startTime: primeiroSpawn?.ts ?? eventosDaTask[0].ts,
    }
  }, [eventos, taskFilter])

  // Elapsed timer
  useEffect(() => {
    if (!currentTask) {
      setElapsedSeconds(0)
      inicioTaskRef.current = null
      return
    }
    inicioTaskRef.current = currentTask.startTime
    const id = setInterval(() => {
      if (inicioTaskRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - inicioTaskRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [currentTask])

  // Estatisticas
  const stats = useMemo<DashboardStats>(() => {
    const orquestradorStopped = eventos.filter(
      (e) => e.agente === 'orquestrador' && e.tipo === 'stopped' && e.status === 'success',
    )
    const qualityStopped = eventos.filter(
      (e) => e.agente === 'teste-quality-gate' && e.tipo === 'stopped',
    )
    const qualityPassed = qualityStopped.filter((e) => e.status === 'success').length
    const qualityFailed = qualityStopped.filter((e) => e.status === 'error').length

    const reviewsCompleted = eventos.filter(
      (e) =>
        e.tipo === 'stopped' &&
        e.status === 'success' &&
        (e.descricao || '').toLowerCase().includes('review'),
    ).length

    const reportsGenerated = eventos.filter(
      (e) => e.agente === 'doc-especialista' && e.tipo === 'stopped' && e.status === 'success',
    ).length

    // Tempo medio de conclusao (em minutos, baseado em tarefas concluidas com orquestrador)
    let avgMs = 0
    if (orquestradorStopped.length > 0) {
      const taskTimes = new Map<string, { inicio?: number; fim?: number }>()
      for (const e of eventos) {
        if (!e.taskId) continue
        if (e.agente === 'orquestrador') {
          const t = taskTimes.get(e.taskId) || {}
          if (e.tipo === 'spawning' && !t.inicio) t.inicio = e.ts
          if (e.tipo === 'stopped') t.fim = e.ts
          taskTimes.set(e.taskId, t)
        }
      }
      const duracoes: number[] = []
      for (const t of taskTimes.values()) {
        if (t.inicio && t.fim) duracoes.push(t.fim - t.inicio)
      }
      if (duracoes.length > 0) {
        avgMs = duracoes.reduce((s, d) => s + d, 0) / duracoes.length
      }
    }

    return {
      tasksCompletedToday: orquestradorStopped.length,
      avgCompletionMinutes: Math.round(avgMs / 60000) || 0,
      qualityGatePassed: qualityPassed,
      qualityGateFailed: qualityFailed,
      activeAgents: activeAgentIds.size,
      totalAgents: TOTAL_AGENTS,
      reviewsCompleted,
      reportsGenerated,
    }
  }, [eventos, activeAgentIds])

  const togglePause = useCallback(() => setIsPaused((p) => !p), [])
  const clearEvents = useCallback(async () => {
    try {
      await fetch('/api/events', { method: 'DELETE' })
      setEventosGlobais([])
    } catch {
      // ignora
    }
  }, [])

  return {
    eventos,
    eventosGlobais,
    realActivities,
    activeAgentIds,
    hasRealEvents: eventos.length > 0,
    isConnected,
    stats,
    currentTask,
    elapsedSeconds,
    teams,
    outputFiles: {},
    tempAgents: [],
    isPaused,
    togglePause,
    clearEvents,
    taskIdsConhecidos,
  }
}
