'use client'

import type { TaskInfo, PipelineStage } from '@/types/agents'
import { PIPELINE_STAGES } from '@/data/agents-config'
import { formatElapsed } from '@/lib/agent-utils'
import { TaskSwitcher } from './task-switcher'
import { IconPlus, IconPause, IconPlay, IconClock } from '@/components/icons/icons'

interface TopBarProps {
  currentTask: TaskInfo | null
  elapsedSeconds: number
  activeAgents: number
  totalAgents: number
  isPaused: boolean
  onTogglePause: () => void
  isConnected?: boolean
  hasRealEvents?: boolean
  onNovaTarefa?: () => void
  taskFilter: string | null
  taskIdsConhecidos: string[]
  onSelectTask: (id: string | null) => void
}

const DISPLAY_STAGES: PipelineStage[] = [
  'analise',
  'desenvolvimento',
  'review',
  'testes',
  'documentacao',
]

export function TopBar({
  currentTask,
  elapsedSeconds,
  activeAgents,
  totalAgents,
  isPaused,
  onTogglePause,
  isConnected = false,
  hasRealEvents = false,
  onNovaTarefa,
  taskFilter,
  taskIdsConhecidos,
  onSelectTask,
}: TopBarProps) {
  return (
    <header
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #EDE7DD',
        padding: '0 24px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexShrink: 0,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(26, 26, 26, 0.04)',
      }}
    >
      {/* Logo + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#EC7000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px',
            boxShadow: '0 6px 16px rgba(236, 112, 0, 0.30)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '6px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px',
            }}
          >
            <img
              src="/logo.png"
              alt="Itau"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '0.06em',
              color: '#1A1A1A',
              lineHeight: 1,
            }}
          >
            Agents - Itaú
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#6E665A',
              letterSpacing: '0.04em',
              marginTop: '4px',
            }}
          >
            Monitor Squad Payments
          </div>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '999px',
            background: hasRealEvents
              ? 'rgba(45, 157, 120, 0.14)'
              : isConnected
                ? 'rgba(248, 195, 0, 0.20)'
                : '#F4ECE3',
            color: hasRealEvents
              ? '#1B7F5F'
              : isConnected
                ? '#A07700'
                : '#6E665A',
            border: `1px solid ${
              hasRealEvents
                ? '#2D9D78'
                : isConnected
                  ? '#F8C300'
                  : '#D9CFC1'
            }`,
            marginLeft: '8px',
            letterSpacing: '0.06em',
          }}
        >
          {hasRealEvents ? 'AO VIVO' : isConnected ? 'CONECTADO' : 'AGUARDANDO'}
        </span>
      </div>

      <div
        style={{
          width: '1px',
          height: '36px',
          background: '#EDE7DD',
          flexShrink: 0,
        }}
      />

      {/* Switcher de tarefa */}
      <TaskSwitcher
        taskAtual={taskFilter ?? currentTask?.id ?? null}
        taskIdsConhecidos={taskIdsConhecidos}
        onSelect={onSelectTask}
      />

      {/* Mini-pipeline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="scroll-hidden"
      >
        {DISPLAY_STAGES.map((stageId, idx) => {
          const config = PIPELINE_STAGES.find((s) => s.id === stageId)
          if (!config) return null
          const isActive = currentTask?.stage === stageId
          const isDone = currentTask?.completedStages.includes(stageId) ?? false

          return (
            <div key={stageId} style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              {idx > 0 && (
                <span style={{ color: '#B0A89A', fontSize: '11px' }}>›</span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive || isDone ? 600 : 500,
                  color: isDone
                    ? '#1B7F5F'
                    : isActive
                      ? '#FFFFFF'
                      : '#6E665A',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: isActive ? '#EC7000' : isDone ? 'rgba(45, 157, 120, 0.14)' : '#F4ECE3',
                  border: '1px solid',
                  borderColor: isActive ? '#C75300' : isDone ? '#2D9D78' : '#EDE7DD',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {isDone && <span style={{ fontSize: '10px' }}>✓</span>}
                {isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      display: 'inline-block',
                      animation: 'pulse-dot 1.5s ease-in-out infinite',
                    }}
                  />
                )}
                {config.label}
              </span>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0,
          marginLeft: 'auto',
        }}
      >
        {/* Tempo decorrido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconClock size={14} color="#6E665A" strokeWidth={2} />
          <span className="mono" style={{ fontSize: '13px', color: '#3D3830', fontWeight: 600 }}>
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* Agentes ativos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeAgents > 0 ? '#FFE8D2' : '#F4ECE3',
            padding: '5px 10px',
            borderRadius: '999px',
            border: `1px solid ${activeAgents > 0 ? '#EC7000' : '#D9CFC1'}`,
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: activeAgents > 0 ? '#EC7000' : '#B0A89A',
              display: 'inline-block',
              animation: activeAgents > 0 ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span className="mono" style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: 700 }}>
            {activeAgents}/{totalAgents}
          </span>
          <span style={{ fontSize: '11px', color: '#6E665A', fontWeight: 500 }}>agentes</span>
        </div>

        {/* Nova tarefa — CTA primario */}
        {onNovaTarefa && (
          <button
            onClick={onNovaTarefa}
            style={{
              background: '#EC7000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(236, 112, 0, 0.30)',
              letterSpacing: '0.02em',
            }}
            title="Criar nova tarefa via dashboard"
          >
            <IconPlus size={15} color="#FFFFFF" strokeWidth={2.5} />
            Nova tarefa
          </button>
        )}

        {/* Pausar */}
        <button
          onClick={onTogglePause}
          style={{
            background: isPaused ? 'rgba(45, 157, 120, 0.14)' : '#FFFFFF',
            border: `1px solid ${isPaused ? '#2D9D78' : '#D9CFC1'}`,
            color: isPaused ? '#1B7F5F' : '#3D3830',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isPaused ? (
            <IconPlay size={12} color="#1B7F5F" strokeWidth={2.5} />
          ) : (
            <IconPause size={12} color="#3D3830" strokeWidth={2.5} />
          )}
          {isPaused ? 'Retomar' : 'Pausar'}
        </button>
      </div>
    </header>
  )
}
