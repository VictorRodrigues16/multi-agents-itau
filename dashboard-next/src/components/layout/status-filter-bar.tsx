'use client'

import { useMemo } from 'react'
import type { Team, AgentStatus } from '@/types/agents'
import { getStatusColor } from '@/lib/agent-utils'

interface StatusFilterBarProps {
  teams: Team[]
  statusFilter: string
  onStatusFilter: (status: string) => void
}

interface Opcao {
  value: string
  label: string
  status?: AgentStatus
}

const OPCOES_FIXAS: Opcao[] = [
  { value: 'all', label: 'Todos' },
  { value: 'working', label: 'Trabalhando', status: 'working' },
  { value: 'reviewing', label: 'Revisando', status: 'reviewing' },
  { value: 'completed', label: 'Concluído', status: 'completed' },
  { value: 'idle', label: 'Aguardando', status: 'idle' },
  { value: 'blocked', label: 'Bloqueado', status: 'blocked' },
]

export function StatusFilterBar({ teams, statusFilter, onStatusFilter }: StatusFilterBarProps) {
  const contagem = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    for (const t of teams) {
      for (const a of t.agents) {
        c.all += 1
        c[a.status] = (c[a.status] ?? 0) + 1
      }
    }
    return c
  }, [teams])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px 20px',
        background: '#FFFFFF',
        borderBottom: '1px solid #EDE7DD',
        boxShadow: '0 1px 3px rgba(26, 26, 26, 0.03)',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: '#6E665A',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginRight: '4px',
        }}
      >
        Filtrar
      </span>

      {OPCOES_FIXAS.map((opt) => {
        const ativo = statusFilter === opt.value
        const cor = opt.status ? getStatusColor(opt.status) : '#6E665A'
        const n = contagem[opt.value] ?? 0

        return (
          <button
            key={opt.value}
            onClick={() => onStatusFilter(opt.value)}
            disabled={n === 0 && opt.value !== 'all'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '999px',
              border: `1px solid ${ativo ? cor : '#D9CFC1'}`,
              background: ativo ? `color-mix(in srgb, ${cor} 14%, #FFFFFF)` : '#FFFFFF',
              color: ativo ? cor : '#3D3830',
              fontSize: '12px',
              cursor: n === 0 && opt.value !== 'all' ? 'not-allowed' : 'pointer',
              fontWeight: ativo ? 700 : 500,
              opacity: n === 0 && opt.value !== 'all' ? 0.5 : 1,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {opt.status && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: cor,
                  flexShrink: 0,
                }}
              />
            )}
            <span>{opt.label}</span>
            <span
              className="mono"
              style={{
                fontSize: '10px',
                color: ativo ? cor : '#6E665A',
                fontWeight: 600,
                background: ativo ? '#FFFFFF' : '#FBF6EE',
                padding: '1px 6px',
                borderRadius: '999px',
                minWidth: '20px',
                textAlign: 'center',
              }}
            >
              {n}
            </span>
          </button>
        )
      })}
    </div>
  )
}
