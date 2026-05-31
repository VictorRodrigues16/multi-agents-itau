'use client'

import type { Team, ViewMode } from '@/types/agents'
import { getTeamColorVar } from '@/lib/agent-utils'
import {
  IconTimes,
  IconPipeline,
  IconAgentes,
  IconProjetos,
  IconHistorico,
  IconActivity,
  IconCode,
  IconCheck,
  IconFile,
} from '@/components/icons/icons'
import type { ComponentType } from 'react'

type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const ICONE_POR_TIME: Record<string, IconComp> = {
  orquestracao: IconActivity,
  desenvolvimento: IconCode,
  testes: IconCheck,
  documentacao: IconFile,
}

interface SidebarProps {
  teams: Team[]
  viewMode: ViewMode
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
  onChangeView: (mode: ViewMode) => void
}

export function Sidebar({
  teams,
  viewMode,
  selectedTeamId,
  onSelectTeam,
  onChangeView,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: '270px',
        flexShrink: 0,
        background: '#FFFFFF',
        borderRight: '1px solid #EDE7DD',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Visualizacao */}
      <div style={{ padding: '18px 14px 12px', borderBottom: '1px solid #EDE7DD' }}>
        <p
          style={{
            fontSize: '11px',
            color: '#6E665A',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontWeight: 700,
          }}
        >
          Navegação
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {([
            { id: 'times' as ViewMode, label: 'Times', Icon: IconTimes },
            { id: 'pipeline' as ViewMode, label: 'Pipeline', Icon: IconPipeline },
            { id: 'agentes' as ViewMode, label: 'Agentes', Icon: IconAgentes },
            { id: 'projetos' as ViewMode, label: 'Projetos', Icon: IconProjetos },
            { id: 'historico' as ViewMode, label: 'Histórico', Icon: IconHistorico },
          ] as { id: ViewMode; label: string; Icon: IconComp }[]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChangeView(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '9px',
                border: 'none',
                background: viewMode === opt.id ? '#EC7000' : 'transparent',
                color: viewMode === opt.id ? '#FFFFFF' : '#3D3830',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: viewMode === opt.id ? 700 : 500,
                transition: 'all 0.15s ease',
                boxShadow: viewMode === opt.id ? '0 2px 6px rgba(236, 112, 0, 0.30)' : 'none',
                textAlign: 'left',
              }}
            >
              <opt.Icon size={18} color={viewMode === opt.id ? '#FFFFFF' : '#6E665A'} strokeWidth={2} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Times */}
      <div style={{ padding: '14px 14px 12px', flex: 1, overflow: 'auto' }}>
        <p
          style={{
            fontSize: '11px',
            color: '#6E665A',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontWeight: 700,
          }}
        >
          Times
        </p>

        <button
          onClick={() => onSelectTeam(null)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: selectedTeamId === null ? '#F4ECE3' : 'transparent',
            color: selectedTeamId === null ? '#1A1A1A' : '#3D3830',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: '4px',
            fontWeight: selectedTeamId === null ? 600 : 500,
            transition: 'background 0.15s ease',
          }}
        >
          <IconTimes size={18} color={selectedTeamId === null ? '#1A1A1A' : '#6E665A'} strokeWidth={1.8} />
          Todos os times
        </button>

        {teams.map((team) => {
          const activeCount = team.agents.filter(
            (a) => a.status === 'working' || a.status === 'reviewing' || a.status === 'spawning',
          ).length
          const isSelected = selectedTeamId === team.id
          const corVar = getTeamColorVar(team.color)

          return (
            <button
              key={team.id}
              onClick={() => onSelectTeam(isSelected ? null : team.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: isSelected ? '#F4ECE3' : 'transparent',
                color: isSelected ? '#1A1A1A' : '#3D3830',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '4px',
                fontWeight: isSelected ? 600 : 500,
                transition: 'background 0.15s ease',
                borderLeft: isSelected ? `3px solid ${corVar}` : '3px solid transparent',
                paddingLeft: isSelected ? '9px' : '13px',
              }}
            >
              {(() => {
                const TeamIcon = ICONE_POR_TIME[team.id] ?? IconActivity
                return <TeamIcon size={18} color={corVar} strokeWidth={2} />
              })()}
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {team.name}
              </span>
              {activeCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    background: corVar,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    flexShrink: 0,
                  }}
                >
                  {activeCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer com info */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid #EDE7DD',
          background: '#FBF6EE',
          fontSize: '12px',
          color: '#6E665A',
          lineHeight: 1.5,
        }}
      >
        <div>
          <strong style={{ color: '#1A1A1A' }}>
            {teams.reduce((sum, t) => sum + t.agents.length, 0)}
          </strong>{' '}
          agentes em <strong style={{ color: '#1A1A1A' }}>{teams.length}</strong> times
        </div>
        <div style={{ marginTop: '3px', fontSize: '11px' }}>Clique para detalhes do agente</div>
      </div>
    </aside>
  )
}
