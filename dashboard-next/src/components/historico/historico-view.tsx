'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import type { TarefaHistorico } from '@/types/agents'
import { IconFile, IconPlay } from '@/components/icons/icons'

interface HistoricoViewProps {
  onAbrirTarefa?: (taskId: string) => void
  onExecutarTarefa?: (taskId: string, resultado: ResultadoExecucao) => void
}

interface ResultadoExecucao {
  iniciado: boolean
  pid?: number
  taskId?: string
  metodo?: string
  mensagem?: string
  erro?: string
  comando_manual?: string
}

export function HistoricoView({ onAbrirTarefa, onExecutarTarefa }: HistoricoViewProps = {}) {
  const [tarefas, setTarefas] = useState<TarefaHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'all' | TarefaHistorico['status']>('all')
  const [filtroVeredicto, setFiltroVeredicto] = useState<'all' | 'PASS' | 'WARN' | 'FAIL'>('all')

  const fetchHistorico = useCallback(async () => {
    try {
      const res = await fetch('/api/historico', { cache: 'no-store' })
      const data = await res.json()
      setTarefas(data.tarefas || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistorico()
    const id = setInterval(fetchHistorico, 10_000)
    return () => clearInterval(id)
  }, [fetchHistorico])

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroStatus !== 'all' && t.status !== filtroStatus) return false
      if (filtroVeredicto !== 'all' && t.veredicto !== filtroVeredicto) return false
      if (busca) {
        const lower = busca.toLowerCase()
        const match =
          t.id.toLowerCase().includes(lower) ||
          t.titulo.toLowerCase().includes(lower) ||
          t.tipo.toLowerCase().includes(lower) ||
          t.projetos.some((p) => p.toLowerCase().includes(lower))
        if (!match) return false
      }
      return true
    })
  }, [tarefas, busca, filtroStatus, filtroVeredicto])

  const stats = useMemo(() => {
    return {
      total: tarefas.length,
      pendente: tarefas.filter((t) => t.status === 'pendente').length,
      execucao: tarefas.filter((t) => t.status === 'em-execucao').length,
      concluida: tarefas.filter((t) => t.status === 'concluida').length,
      falha: tarefas.filter((t) => t.status === 'falha').length,
      pass: tarefas.filter((t) => t.veredicto === 'PASS').length,
      warn: tarefas.filter((t) => t.veredicto === 'WARN').length,
      fail: tarefas.filter((t) => t.veredicto === 'FAIL').length,
    }
  }, [tarefas])

  return (
    <div style={{ padding: '28px', height: '100%', overflow: 'auto', background: '#FBF6EE' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#1A1A1A',
              letterSpacing: '-0.01em',
            }}
          >
            Histórico de tarefas
          </h2>
          <p style={{ fontSize: '13px', color: '#6E665A', marginTop: '6px' }}>
            Todas as tarefas registradas no agent-itau, com status, agentes envolvidos e relatório PDF.
          </p>
        </header>

        {/* Stats rápidos */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <Chip label="Total" value={stats.total} cor="#1A1A1A" />
          <Chip label="Em execução" value={stats.execucao} cor="#EC7000" />
          <Chip label="Concluídas" value={stats.concluida} cor="#2D9D78" />
          <Chip label="Com falha" value={stats.falha} cor={stats.falha > 0 ? '#DA3127' : '#B0A89A'} />
        </div>

        {/* Filtros */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #EDE7DD',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '14px',
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(26, 26, 26, 0.04)',
          }}
        >
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por ID, título, tipo ou projeto…"
            style={{
              background: '#FBF6EE',
              border: '1px solid #D9CFC1',
              borderRadius: '7px',
              padding: '7px 12px',
              fontSize: '13px',
              outline: 'none',
              flex: 1,
              minWidth: '240px',
            }}
          />

          <SelectFiltro
            value={filtroStatus}
            onChange={(v) => setFiltroStatus(v as typeof filtroStatus)}
            opcoes={[
              { value: 'all', label: 'Todos os status' },
              { value: 'pendente', label: 'Pendentes' },
              { value: 'em-execucao', label: 'Em execução' },
              { value: 'concluida', label: 'Concluídas' },
              { value: 'falha', label: 'Falha' },
            ]}
          />

          <SelectFiltro
            value={filtroVeredicto}
            onChange={(v) => setFiltroVeredicto(v as typeof filtroVeredicto)}
            opcoes={[
              { value: 'all', label: 'Qualquer veredicto' },
              { value: 'PASS', label: 'PASS' },
              { value: 'WARN', label: 'WARN' },
              { value: 'FAIL', label: 'FAIL' },
            ]}
          />

          <span style={{ fontSize: '11px', color: '#6E665A', fontWeight: 600 }}>
            {filtradas.length} de {tarefas.length}
          </span>
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6E665A' }}>Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '2px dashed #D9CFC1',
            }}
          >
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <IconFile size={40} color="#B0A89A" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>
              {tarefas.length === 0 ? 'Nenhuma tarefa registrada' : 'Nenhuma tarefa corresponde aos filtros'}
            </div>
            {tarefas.length === 0 && (
              <div style={{ fontSize: '12px', color: '#6E665A', marginTop: '8px' }}>
                Execute <code style={{ background: '#FBF6EE', padding: '1px 6px', borderRadius: '4px', color: '#C75300', fontFamily: 'monospace' }}>/nova-tarefa</code> no Claude Code pra começar.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtradas.map((t) => (
              <LinhaHistorico
                key={t.id}
                tarefa={t}
                onAbrir={onAbrirTarefa}
                onExecutar={onExecutarTarefa}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '12px',
        padding: '14px 16px',
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
          width: '3px',
          height: '100%',
          background: cor,
        }}
      />
      <div
        style={{
          fontSize: '10px',
          color: '#6E665A',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: '3px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: cor,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SelectFiltro<T extends string>({
  value,
  onChange,
  opcoes,
}: {
  value: T
  onChange: (v: T) => void
  opcoes: Array<{ value: T; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        background: '#FBF6EE',
        border: '1px solid #D9CFC1',
        borderRadius: '7px',
        padding: '7px 12px',
        fontSize: '12px',
        color: '#1A1A1A',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {opcoes.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function LinhaHistorico({
  tarefa,
  onAbrir,
  onExecutar,
}: {
  tarefa: TarefaHistorico
  onAbrir?: (id: string) => void
  onExecutar?: (id: string, resultado: ResultadoExecucao) => void
}) {
  const [executando, setExecutando] = useState(false)

  async function executar(simular = false) {
    setExecutando(true)
    try {
      const qs = simular ? `?id=${tarefa.id}&simular=1` : `?id=${tarefa.id}`
      const res = await fetch(`/api/tarefas/executar${qs}`, { method: 'POST' })
      const data: ResultadoExecucao = await res.json()
      onExecutar?.(tarefa.id, data)
    } finally {
      setExecutando(false)
    }
  }

  function formatarDuracao(ms?: number): string {
    if (!ms) return '—'
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
    return `${(ms / 3_600_000).toFixed(1)}h`
  }

  const corNota = tarefa.nota
    ? tarefa.nota >= 80
      ? '#1B7F5F'
      : tarefa.nota >= 60
        ? '#A07700'
        : '#8C1F1F'
    : '#B0A89A'

  const dataFormatada = tarefa.criado_em
    ? new Date(tarefa.criado_em + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '12px',
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(26, 26, 26, 0.04)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(26, 26, 26, 0.08)'
        e.currentTarget.style.borderColor = '#D9CFC1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 26, 26, 0.04)'
        e.currentTarget.style.borderColor = '#EDE7DD'
      }}
    >
      {/* Linha 1: ID + título + ações */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '12px',
        }}
      >
        <span
          className="mono"
          style={{
            color: '#C75300',
            fontWeight: 700,
            fontSize: '13px',
            background: '#FFE8D2',
            padding: '4px 9px',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          {tarefa.id}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#1A1A1A',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={tarefa.titulo}
          >
            {tarefa.titulo}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#6E665A',
              marginTop: '4px',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600 }}>{tarefa.tipo}</span>
            {tarefa.projetos.length > 0 && (
              <>
                <span style={{ color: '#D9CFC1' }}>·</span>
                <span className="mono">{tarefa.projetos.join(', ')}</span>
              </>
            )}
            {dataFormatada && (
              <>
                <span style={{ color: '#D9CFC1' }}>·</span>
                <span>{dataFormatada}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {onExecutar && (
            <>
              <button
                onClick={() => executar(false)}
                disabled={executando}
                title="Execução REAL — abre o Terminal e o Claude edita o código do projeto de verdade"
                style={{
                  background: executando ? '#FFE8D2' : '#EC7000',
                  color: executando ? '#C75300' : '#FFFFFF',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: executando ? 'wait' : 'pointer',
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: executando ? 'none' : '0 2px 6px rgba(236, 112, 0, 0.30)',
                }}
              >
                <IconPlay size={11} color={executando ? '#C75300' : '#FFFFFF'} strokeWidth={2.5} />
                {executando ? 'Iniciando…' : 'Executar'}
              </button>
              <button
                onClick={() => executar(true)}
                disabled={executando}
                title="Simulação — anima o pipeline e gera o PDF, sem tocar no código real"
                style={{
                  background: '#FFFFFF',
                  color: '#6E665A',
                  border: '1px solid #D9CFC1',
                  padding: '7px 12px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: executando ? 'wait' : 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Simular
              </button>
            </>
          )}
          {onAbrir && (
            <button
              onClick={() => onAbrir(tarefa.id)}
              title="Acompanhar progresso"
              style={{
                background: '#FFFFFF',
                color: '#C75300',
                border: '1px solid #EC7000',
                padding: '7px 12px',
                borderRadius: '7px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              Abrir
            </button>
          )}
          {tarefa.pdf?.existe && (
            <a
              href={`/api/relatorio?task=${tarefa.id}`}
              target="_blank"
              rel="noreferrer"
              title={`Abrir PDF (${tarefa.pdf.size_kb} KB)`}
              style={{
                background: '#1A1A1A',
                color: '#FFFFFF',
                padding: '7px 12px',
                borderRadius: '7px',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              PDF
            </a>
          )}
        </div>
      </div>

      {/* Linha 2: chips de meta */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          paddingTop: '12px',
          borderTop: '1px solid #F4ECE3',
        }}
      >
        <MetaChip label="Status">
          <StatusBadge status={tarefa.status} />
        </MetaChip>

        <MetaChip label="Veredicto">
          {tarefa.veredicto ? <VeredictoBadge veredicto={tarefa.veredicto} /> : <Vazio />}
        </MetaChip>

        <MetaChip label="Nota">
          <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: corNota }}>
            {tarefa.nota != null ? `${tarefa.nota}/100` : '—'}
          </span>
        </MetaChip>

        <MetaChip label="Duração">
          <span className="mono" style={{ fontSize: '12px', color: '#3D3830', fontWeight: 600 }}>
            {formatarDuracao(tarefa.duracao_ms)}
          </span>
        </MetaChip>

        {tarefa.agentes_envolvidos.length > 0 && (
          <MetaChip label="Agentes">
            <span className="mono" style={{ fontSize: '12px', color: '#003C8F', fontWeight: 700 }}>
              {tarefa.agentes_envolvidos.length}
            </span>
          </MetaChip>
        )}
      </div>
    </div>
  )
}

function MetaChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FBF6EE',
        border: '1px solid #EDE7DD',
        borderRadius: '8px',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          color: '#6E665A',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function Vazio() {
  return <span style={{ color: '#B0A89A', fontSize: '12px' }}>—</span>
}

function StatusBadge({ status }: { status: TarefaHistorico['status'] }) {
  const styles: Record<TarefaHistorico['status'], { bg: string; color: string; label: string; border: string }> = {
    pendente: { bg: '#F4ECE3', color: '#6E665A', label: 'pendente', border: '#D9CFC1' },
    'em-execucao': { bg: '#FFE8D2', color: '#C75300', label: 'em execução', border: '#EC7000' },
    concluida: { bg: 'rgba(45, 157, 120, 0.14)', color: '#1B7F5F', label: 'concluída', border: '#2D9D78' },
    falha: { bg: '#FBE3E1', color: '#8C1F1F', label: 'falha', border: '#DA3127' },
  }
  const s = styles[status]
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '3px 8px',
        borderRadius: '999px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        display: 'inline-block',
        textAlign: 'center',
      }}
    >
      {s.label}
    </span>
  )
}

function VeredictoBadge({ veredicto }: { veredicto?: TarefaHistorico['veredicto'] }) {
  if (!veredicto) return <span style={{ color: '#B0A89A', fontSize: '11px' }}>—</span>
  const styles = {
    PASS: { bg: 'rgba(45, 157, 120, 0.14)', color: '#1B7F5F', border: '#2D9D78' },
    WARN: { bg: '#FFF4C2', color: '#A07700', border: '#F8C300' },
    FAIL: { bg: '#FBE3E1', color: '#8C1F1F', border: '#DA3127' },
  }
  const s = styles[veredicto]
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '3px 8px',
        borderRadius: '4px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        display: 'inline-block',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {veredicto}
    </span>
  )
}
