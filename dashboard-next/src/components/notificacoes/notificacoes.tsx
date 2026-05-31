'use client'

import { useEffect, useState, useRef } from 'react'
import type { AgentEvent } from '@/types/agents'
import { IconRocket, IconCheck, IconWarning, IconInfo, IconBell, IconClose } from '@/components/icons/icons'

interface Notificacao {
  id: string
  tipo: 'inicio' | 'concluida' | 'erro' | 'info'
  titulo: string
  descricao: string
  taskId?: string
  agente?: string
  acaoLabel?: string
  onAcao?: () => void
  ts: number
}

interface NotificacoesProps {
  eventos: AgentEvent[]
  onAcionarTarefa?: (taskId: string) => void
  onAcionarAgente?: (agentId: string) => void
}

const DURACAO_MS = 8000
const MAX_VISIVEIS = 5

export function Notificacoes({ eventos, onAcionarTarefa, onAcionarAgente }: NotificacoesProps) {
  const [ativas, setAtivas] = useState<Notificacao[]>([])
  const [permissao, setPermissao] = useState<NotificationPermission | 'unsupported'>('default')
  const eventosVistos = useRef<Set<string>>(new Set())
  const inicializou = useRef(false)

  // Carrega permissao inicial
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissao('unsupported')
      return
    }
    setPermissao(Notification.permission)
  }, [])

  // Detecta novos eventos relevantes e cria toasts
  useEffect(() => {
    // Na primeira renderização, marca todos os eventos como vistos sem notificar
    if (!inicializou.current) {
      for (const ev of eventos) {
        eventosVistos.current.add(`${ev.ts}-${ev.agente}-${ev.tipo}`)
      }
      inicializou.current = true
      return
    }

    const novas: Notificacao[] = []
    for (const ev of eventos) {
      const key = `${ev.ts}-${ev.agente}-${ev.tipo}`
      if (eventosVistos.current.has(key)) continue
      eventosVistos.current.add(key)

      // Filtra os eventos que viram notificações
      let notif: Notificacao | null = null

      if (ev.agente === 'orquestrador' && ev.tipo === 'spawning') {
        notif = {
          id: key,
          tipo: 'inicio',
          titulo: `Tarefa ${ev.taskId} iniciada`,
          descricao: ev.descricao || 'Pipeline em execução',
          taskId: ev.taskId,
          acaoLabel: 'Ver progresso',
          onAcao: () => onAcionarTarefa?.(ev.taskId),
          ts: ev.ts,
        }
      } else if (ev.agente === 'orquestrador' && ev.tipo === 'stopped' && ev.status === 'success') {
        notif = {
          id: key,
          tipo: 'concluida',
          titulo: `Tarefa ${ev.taskId} concluída`,
          descricao: ev.descricao || 'Pipeline finalizado com sucesso',
          taskId: ev.taskId,
          acaoLabel: 'Abrir relatório',
          onAcao: () => onAcionarTarefa?.(ev.taskId),
          ts: ev.ts,
        }
      } else if (ev.tipo === 'stopped' && ev.status === 'error') {
        notif = {
          id: key,
          tipo: 'erro',
          titulo: `${ev.agente} falhou`,
          descricao: ev.descricao || 'Erro na execução',
          taskId: ev.taskId,
          agente: ev.agente,
          acaoLabel: 'Ver logs',
          onAcao: () => onAcionarAgente?.(ev.agente),
          ts: ev.ts,
        }
      } else if (
        ev.tipo === 'stopped' &&
        ev.status === 'success' &&
        (ev.agente === 'teste-tech-lead' || ev.agente === 'doc-especialista')
      ) {
        notif = {
          id: key,
          tipo: 'info',
          titulo: `${ev.agente} concluiu`,
          descricao: ev.descricao || '',
          taskId: ev.taskId,
          agente: ev.agente,
          acaoLabel: 'Ver',
          onAcao: () => onAcionarAgente?.(ev.agente),
          ts: ev.ts,
        }
      }

      if (notif) {
        novas.push(notif)
        // Dispara browser notification se permitido
        if (typeof window !== 'undefined' && permissao === 'granted') {
          try {
            new Notification(notif.titulo, {
              body: notif.descricao,
              icon: '/favicon.svg',
              tag: notif.id,
            })
          } catch {
            /* silently ignore */
          }
        }
      }
    }

    if (novas.length === 0) return

    setAtivas((atual) => {
      const merged = [...atual, ...novas]
      // Limita a MAX_VISIVEIS — remove as mais antigas
      if (merged.length > MAX_VISIVEIS) return merged.slice(-MAX_VISIVEIS)
      return merged
    })

    // Auto-dismiss
    for (const n of novas) {
      setTimeout(() => {
        setAtivas((atual) => atual.filter((x) => x.id !== n.id))
      }, DURACAO_MS)
    }
  }, [eventos, permissao, onAcionarTarefa, onAcionarAgente])

  function dispensar(id: string) {
    setAtivas((atual) => atual.filter((n) => n.id !== id))
  }

  async function pedirPermissao() {
    if (permissao === 'unsupported' || !('Notification' in window)) return
    const r = await Notification.requestPermission()
    setPermissao(r)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '84px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 90,
        maxWidth: '380px',
        pointerEvents: 'none',
      }}
    >
      {permissao === 'default' && ativas.length === 0 && (
        <PermissaoCard onPermitir={pedirPermissao} />
      )}

      {ativas.map((n) => (
        <ToastCard key={n.id} notif={n} onDispensar={() => dispensar(n.id)} />
      ))}
    </div>
  )
}

