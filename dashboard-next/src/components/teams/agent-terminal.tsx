'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Agent, AgentEvent, TeamColor } from '@/types/agents'
import { getTeamColorValue, formatElapsed } from '@/lib/agent-utils'
import { DiffViewer } from './diff-viewer'
import { EventoCard } from './evento-card'

type TabId = 'atividade' | 'diff'

interface AgentTerminalProps {
  agent: Agent
  teamColor: TeamColor
  eventos: AgentEvent[]
  onClose: () => void
}

export function AgentTerminal({ agent, teamColor, eventos, onClose }: AgentTerminalProps) {
  const [paused, setPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [filtroTarefa, setFiltroTarefa] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('atividade')
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null)

  // Altura customizada (em px) quando o usuario arrasta o handle
  const [customHeight, setCustomHeight] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const color = getTeamColorValue(teamColor)

  const eventosDoAgente = useMemo(() => {
    let evs = eventos.filter((e) => e.agente === agent.id)
    if (filtroTarefa) evs = evs.filter((e) => e.taskId === filtroTarefa)
    return evs.sort((a, b) => a.ts - b.ts)
  }, [eventos, agent.id, filtroTarefa])

  const tarefasDoAgente = useMemo(() => {
    const set = new Set(
      eventos.filter((e) => e.agente === agent.id).map((e) => e.taskId).filter(Boolean),
    )
    return Array.from(set).sort()
  }, [eventos, agent.id])

  // Task para o diff: a atual em execução, ou o filtro escolhido, ou a mais recente
  const taskParaDiff = useMemo(() => {
    if (filtroTarefa) return filtroTarefa
    if (agent.currentTask) return agent.currentTask
    const ultimo = eventos
      .filter((e) => e.agente === agent.id && e.taskId)
      .sort((a, b) => b.ts - a.ts)[0]
    return ultimo?.taskId
  }, [agent.id, agent.currentTask, eventos, filtroTarefa])

  const stats = useMemo(() => {
    const spawns = eventosDoAgente.filter((e) => e.tipo === 'spawning').length
    const sucesso = eventosDoAgente.filter(
      (e) => e.tipo === 'stopped' && e.status === 'success',
    ).length
    const erro = eventosDoAgente.filter(
      (e) => e.tipo === 'stopped' && e.status === 'error',
    ).length

    let tempoAtivoMs = 0
    let lastSpawn: number | null = null
    for (const ev of eventosDoAgente) {
      if (ev.tipo === 'spawning') lastSpawn = ev.ts
      else if (ev.tipo === 'stopped' && lastSpawn) {
        tempoAtivoMs += ev.ts - lastSpawn
        lastSpawn = null
      }
    }
    if (lastSpawn) tempoAtivoMs += Date.now() - lastSpawn

    return { spawns, sucesso, erro, tempoAtivoMs, tarefas: tarefasDoAgente.length }
  }, [eventosDoAgente, tarefasDoAgente.length])

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 250)
  }, [onClose])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        backdropRef.current &&
        backdropRef.current === e.target
      ) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [handleClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [eventosDoAgente.length, paused])

  // Drag handle: redimensionar painel arrastando a borda superior
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isFullscreen) return
    e.preventDefault()
    setIsDragging(true)
  }, [isFullscreen])

  useEffect(() => {
    if (!isDragging) return

    function onMove(e: MouseEvent) {
      const novaAltura = Math.max(240, Math.min(window.innerHeight, window.innerHeight - e.clientY))
      setCustomHeight(novaAltura)
    }
    function onUp() {
      setIsDragging(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsDragging(false)
    }

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [isDragging])

  const panelHeight = isFullscreen ? '100vh' : customHeight ? `${customHeight}px` : '60vh'
  const isActive =
    agent.status === 'working' || agent.status === 'reviewing' || agent.status === 'spawning'

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: isVisible ? 'rgba(26, 26, 26, 0.45)' : 'rgba(26, 26, 26, 0)',
          backdropFilter: 'blur(4px)',
          zIndex: 99,
          transition: 'background 250ms ease, backdrop-filter 250ms ease',
        }}
      />

      {/* Painel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: panelHeight,
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: isDragging
            ? 'transform 250ms ease'
            : 'transform 250ms ease, height 250ms ease',
          boxShadow: `0 -20px 60px rgba(26, 26, 26, 0.20)`,
          borderRadius: '16px 16px 0 0',
        }}
      >
        {/* Handle de redimensionamento */}
        <div
          onMouseDown={handleDragStart}
          onDoubleClick={() => {
            setCustomHeight(null)
            setIsFullscreen(false)
          }}
          title="Arraste para redimensionar · Duplo-clique para reset"
          style={{
            position: 'relative',
            height: '10px',
            background: isDragging ? color : `linear-gradient(180deg, ${color} 0%, ${color} 40%, transparent 100%)`,
            cursor: isFullscreen ? 'default' : 'ns-resize',
            flexShrink: 0,
            borderRadius: '16px 16px 0 0',
            transition: isDragging ? 'none' : 'background 0.15s ease',
            opacity: isFullscreen ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isFullscreen && !isDragging) {
              e.currentTarget.style.background = color
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = `linear-gradient(180deg, ${color} 0%, ${color} 40%, transparent 100%)`
            }
          }}
        >
          {/* Indicador visual: barra horizontal no centro */}
          <div
            style={{
              position: 'absolute',
              top: '3px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Cabecalho */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 22px',
            background: '#FBF6EE',
            borderBottom: '1px solid #EDE7DD',
            flexShrink: 0,
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '11px',
                background: `color-mix(in srgb, ${color} 14%, #FFFFFF)`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: color,
                  animation: isActive ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                  boxShadow: isActive ? `0 0 12px ${color}` : 'none',
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="mono"
                  style={{ color: '#1A1A1A', fontWeight: 700, fontSize: '15px' }}
                >
                  {agent.id}
                </span>
                <StatusBadge status={agent.status} />
              </div>
              <div style={{ fontSize: '12px', color: '#6E665A', marginTop: '3px' }}>
                {agent.role}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {tarefasDoAgente.length > 1 && (
              <select
                value={filtroTarefa ?? ''}
                onChange={(e) => setFiltroTarefa(e.target.value || null)}
                className="mono"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9CFC1',
                  color: '#3D3830',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="">Todas as tarefas</option>
                {tarefasDoAgente.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setPaused((p) => !p)}
              style={{
                background: paused ? 'rgba(45, 157, 120, 0.14)' : '#FFFFFF',
                border: `1px solid ${paused ? '#2D9D78' : '#D9CFC1'}`,
                color: paused ? '#1B7F5F' : '#3D3830',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {paused ? '▶ Retomar' : '⏸ Pausar'}
            </button>
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D9CFC1',
                color: '#3D3830',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isFullscreen ? '⊟ Reduzir' : '⊞ Expandir'}
            </button>
            <button
              onClick={handleClose}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D9CFC1',
                color: '#3D3830',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1px',
            background: '#EDE7DD',
            flexShrink: 0,
          }}
        >
          <StatChip label="Execuções" value={stats.spawns} color="#1A1A1A" />
          <StatChip label="Sucessos" value={stats.sucesso} color="#1B7F5F" />
          <StatChip
            label="Erros"
            value={stats.erro}
            color={stats.erro > 0 ? '#8C1F1F' : '#B0A89A'}
          />
          <StatChip label="Tarefas" value={stats.tarefas} color={color} />
          <StatChip label="Tempo ativo" value={formatElapsed(stats.tempoAtivoMs / 1000)} color="#A07700" />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#FBF6EE',
            borderBottom: '1px solid #EDE7DD',
            padding: '0 22px',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <TabButton label="Atividade" icon="⚡" active={tab === 'atividade'} onClick={() => setTab('atividade')} color={color} />
          <TabButton label="Diff" icon="◧" active={tab === 'diff'} onClick={() => setTab('diff')} color={color} />
        </div>

        {/* Atividade atual (se rodando) — so na aba atividade */}
        {tab === 'atividade' && isActive && agent.currentSubtask && (
          <div
            style={{
              padding: '12px 22px',
              background: `linear-gradient(90deg, color-mix(in srgb, ${color} 12%, #FFFFFF) 0%, #FFFFFF 100%)`,
              borderBottom: '1px solid #EDE7DD',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: color,
                animation: 'pulse-dot 1.5s ease-in-out infinite',
                boxShadow: `0 0 8px ${color}`,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: '#6E665A',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              Em execução agora —
            </span>
            {agent.currentTask && (
              <span className="mono" style={{ fontSize: '11px', color, fontWeight: 700 }}>
                {agent.currentTask}
              </span>
            )}
            <span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: 500 }}>
              {agent.currentSubtask}
            </span>
          </div>
        )}

        {/* Conteudo da tab */}
        {tab === 'diff' ? (
          <div style={{ flex: 1, overflow: 'hidden', background: '#FFFFFF' }}>
            <DiffViewer
              accentColor={color}
              agentId={agent.id}
              taskId={taskParaDiff ?? undefined}
            />
          </div>
        ) : (
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            background: '#FFFFFF',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          {eventosDoAgente.length === 0 ? (
            <div
              style={{
                padding: '48px 22px',
                textAlign: 'center',
                color: '#6E665A',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Este agente ainda não registrou atividade.
            </div>
          ) : (
            eventosDoAgente.map((ev, idx) => {
              const eventKey = `${ev.ts}-${idx}`
              return (
                <EventoCard
                  key={eventKey}
                  evento={ev}
                  color={color}
                  isExpanded={eventoExpandido === eventKey}
                  onToggle={() => setEventoExpandido(eventoExpandido === eventKey ? null : eventKey)}
                />
              )
            })
          )}
        </div>
        )}
      </div>
    </>
  )
}

function TabButton({
  label,
  icon,
  active,
  onClick,
  color,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '10px 18px 11px 18px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: active ? 700 : 500,
        color: active ? color : '#6E665A',
        borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
        marginBottom: '-1px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: '13px' }}>{icon}</span>
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status: Agent['status'] }) {
  const styles: Record<Agent['status'], { bg: string; color: string; border: string }> = {
    idle: { bg: '#F4ECE3', color: '#6E665A', border: '#D9CFC1' },
    spawning: { bg: '#FFE8D2', color: '#C75300', border: '#EC7000' },
    working: { bg: '#FFE8D2', color: '#C75300', border: '#EC7000' },
    reviewing: { bg: '#FFF4C2', color: '#A07700', border: '#F8C300' },
    completed: { bg: 'rgba(45, 157, 120, 0.14)', color: '#1B7F5F', border: '#2D9D78' },
    blocked: { bg: '#FBE3E1', color: '#8C1F1F', border: '#DA3127' },
    error: { bg: '#FBE3E1', color: '#8C1F1F', border: '#DA3127' },
    timeout: { bg: '#FFF4C2', color: '#A07700', border: '#F8C300' },
  }
  const labels: Record<Agent['status'], string> = {
    idle: 'ocioso',
    spawning: 'iniciando',
    working: 'trabalhando',
    reviewing: 'revisando',
    completed: 'concluído',
    blocked: 'bloqueado',
    error: 'erro',
    timeout: 'timeout',
  }
  const s = styles[status]
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '2px 8px',
        borderRadius: '999px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {labels[status]}
    </span>
  )
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: '#6E665A',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: '20px',
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  )
}

