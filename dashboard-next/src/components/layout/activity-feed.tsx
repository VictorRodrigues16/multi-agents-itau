'use client'

import { useEffect, useRef } from 'react'
import type { ActivityEntry } from '@/types/agents'
import { getTeamColorVar, formatTime } from '@/lib/agent-utils'
import { IconClock } from '@/components/icons/icons'

interface ActivityFeedProps {
  entries: ActivityEntry[]
  onClear?: () => void
  onAgentClick?: (agentId: string) => void
}

const LEVEL_STYLES: Record<
  ActivityEntry['level'],
  { color: string; icon: string }
> = {
  info: { color: '#3D3830', icon: '·' },
  success: { color: '#1B7F5F', icon: '✓' },
  warning: { color: '#A07700', icon: '⚠' },
  error: { color: '#8C1F1F', icon: '✗' },
}

export function ActivityFeed({ entries, onClear, onAgentClick }: ActivityFeedProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [entries.length])

  return (
    <aside
      style={{
        width: '320px',
        flexShrink: 0,
        background: '#FFFFFF',
        borderLeft: '1px solid #EDE7DD',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Cabecalho */}
      <div
        style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid #EDE7DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: '#FBF6EE',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: entries.length > 0 ? '#EC7000' : '#B0A89A',
              display: 'inline-block',
              animation: entries.length > 0 ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
              boxShadow: entries.length > 0 ? '0 0 6px #EC7000' : 'none',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#1A1A1A',
              letterSpacing: '0.02em',
            }}
          >
            Feed de Atividade
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              color: '#6E665A',
              fontWeight: 600,
              background: '#FFFFFF',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid #D9CFC1',
            }}
          >
            {entries.length}
          </span>
          {onClear && entries.length > 0 && (
            <button
              onClick={onClear}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D9CFC1',
                color: '#6E665A',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Entradas */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 0',
        }}
      >
        {entries.map((entry, index) => {
          const levelStyle = LEVEL_STYLES[entry.level]
          const isNew = index === 0
          const teamColor = getTeamColorVar(entry.teamColor)

          return (
            <button
              key={entry.id}
              onClick={() => onAgentClick?.(entry.agentId)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: '11px 18px',
                borderBottom: '1px solid #F4ECE3',
                cursor: onAgentClick ? 'pointer' : 'default',
                animation: isNew ? 'fade-in-up 0.3s ease-out' : 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (onAgentClick) e.currentTarget.style.background = '#FBF6EE'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Timestamp + agente */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: '#6E665A',
                    flexShrink: 0,
                  }}
                >
                  {formatTime(entry.timestamp)}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: teamColor,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.agentName}
                </span>
              </div>

              {/* Mensagem */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: levelStyle.color,
                    flexShrink: 0,
                    lineHeight: 1.4,
                    fontWeight: 700,
                  }}
                >
                  {levelStyle.icon}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: entry.level === 'info' ? '#3D3830' : levelStyle.color,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.message}
                </span>
              </div>
            </button>
          )
        })}

        {entries.length === 0 && (
          <div
            style={{
              padding: '48px 18px',
              textAlign: 'center',
              color: '#6E665A',
              fontSize: '12px',
            }}
          >
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
              <IconClock size={32} color="#B0A89A" strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 500 }}>Aguardando atividade...</div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
              Execute /tarefa para começar
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
