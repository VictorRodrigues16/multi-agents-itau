'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'

interface TarefaItem {
  id: string
  titulo: string
  status: 'pendente' | 'em-execucao' | 'concluida' | 'falha'
  veredicto?: 'PASS' | 'WARN' | 'FAIL'
}

interface TaskSwitcherProps {
  taskAtual: string | null // o ID que esta sendo visualizado (null = Live)
  taskIdsConhecidos: string[]
  onSelect: (id: string | null) => void
}

export function TaskSwitcher({ taskAtual, taskIdsConhecidos, onSelect }: TaskSwitcherProps) {
  const [aberto, setAberto] = useState(false)
  const [tarefas, setTarefas] = useState<TarefaItem[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const fetchTarefas = useCallback(async () => {
    try {
      const res = await fetch('/api/historico', { cache: 'no-store' })
      const d = await res.json()
      setTarefas(d.tarefas || [])
    } catch {
      /* ignora */
    }
  }, [])

  useEffect(() => {
    fetchTarefas()
    const id = setInterval(fetchTarefas, 8000)
    return () => clearInterval(id)
  }, [fetchTarefas])

  // Une historico + tarefas vistas nos eventos (caso alguma so esteja em runtime)
  const lista = useMemo(() => {
    const mapa = new Map<string, TarefaItem>()
    for (const t of tarefas) {
      mapa.set(t.id, {
        id: t.id,
        titulo: t.titulo,
        status: t.status,
        veredicto: t.veredicto as TarefaItem['veredicto'],
      })
    }
    for (const id of taskIdsConhecidos) {
      if (!mapa.has(id)) {
        mapa.set(id, { id, titulo: id, status: 'em-execucao' })
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.id.localeCompare(a.id))
  }, [tarefas, taskIdsConhecidos])

  const tarefaAtualInfo = useMemo(() => {
    if (!taskAtual) return null
    return lista.find((t) => t.id === taskAtual) ?? { id: taskAtual, titulo: taskAtual, status: 'em-execucao' as const }
  }, [taskAtual, lista])

  const idxAtual = taskAtual ? lista.findIndex((t) => t.id === taskAtual) : -1

  // Click fora fecha
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    if (aberto) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [aberto])

  // ESC fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    if (aberto) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto])

  function anterior() {
    if (idxAtual < 0) {
      if (lista.length > 0) onSelect(lista[0].id)
      return
    }
    const proxIdx = Math.min(idxAtual + 1, lista.length - 1)
    onSelect(lista[proxIdx]?.id ?? null)
  }
  function seguinte() {
    if (idxAtual < 0) return
    const proxIdx = Math.max(idxAtual - 1, 0)
    onSelect(lista[proxIdx]?.id ?? null)
  }

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', flexShrink: 0 }}>
      <span
        style={{
          fontSize: '10px',
          color: '#6E665A',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        Tarefa
      </span>

      {/* Botões de navegação */}
      <button
        onClick={anterior}
        disabled={lista.length === 0 || (idxAtual === lista.length - 1)}
        title="Tarefa anterior"
        style={{
          ...btnNav,
          opacity: lista.length === 0 || idxAtual === lista.length - 1 ? 0.35 : 1,
          cursor: lista.length === 0 || idxAtual === lista.length - 1 ? 'not-allowed' : 'pointer',
        }}
      >
        ‹
      </button>

      {/* Botão principal — abre dropdown */}
      <button
        onClick={() => setAberto((v) => !v)}
        title={tarefaAtualInfo ? `${tarefaAtualInfo.id} — ${tarefaAtualInfo.titulo}` : 'Modo Live'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: taskAtual ? '#FFE8D2' : 'rgba(0, 60, 143, 0.10)',
          border: `1px solid ${taskAtual ? '#EC7000' : '#003C8F'}`,
          color: taskAtual ? '#C75300' : '#003C8F',
          borderRadius: '7px',
          padding: '5px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: 700,
          maxWidth: '260px',
        }}
      >
        {taskAtual ? (
          <>
            <span className="mono">{tarefaAtualInfo?.id}</span>
            {tarefaAtualInfo?.titulo && tarefaAtualInfo.titulo !== tarefaAtualInfo.id && (
              <span
                style={{
                  fontWeight: 500,
                  color: '#6E665A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '160px',
                }}
              >
                {tarefaAtualInfo.titulo}
              </span>
            )}
          </>
        ) : (
          <>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#003C8F', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            Live · todas
          </>
        )}
        <span style={{ fontSize: '9px', opacity: 0.7 }}>▾</span>
      </button>

      <button
        onClick={seguinte}
        disabled={lista.length === 0 || idxAtual <= 0}
        title="Próxima tarefa"
        style={{
          ...btnNav,
          opacity: lista.length === 0 || idxAtual <= 0 ? 0.35 : 1,
          cursor: lista.length === 0 || idxAtual <= 0 ? 'not-allowed' : 'pointer',
        }}
      >
        ›
      </button>

      {aberto && (
        <Dropdown
          tarefaAtual={taskAtual}
          lista={lista}
          onSelect={(id) => {
            onSelect(id)
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

function Dropdown({
  tarefaAtual,
  lista,
  onSelect,
}: {
  tarefaAtual: string | null
  lista: TarefaItem[]
  onSelect: (id: string | null) => void
}) {
  const [busca, setBusca] = useState('')
  const filtradas = useMemo(() => {
    if (!busca.trim()) return lista
    const q = busca.toLowerCase()
    return lista.filter((t) => t.id.toLowerCase().includes(q) || t.titulo.toLowerCase().includes(q))
  }, [lista, busca])

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '54px',
        width: '380px',
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '10px',
        boxShadow: '0 12px 32px rgba(26, 26, 26, 0.18)',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Modo Live no topo */}
      <button
        onClick={() => onSelect(null)}
        style={{
          width: '100%',
          background: tarefaAtual === null ? 'rgba(0, 60, 143, 0.10)' : '#FFFFFF',
          border: 'none',
          borderBottom: '1px solid #EDE7DD',
          padding: '10px 14px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#003C8F',
            animation: 'pulse-dot 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#003C8F' }}>Live · todas as tarefas</div>
          <div style={{ fontSize: '10px', color: '#6E665A', marginTop: '1px' }}>
            Acompanha a tarefa atualmente em execução
          </div>
        </div>
        {tarefaAtual === null && <span style={{ color: '#003C8F', fontWeight: 700 }}>✓</span>}
      </button>

      {/* Busca */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #EDE7DD', background: '#FBF6EE' }}>
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tarefa..."
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid #D9CFC1',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>

      {/* Lista */}
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6E665A', fontSize: '11px', fontStyle: 'italic' }}>
            Nenhuma tarefa.
          </div>
        ) : (
          filtradas.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                width: '100%',
                background: t.id === tarefaAtual ? '#FFE8D2' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #F4ECE3',
                padding: '9px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (t.id !== tarefaAtual) e.currentTarget.style.background = '#FBF6EE'
              }}
              onMouseLeave={(e) => {
                if (t.id !== tarefaAtual) e.currentTarget.style.background = 'transparent'
              }}
            >
              <StatusDot status={t.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: t.id === tarefaAtual ? '#C75300' : '#EC7000',
                    }}
                  >
                    {t.id}
                  </span>
                  {t.veredicto && <VeredictoMini veredicto={t.veredicto} />}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#1A1A1A',
                    fontWeight: 500,
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.titulo}
                </div>
              </div>
              {t.id === tarefaAtual && <span style={{ color: '#EC7000', fontWeight: 700 }}>✓</span>}
            </button>
          ))
        )}
      </div>

      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid #EDE7DD',
          background: '#FBF6EE',
          fontSize: '10px',
          color: '#6E665A',
        }}
      >
        {filtradas.length} de {lista.length} tarefas · use ← / → para navegar
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: TarefaItem['status'] }) {
  const cores: Record<TarefaItem['status'], string> = {
    pendente: '#B0A89A',
    'em-execucao': '#EC7000',
    concluida: '#2D9D78',
    falha: '#DA3127',
  }
  return (
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: cores[status],
        flexShrink: 0,
        animation: status === 'em-execucao' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }}
    />
  )
}

function VeredictoMini({ veredicto }: { veredicto: 'PASS' | 'WARN' | 'FAIL' }) {
  const styles = {
    PASS: { bg: 'rgba(45, 157, 120, 0.14)', color: '#1B7F5F' },
    WARN: { bg: '#FFF4C2', color: '#A07700' },
    FAIL: { bg: '#FBE3E1', color: '#8C1F1F' },
  }
  const s = styles[veredicto]
  return (
    <span
      className="mono"
      style={{
        fontSize: '9px',
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: '3px',
        background: s.bg,
        color: s.color,
      }}
    >
      {veredicto}
    </span>
  )
}

const btnNav: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D9CFC1',
  color: '#3D3830',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 700,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
