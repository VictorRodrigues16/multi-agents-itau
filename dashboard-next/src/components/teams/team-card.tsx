'use client'

import { useState, useMemo } from 'react'
import type { Team, AgentStatus } from '@/types/agents'
import { AgentCard } from './agent-card'
import { getTeamColorVar } from '@/lib/agent-utils'

interface TeamCardProps {
  team: Team
  statusFilter: string
  selectedAgentId: string | null
  onSelectAgent: (agentId: string | null) => void
  isHighlighted: boolean
}

function TeamProgressBar({ team }: { team: Team }) {
  const total = team.agents.length
  const active = team.agents.filter(
    (a) => a.status === 'working' || a.status === 'reviewing' || a.status === 'spawning',
  ).length
  const pct = total > 0 ? Math.round((active / total) * 100) : 0
  const colorVar = getTeamColorVar(team.color)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          flex: 1,
          height: '5px',
          background: '#F4ECE3',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: colorVar,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
            boxShadow: `0 0 6px ${colorVar}`,
          }}
        />
      </div>
      <span
        className="mono"
        style={{ fontSize: '11px', color: '#3D3830', flexShrink: 0, fontWeight: 600 }}
      >
        {active}/{total}
      </span>
    </div>
  )
}

function StatusSummaryDots({ agents }: { agents: Team['agents'] }) {
  const counts: Partial<Record<AgentStatus, number>> = {}
  for (const agent of agents) {
    counts[agent.status] = (counts[agent.status] ?? 0) + 1
  }

  const STATUS_COLORS: Partial<Record<AgentStatus, string>> = {
    working: '#EC7000',
    reviewing: '#F8C300',
    completed: '#2D9D78',
    idle: '#B0A89A',
    blocked: '#DA3127',
    error: '#DA3127',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {(Object.entries(counts) as [AgentStatus, number][]).map(([status, count]) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: STATUS_COLORS[status] ?? '#B0A89A',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '11px', color: '#3D3830', fontWeight: 500 }}>{count}</span>
        </div>
      ))}
    </div>
  )
}

export function TeamCard({
  team,
  statusFilter,
  selectedAgentId,
  onSelectAgent,
  isHighlighted,
}: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const visibleAgents = useMemo(() => {
    if (statusFilter === 'all') return team.agents
    return team.agents.filter((a) => a.status === statusFilter)
  }, [team.agents, statusFilter])

  const colorVar = getTeamColorVar(team.color)
  const activeCount = team.agents.filter(
    (a) => a.status === 'working' || a.status === 'reviewing' || a.status === 'spawning',
  ).length
  const hasBlocked = team.agents.some((a) => a.status === 'blocked' || a.status === 'error')
  const currentTaskTitle = team.agents.find((a) => a.currentTask)?.currentSubtask ?? null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${isHighlighted ? colorVar : hasBlocked ? '#DA3127' : '#EDE7DD'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: isHighlighted
          ? `0 6px 20px color-mix(in srgb, ${colorVar} 22%, transparent)`
          : '0 2px 6px rgba(26, 26, 26, 0.04)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          background:
            activeCount > 0
              ? `linear-gradient(90deg, color-mix(in srgb, ${colorVar} 10%, #FFFFFF) 0%, #FFFFFF 80%)`
              : '#FFFFFF',
          border: 'none',
          padding: '16px 18px',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `color-mix(in srgb, ${colorVar} 12%, #FFFFFF)`,
              border: `1px solid color-mix(in srgb, ${colorVar} 30%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: colorVar,
              flexShrink: 0,
            }}
          >
            {team.icon}
          </div>

          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1A1A1A',
                letterSpacing: '-0.01em',
              }}
            >
              {team.name}
            </p>
            <p style={{ fontSize: '11px', color: '#6E665A', marginTop: '2px' }}>
              {team.description}
            </p>
          </div>

          {activeCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFFFFF',
                background: colorVar,
                padding: '4px 10px',
                borderRadius: '999px',
                boxShadow: `0 2px 6px color-mix(in srgb, ${colorVar} 35%, transparent)`,
              }}
            >
              {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            </span>
          )}

          {hasBlocked && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFFFFF',
                background: '#DA3127',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
              }}
            >
              ATENÇÃO
            </span>
          )}

          <span
            style={{
              fontSize: '12px',
              color: '#6E665A',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TeamProgressBar team={team} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <StatusSummaryDots agents={team.agents} />
            {currentTaskTitle && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#6E665A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '240px',
                  fontStyle: 'italic',
                }}
              >
                {currentTaskTitle.slice(0, 44)}
                {currentTaskTitle.length > 44 ? '…' : ''}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Grid de agentes */}
      {isExpanded && (
        <div
          style={{
            padding: '14px 16px 18px',
            borderTop: '1px solid #EDE7DD',
            background: '#FBF6EE',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '12px',
          }}
        >
          {visibleAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              teamColor={team.color}
              onClick={() => onSelectAgent(agent.id)}
              isSelected={selectedAgentId === agent.id}
            />
          ))}

          {visibleAgents.length === 0 && (
            <p
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: '#6E665A',
                fontSize: '12px',
                padding: '20px',
              }}
            >
              Nenhum agente com este status
            </p>
          )}
        </div>
      )}
    </div>
  )
}
