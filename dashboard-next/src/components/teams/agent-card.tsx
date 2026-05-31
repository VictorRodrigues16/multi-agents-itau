'use client'

import type { Agent, TeamColor } from '@/types/agents'
import {
  getTeamColorVar,
  getStatusColor,
  getStatusLabel,
  formatElapsed,
} from '@/lib/agent-utils'

interface AgentCardProps {
  agent: Agent
  teamColor: TeamColor
  onClick: () => void
  isSelected: boolean
}

function ModelBadge({ model }: { model: Agent['model'] }) {
  const styles: Record<Agent['model'], { bg: string; color: string; border: string }> = {
    opus: {
      bg: 'rgba(124, 58, 237, 0.10)',
      color: '#5B21B6',
      border: 'rgba(124, 58, 237, 0.35)',
    },
    sonnet: {
      bg: 'rgba(0, 60, 143, 0.10)',
      color: '#003C8F',
      border: 'rgba(0, 60, 143, 0.30)',
    },
    haiku: {
      bg: 'rgba(45, 157, 120, 0.10)',
      color: '#1B7F5F',
      border: 'rgba(45, 157, 120, 0.30)',
    },
  }
  const s = styles[model]
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: '4px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {model}
    </span>
  )
}

function StatusIndicator({ status }: { status: Agent['status'] }) {
  const color = getStatusColor(status)
  const isAnimated = status === 'working' || status === 'reviewing' || status === 'spawning'

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '10px',
        height: '10px',
      }}
    >
      {isAnimated && (
        <span
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            opacity: 0.35,
            animation: 'pulse-ring 1.5s ease-out infinite',
          }}
        />
      )}
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: color,
          display: 'block',
          position: 'relative',
          animation: isAnimated ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          boxShadow: isAnimated ? `0 0 6px ${color}` : 'none',
        }}
      />
    </span>
  )
}

export function AgentCard({ agent, teamColor, onClick, isSelected }: AgentCardProps) {
  const isActive = agent.status === 'working' || agent.status === 'reviewing' || agent.status === 'spawning'
  const colorVar = getTeamColorVar(teamColor)

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected ? `color-mix(in srgb, ${colorVar} 8%, #FFFFFF)` : '#FFFFFF',
        border: `1px solid ${isSelected ? colorVar : '#EDE7DD'}`,
        borderRadius: '10px',
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isActive
          ? `0 4px 14px color-mix(in srgb, ${colorVar} 25%, transparent)`
          : '0 1px 3px rgba(26, 26, 26, 0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.borderColor = colorVar
        e.currentTarget.style.boxShadow = `0 4px 14px color-mix(in srgb, ${colorVar} 25%, transparent)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        if (!isSelected) e.currentTarget.style.borderColor = '#EDE7DD'
        if (!isActive) e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 26, 26, 0.04)'
      }}
    >
      {/* Linha de glow no topo se ativo */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, transparent, ${colorVar}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
      )}

      {/* Linha 1: status + nome + modelo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <StatusIndicator status={agent.status} />
        <span
          className="mono"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: isActive ? colorVar : '#1A1A1A',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {agent.id}
        </span>
        <ModelBadge model={agent.model} />
      </div>

      {/* Papel */}
      <p
        style={{
          fontSize: '11px',
          color: '#6E665A',
          marginBottom: agent.currentTask || agent.lastSummary ? '8px' : '0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {agent.role}
      </p>

      {/* Tarefa atual (se ativo) */}
      {agent.currentTask && isActive && (
        <div
          style={{
            background: '#FBF6EE',
            borderRadius: '6px',
            padding: '6px 8px',
            marginBottom: '6px',
            borderLeft: `3px solid ${colorVar}`,
          }}
        >
          <p
            style={{
              fontSize: '10px',
              color: '#6E665A',
              marginBottom: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            {agent.currentTask}
          </p>
          <p
            style={{
              fontSize: '11px',
              color: '#3D3830',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            {agent.currentSubtask ?? '—'}
          </p>
        </div>
      )}

      {/* Ultimo resumo (se nao ativo) */}
      {agent.lastSummary && !isActive && (
        <div
          style={{
            background: '#FBF6EE',
            borderRadius: '6px',
            padding: '6px 8px',
            marginBottom: '6px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              color: '#3D3830',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {agent.lastSummary}
          </p>
        </div>
      )}

      {/* Footer: status + elapsed */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: getStatusColor(agent.status),
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {getStatusLabel(agent.status)}
        </span>
        {agent.elapsedSeconds > 0 && (
          <span className="mono" style={{ fontSize: '10px', color: '#6E665A', fontWeight: 500 }}>
            {formatElapsed(agent.elapsedSeconds)}
          </span>
        )}
      </div>
    </button>
  )
}
