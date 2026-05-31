'use client'

import { useState, useMemo } from 'react'
import type { ViewMode } from '@/types/agents'
import { useRealEvents } from '@/hooks/use-real-events'
import { AGENT_TEAM_COLOR, INITIAL_TEAMS, TOTAL_AGENTS } from '@/data/agents-config'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import { StatusFilterBar } from '@/components/layout/status-filter-bar'
import { ActivityFeed } from '@/components/layout/activity-feed'
import { StatsPanel } from '@/components/stats/stats-panel'
import { TeamCard } from '@/components/teams/team-card'
import { AgentTerminal } from '@/components/teams/agent-terminal'
import { PipelineView } from '@/components/pipeline/pipeline-view'
import { ProjetosView } from '@/components/projetos/projetos-view'
import { HistoricoView } from '@/components/historico/historico-view'
import { AgentesView } from '@/components/agentes/agentes-view'
import { NovaTarefaModal } from '@/components/nova-tarefa/nova-tarefa-modal'
import { Notificacoes } from '@/components/notificacoes/notificacoes'
import { ExecutarFeedback, type ResultadoExecucao } from '@/components/historico/executar-feedback'
import { IconSearch } from '@/components/icons/icons'

export default function DashboardPage() {
  const [taskFilter, setTaskFilter] = useState<string | null>(null)

  const {
    eventos,
    eventosGlobais,
    realActivities,
    activeAgentIds,
    hasRealEvents,
    isConnected,
    stats,
    currentTask,
    elapsedSeconds,
    teams: realTeams,
    isPaused,
    togglePause,
    clearEvents,
    taskIdsConhecidos,
  } = useRealEvents(3000, taskFilter)

  const [viewMode, setViewMode] = useState<ViewMode>('times')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [terminalAgentId, setTerminalAgentId] = useState<string | null>(null)
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false)
  const [execFeedback, setExecFeedback] = useState<{ taskId: string; resultado: ResultadoExecucao } | null>(null)

  const teams = realTeams.length > 0 ? realTeams : INITIAL_TEAMS

  const visibleTeams = useMemo(() => {
    if (selectedTeamId === null) return teams
    return teams.filter((t) => t.id === selectedTeamId)
  }, [teams, selectedTeamId])

  const terminalAgent = useMemo(() => {
    if (!terminalAgentId) return null
    for (const t of teams) {
      const a = t.agents.find((x) => x.id === terminalAgentId)
      if (a) return { agent: a, color: t.color }
    }
    return null
  }, [terminalAgentId, teams])

  const handleAgentClick = (agentId: string | null) => {
    if (!agentId) {
      setTerminalAgentId(null)
      setSelectedAgentId(null)
      return
    }
    setSelectedAgentId(agentId)
    setTerminalAgentId(agentId)
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#FBF6EE',
        overflow: 'hidden',
      }}
    >
      <TopBar
        currentTask={currentTask}
        elapsedSeconds={elapsedSeconds}
        activeAgents={activeAgentIds.size}
        totalAgents={TOTAL_AGENTS}
        isPaused={isPaused}
        onTogglePause={togglePause}
        isConnected={isConnected}
        hasRealEvents={hasRealEvents}
        onNovaTarefa={() => setNovaTarefaOpen(true)}
        taskFilter={taskFilter}
        taskIdsConhecidos={taskIdsConhecidos}
        onSelectTask={setTaskFilter}
      />

      {taskFilter && (
        <div
          style={{
            background: 'linear-gradient(90deg, #FFE8D2 0%, #FFF6EC 100%)',
            borderBottom: '1px solid #EC7000',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#C75300',
            flexShrink: 0,
          }}
        >
          <IconSearch size={14} color="#C75300" strokeWidth={2} />
          <span style={{ fontWeight: 600 }}>
            Visualizando apenas{' '}
            <span className="mono" style={{ fontWeight: 700 }}>
              {taskFilter}
            </span>
            . Times, Pipeline e Feed estão isolados nesta tarefa.
          </span>
          <button
            onClick={() => setTaskFilter(null)}
            style={{
              marginLeft: 'auto',
              background: '#FFFFFF',
              border: '1px solid #EC7000',
              color: '#C75300',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ← Voltar pro Live
          </button>
        </div>
      )}

      <StatsPanel stats={stats} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar
          teams={teams}
          viewMode={viewMode}
          selectedTeamId={selectedTeamId}
          onSelectTeam={setSelectedTeamId}
          onChangeView={setViewMode}
        />

        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {viewMode === 'pipeline' && <PipelineView currentTask={currentTask} teams={teams} />}
          {viewMode === 'projetos' && <ProjetosView />}
          {viewMode === 'historico' && (
            <HistoricoView
              onAbrirTarefa={(taskId) => {
                setTaskFilter(taskId)
                setViewMode('times')
              }}
              onExecutarTarefa={(taskId, resultado) => {
                setExecFeedback({ taskId, resultado })
                if (resultado.iniciado) {
                  setTaskFilter(taskId)
                }
              }}
            />
          )}
          {viewMode === 'agentes' && <AgentesView />}
          {viewMode === 'times' && (
            <>
              <div style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <StatusFilterBar
                  teams={teams}
                  statusFilter={statusFilter}
                  onStatusFilter={setStatusFilter}
                />
              </div>
              <div
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {visibleTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    statusFilter={statusFilter}
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={handleAgentClick}
                    isHighlighted={selectedTeamId === team.id}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <ActivityFeed
          entries={realActivities}
          onClear={clearEvents}
          onAgentClick={handleAgentClick}
        />
      </div>

      {/* Terminal/modal do agente */}
      {terminalAgent && (
        <AgentTerminal
          agent={terminalAgent.agent}
          teamColor={terminalAgent.color}
          eventos={eventos}
          onClose={() => {
            setTerminalAgentId(null)
            setSelectedAgentId(null)
          }}
        />
      )}

      {/* Feedback de execução de tarefa */}
      {execFeedback && (
        <ExecutarFeedback
          taskId={execFeedback.taskId}
          resultado={execFeedback.resultado}
          onClose={() => setExecFeedback(null)}
        />
      )}

      {/* Modal de nova tarefa */}
      <NovaTarefaModal
        open={novaTarefaOpen}
        onClose={() => setNovaTarefaOpen(false)}
        onCriada={() => {
          // Quando uma tarefa for criada, vai pro historico automaticamente
          setViewMode('historico')
        }}
      />

      {/* Notificações toast — sempre globais (ignoram filtro) */}
      <Notificacoes
        eventos={eventosGlobais}
        onAcionarTarefa={(taskId) => {
          setTaskFilter(taskId)
          setViewMode('times')
        }}
        onAcionarAgente={(agentId) => {
          setTerminalAgentId(agentId)
          setSelectedAgentId(agentId)
        }}
      />
    </div>
  )
}