function ToastCard({ notif, onDispensar }: { notif: Notificacao; onDispensar: () => void }) {
  const estilos: Record<
    Notificacao['tipo'],
    { borderLeft: string; bg: string; iconBg: string; iconColor: string; IconComp: typeof IconRocket }
  > = {
    inicio: {
      borderLeft: '#EC7000',
      bg: '#FFFFFF',
      iconBg: '#FFE8D2',
      iconColor: '#EC7000',
      IconComp: IconRocket,
    },
    concluida: {
      borderLeft: '#2D9D78',
      bg: '#FFFFFF',
      iconBg: 'rgba(45, 157, 120, 0.18)',
      iconColor: '#1B7F5F',
      IconComp: IconCheck,
    },
    erro: {
      borderLeft: '#DA3127',
      bg: '#FFFFFF',
      iconBg: '#FBE3E1',
      iconColor: '#DA3127',
      IconComp: IconWarning,
    },
    info: {
      borderLeft: '#003C8F',
      bg: '#FFFFFF',
      iconBg: 'rgba(0, 60, 143, 0.12)',
      iconColor: '#003C8F',
      IconComp: IconInfo,
    },
  }
  const s = estilos[notif.tipo]
  const IconComp = s.IconComp

  return (
    <div
      style={{
        background: s.bg,
        borderLeft: `4px solid ${s.borderLeft}`,
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 12px 28px rgba(26, 26, 26, 0.18)',
        animation: 'fade-in-up 0.3s ease-out',
        display: 'flex',
        gap: '12px',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: s.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComp size={18} color={s.iconColor} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '2px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#1A1A1A',
              lineHeight: 1.3,
            }}
          >
            {notif.titulo}
          </div>
          <button
            onClick={onDispensar}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#B0A89A',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dispensar"
          >
            <IconClose size={14} color="#B0A89A" strokeWidth={2} />
          </button>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#6E665A',
            lineHeight: 1.45,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {notif.descricao}
        </div>
        {notif.acaoLabel && notif.onAcao && (
          <button
            onClick={() => {
              notif.onAcao?.()
              onDispensar()
            }}
            style={{
              marginTop: '8px',
              background: 'transparent',
              border: 'none',
              color: s.borderLeft,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              letterSpacing: '0.02em',
            }}
          >
            {notif.acaoLabel} →
          </button>
        )}
      </div>
    </div>
  )
}

function PermissaoCard({ onPermitir }: { onPermitir: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 8px 20px rgba(26, 26, 26, 0.12)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <IconBell size={14} color="#EC7000" strokeWidth={2} />
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A' }}>Receber notificações?</div>
      </div>
      <div style={{ fontSize: '11px', color: '#6E665A', lineHeight: 1.4, marginBottom: '8px' }}>
        Avisamos no desktop quando uma tarefa iniciar, terminar ou falhar.
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onPermitir}
          style={{
            background: '#EC7000',
            color: '#FFFFFF',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Permitir
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            color: '#6E665A',
            border: '1px solid #D9CFC1',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  )
}
