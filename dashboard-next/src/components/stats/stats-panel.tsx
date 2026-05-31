'use client'

import type { DashboardStats } from '@/types/agents'

interface StatsPanelProps {
  stats: DashboardStats
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  accent?: string
  icon: string
}

function StatCard({ label, value, sub, color = '#1A1A1A', accent = '#EC7000', icon }: StatCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(26, 26, 26, 0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: accent,
        }}
      />
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${accent}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '10px',
            color: '#6E665A',
            marginBottom: '4px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              fontSize: '11px',
              color: '#6E665A',
              marginTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const totalQualityGate = stats.qualityGatePassed + stats.qualityGateFailed
  const passRate =
    totalQualityGate > 0
      ? Math.round((stats.qualityGatePassed / totalQualityGate) * 100)
      : 0

  const qualityColor =
    totalQualityGate === 0
      ? '#B0A89A'
      : passRate >= 80
        ? '#2D9D78'
        : passRate >= 60
          ? '#F8C300'
          : '#DA3127'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px',
        padding: '18px 20px',
        borderBottom: '1px solid #EDE7DD',
        flexShrink: 0,
        background: '#FBF6EE',
      }}
    >
      <StatCard
        icon="✓"
        label="Tarefas concluídas"
        value={stats.tasksCompletedToday}
        color="#2D9D78"
        accent="#2D9D78"
        sub="nesta sessão"
      />
      <StatCard
        icon="⏱"
        label="Tempo médio"
        value={`${stats.avgCompletionMinutes}m`}
        color="#EC7000"
        accent="#EC7000"
        sub="por tarefa concluída"
      />
      <StatCard
        icon="◉"
        label="Quality gate"
        value={totalQualityGate > 0 ? `${passRate}%` : '—'}
        color={qualityColor}
        accent={qualityColor}
        sub={`${stats.qualityGatePassed} OK · ${stats.qualityGateFailed} fail`}
      />
      <StatCard
        icon="⬡"
        label="Agentes ativos"
        value={`${stats.activeAgents}/${stats.totalAgents}`}
        color={stats.activeAgents > 0 ? '#003C8F' : '#B0A89A'}
        accent={stats.activeAgents > 0 ? '#003C8F' : '#B0A89A'}
        sub={`${stats.totalAgents - stats.activeAgents} aguardando`}
      />
    </div>
  )
}
