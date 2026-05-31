'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AgentEvent } from '@/types/agents'
import { formatTime } from '@/lib/agent-utils'

type TabId = 'prompt' | 'atividade' | 'diff' | 'result' | 'files'

interface AtividadeItem {
  ts: number
  tipo: 'spawning' | 'stopped' | 'log'
  status?: 'success' | 'error'
  descricao: string
}

interface EventDetail {
  found: boolean
  ts: number
  agente: string
  taskId: string
  prompt?: string
  result?: string
  diff?: string
  files?: Array<{ path: string; status?: string; additions?: number; deletions?: number }>
  metadata?: Record<string, unknown>
  source?: string
  atividade?: AtividadeItem[]
}

interface EventoCardProps {
  evento: AgentEvent
  color: string
  isExpanded: boolean
  onToggle: () => void
}

export function EventoCard({ evento, color, isExpanded, onToggle }: EventoCardProps) {
  const [tab, setTab] = useState<TabId>('prompt')
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!evento.taskId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ts: String(evento.ts),
        agent: evento.agente,
        task: evento.taskId,
      })
      const res = await fetch(`/api/event-detail?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const d: EventDetail = await res.json()
      setDetail(d)
      // Escolhe tab inicial com base no que tem
      if (d.atividade?.length && d.source === 'events-fallback') setTab('atividade')
      else if (d.prompt) setTab('prompt')
      else if (d.diff) setTab('diff')
      else if (d.result) setTab('result')
      else if (d.files?.length) setTab('files')
    } finally {
      setLoading(false)
    }
  }, [evento.ts, evento.agente, evento.taskId])

  useEffect(() => {
    if (isExpanded && !detail) {
      fetchDetail()
    }
  }, [isExpanded, detail, fetchDetail])

  const isSpawn = evento.tipo === 'spawning'
  const isOk = evento.tipo === 'stopped' && evento.status === 'success'
  const isErr = evento.tipo === 'stopped' && evento.status === 'error'

  const tipoColor = isSpawn ? color : isOk ? '#1B7F5F' : isErr ? '#8C1F1F' : '#6E665A'
  const tipoBg = isSpawn
    ? `color-mix(in srgb, ${color} 12%, #FFFFFF)`
    : isOk
      ? 'rgba(45, 157, 120, 0.12)'
      : isErr
        ? '#FBE3E1'
        : '#F4ECE3'
  const tipoLabel = isSpawn ? 'INICIOU' : isOk ? 'CONCLUIU' : isErr ? 'FALHOU' : 'LOG'

  return (
    <div
      style={{
        borderBottom: '1px solid #F4ECE3',
        animation: 'fade-in-up 0.2s ease-out',
        background: isExpanded ? '#FBF6EE' : '#FFFFFF',
        transition: 'background 0.2s ease',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 22px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          gap: '14px',
          alignItems: 'baseline',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = '#FBF6EE'
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span
          style={{
            color: '#6E665A',
            fontSize: '11px',
            flexShrink: 0,
            width: '74px',
            fontWeight: 500,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {formatTime(new Date(evento.ts))}
        </span>
        <span
          style={{
            color: tipoColor,
            fontSize: '10px',
            fontWeight: 700,
            flexShrink: 0,
            width: '80px',
            letterSpacing: '0.05em',
            background: tipoBg,
            padding: '2px 6px',
            borderRadius: '4px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {tipoLabel}
        </span>
        <span
          style={{
            color: '#C75300',
            fontSize: '11px',
            flexShrink: 0,
            width: '95px',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {evento.taskId || '—'}
        </span>
        <span
          style={{
            color: '#1A1A1A',
            fontSize: '12px',
            flex: 1,
            wordBreak: 'break-word',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {evento.descricao || <em style={{ color: '#6E665A' }}>sem descrição</em>}
        </span>
        <span
          style={{
            color: '#6E665A',
            fontSize: '11px',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          ▾
        </span>
      </button>

      {isExpanded && (
        <DetalheExpandido detail={detail} loading={loading} color={color} tab={tab} setTab={setTab} evento={evento} />
      )}
    </div>
  )
}

function DetalheExpandido({
  detail,
  loading,
  color,
  tab,
  setTab,
  evento,
}: {
  detail: EventDetail | null
  loading: boolean
  color: string
  tab: TabId
  setTab: (t: TabId) => void
  evento: AgentEvent
}) {
  if (loading) {
    return (
      <div style={{ padding: '20px 28px', color: '#6E665A', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
        Carregando detalhe...
      </div>
    )
  }

  if (!detail?.found) {
    return (
      <div
        style={{
          padding: '14px 28px 18px',
          color: '#6E665A',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          background: '#FBF6EE',
          borderTop: '1px dashed #D9CFC1',
        }}
      >
        <div style={{ marginBottom: '6px', fontWeight: 600 }}>Sem dados para este evento</div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          Nem o arquivo MD detalhado nem eventos brutos foram encontrados.
        </div>
      </div>
    )
  }

  const hasPrompt = !!detail.prompt
  const hasDiff = !!detail.diff
  const hasResult = !!detail.result
  const hasFiles = (detail.files?.length ?? 0) > 0
  const hasAtividade = (detail.atividade?.length ?? 0) > 0
  const isFallback = detail.source === 'events-fallback'

  return (
    <div
      style={{
        borderTop: '1px solid #EDE7DD',
        background: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Tabs do detalhe */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '0 22px',
          background: '#FBF6EE',
          borderBottom: '1px solid #EDE7DD',
        }}
      >
        <DetailTab
          label={`Atividade${hasAtividade ? ` (${detail.atividade!.length})` : ''}`}
          icon="⚡"
          disabled={!hasAtividade}
          active={tab === 'atividade'}
          onClick={() => setTab('atividade')}
          color={color}
        />
        <DetailTab label="Prompt" icon="✎" disabled={!hasPrompt} active={tab === 'prompt'} onClick={() => setTab('prompt')} color={color} />
        <DetailTab label="Diff" icon="◧" disabled={!hasDiff} active={tab === 'diff'} onClick={() => setTab('diff')} color={color} />
        <DetailTab label="Resultado" icon="✓" disabled={!hasResult} active={tab === 'result'} onClick={() => setTab('result')} color={color} />
        <DetailTab
          label={`Arquivos${hasFiles ? ` (${detail.files!.length})` : ''}`}
          icon="◫"
          disabled={!hasFiles}
          active={tab === 'files'}
          onClick={() => setTab('files')}
          color={color}
        />
      </div>

      {/* Conteudo */}
      <div style={{ padding: '14px 22px 18px', maxHeight: '380px', overflowY: 'auto' }}>
        {tab === 'atividade' && hasAtividade && (
          <AtividadeBlock atividade={detail.atividade!} isFallback={isFallback} color={color} />
        )}
        {tab === 'prompt' && hasPrompt && <PromptBlock text={detail.prompt!} />}
        {tab === 'diff' && hasDiff && <DiffBlock diff={detail.diff!} />}
        {tab === 'result' && hasResult && <ResultBlock text={detail.result!} />}
        {tab === 'files' && hasFiles && <FilesBlock files={detail.files!} />}

        {tab === 'atividade' && !hasAtividade && <EmptyTab label="atividade" />}
        {tab === 'prompt' && !hasPrompt && <EmptyTab label="prompt" />}
        {tab === 'diff' && !hasDiff && <EmptyTab label="diff" />}
        {tab === 'result' && !hasResult && <EmptyTab label="resultado" />}
        {tab === 'files' && !hasFiles && <EmptyTab label="arquivos" />}
      </div>
    </div>
  )
}

function DetailTab({
  label,
  icon,
  active,
  disabled,
  onClick,
  color,
}: {
  label: string
  icon: string
  active: boolean
  disabled: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '8px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        fontWeight: active ? 700 : 500,
        color: disabled ? '#B0A89A' : active ? color : '#6E665A',
        borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
        marginBottom: '-1px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: '12px' }}>{icon}</span>
      {label}
    </button>
  )
}

function PromptBlock({ text }: { text: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6E665A',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        Prompt recebido pelo agente
      </div>
      <pre
        style={{
          background: '#FBF6EE',
          border: '1px solid #EDE7DD',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: '#1A1A1A',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: "'JetBrains Mono', monospace",
          margin: 0,
        }}
      >
        {text}
      </pre>
    </div>
  )
}

function ResultBlock({ text }: { text: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6E665A',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        Resultado retornado pelo agente
      </div>
      <pre
        style={{
          background: 'rgba(45, 157, 120, 0.06)',
          border: '1px solid rgba(45, 157, 120, 0.25)',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: '#1A1A1A',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'Inter, sans-serif',
          margin: 0,
        }}
      >
        {text}
      </pre>
    </div>
  )
}

function DiffBlock({ diff }: { diff: string }) {
  const linhas = diff.split('\n')
  return (
    <div>
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6E665A',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        Antes / depois do código
      </div>
      <pre
        style={{
          background: '#FBFAF6',
          border: '1px solid #EDE7DD',
          borderRadius: '8px',
          padding: '0',
          fontSize: '12px',
          lineHeight: 1.55,
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          overflow: 'auto',
        }}
      >
        {linhas.map((linha, idx) => {
          if (linha.startsWith('diff --git')) {
            return (
              <div
                key={idx}
                style={{
                  background: '#1A1A1A',
                  color: '#EC7000',
                  padding: '6px 14px',
                  fontWeight: 700,
                  marginTop: idx > 0 ? '6px' : '0',
                  fontSize: '11.5px',
                }}
              >
                {linha}
              </div>
            )
          }
          if (linha.startsWith('@@')) {
            return (
              <div
                key={idx}
                style={{
                  background: '#FFF4C2',
                  color: '#A07700',
                  padding: '3px 14px',
                  fontWeight: 700,
                  fontSize: '11.5px',
                }}
              >
                {linha}
              </div>
            )
          }
          if (linha.startsWith('---') || linha.startsWith('+++') || linha.startsWith('index ')) {
            return (
              <div key={idx} style={{ background: '#2D2D2D', color: '#A8A8C0', padding: '2px 14px', fontSize: '11px' }}>
                {linha}
              </div>
            )
          }
          if (linha.startsWith('+')) {
            return (
              <div
                key={idx}
                style={{ background: 'rgba(45, 157, 120, 0.10)', color: '#1B7F5F', padding: '0 14px', display: 'flex' }}
              >
                <span style={{ width: '20px', flexShrink: 0, fontWeight: 700 }}>+</span>
                <span>{linha.slice(1)}</span>
              </div>
            )
          }
          if (linha.startsWith('-')) {
            return (
              <div
                key={idx}
                style={{ background: 'rgba(218, 49, 39, 0.08)', color: '#8C1F1F', padding: '0 14px', display: 'flex' }}
              >
                <span style={{ width: '20px', flexShrink: 0, fontWeight: 700 }}>−</span>
                <span>{linha.slice(1)}</span>
              </div>
            )
          }
          return (
            <div key={idx} style={{ color: '#3D3830', padding: '0 14px', display: 'flex' }}>
              <span style={{ width: '20px', flexShrink: 0 }} />
              <span>{linha}</span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function FilesBlock({
  files,
}: {
  files: Array<{ path: string; status?: string; additions?: number; deletions?: number }>
}) {
  const statusColor: Record<string, { bg: string; color: string }> = {
    A: { bg: 'rgba(45, 157, 120, 0.18)', color: '#1B7F5F' },
    M: { bg: 'rgba(248, 195, 0, 0.20)', color: '#A07700' },
    D: { bg: '#FBE3E1', color: '#8C1F1F' },
    R: { bg: 'rgba(0, 60, 143, 0.12)', color: '#003C8F' },
  }
  return (
    <div>
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6E665A',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        Arquivos modificados neste evento
      </div>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #EDE7DD',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {files.map((f, idx) => {
          const s = statusColor[f.status ?? 'M'] ?? statusColor['M']
          return (
            <div
              key={f.path}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '8px 12px',
                borderBottom: idx < files.length - 1 ? '1px solid #F4ECE3' : 'none',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: s.bg,
                  color: s.color,
                  flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {f.status ?? 'M'}
              </span>
              <code style={{ fontSize: '12px', color: '#1A1A1A', flex: 1, wordBreak: 'break-all', background: 'transparent', padding: 0 }}>
                {f.path}
              </code>
              {(f.additions || f.deletions) && (
                <span style={{ display: 'flex', gap: '6px', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                  {f.additions ? (
                    <span style={{ color: '#1B7F5F', fontSize: '11px', fontWeight: 700 }}>+{f.additions}</span>
                  ) : null}
                  {f.deletions ? (
                    <span style={{ color: '#8C1F1F', fontSize: '11px', fontWeight: 700 }}>−{f.deletions}</span>
                  ) : null}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AtividadeBlock({
  atividade,
  isFallback,
  color,
}: {
  atividade: AtividadeItem[]
  isFallback: boolean
  color: string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6E665A',
            fontWeight: 700,
          }}
        >
          O que o agente está fazendo
        </div>
        {isFallback && (
          <span
            style={{
              fontSize: '9px',
              padding: '2px 7px',
              borderRadius: '999px',
              background: 'rgba(0, 60, 143, 0.10)',
              color: '#003C8F',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: '1px solid rgba(0, 60, 143, 0.30)',
            }}
            title="Detalhes montados a partir dos eventos brutos. Para prompt + diff completos, o agente precisa gravar o arquivo .md."
          >
            tempo real
          </span>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          paddingLeft: '20px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '5px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: `linear-gradient(180deg, ${color} 0%, #EDE7DD 100%)`,
            borderRadius: '1px',
          }}
        />

        {atividade.map((ev, idx) => {
          const isLast = idx === atividade.length - 1
          const cor =
            ev.tipo === 'spawning'
              ? color
              : ev.tipo === 'stopped'
                ? ev.status === 'success'
                  ? '#2D9D78'
                  : '#DA3127'
                : '#6E665A'
          const label =
            ev.tipo === 'spawning'
              ? 'INICIOU'
              : ev.tipo === 'stopped'
                ? ev.status === 'success'
                  ? 'CONCLUIU'
                  : 'FALHOU'
                : 'LOG'

          return (
            <div
              key={`${ev.ts}-${idx}`}
              style={{
                position: 'relative',
                paddingLeft: '14px',
                paddingBottom: isLast ? '0' : '14px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-9px',
                  top: '3px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cor,
                  border: '2px solid #FFFFFF',
                  boxShadow: `0 0 0 1px ${cor}`,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'baseline',
                  marginBottom: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: cor,
                    background: `color-mix(in srgb, ${cor} 10%, #FFFFFF)`,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: `1px solid color-mix(in srgb, ${cor} 30%, transparent)`,
                  }}
                >
                  {label}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: '#6E665A',
                  }}
                >
                  {new Date(ev.ts).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#1A1A1A',
                  lineHeight: 1.5,
                  fontFamily: 'Inter, sans-serif',
                  wordBreak: 'break-word',
                }}
              >
                {ev.descricao || <em style={{ color: '#6E665A' }}>sem descrição</em>}
              </div>
            </div>
          )
        })}
      </div>

      {isFallback && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: '#FBF6EE',
            border: '1px dashed #D9CFC1',
            borderRadius: '7px',
            fontSize: '11px',
            color: '#6E665A',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: '#3D3830' }}>Quer mais detalhes?</strong> O agente pode gravar o
          prompt completo, diff de código e lista de arquivos modificados em um arquivo dedicado.
          Adicione nas instruções do agente em <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#FFFFFF', padding: '1px 5px', borderRadius: '3px' }}>.claude/agents/</code>:
          ele deve criar <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#FFFFFF', padding: '1px 5px', borderRadius: '3px', color: '#C75300' }}>.workflow/tasks/{`{TASK}`}/events/{`{ts}`}-{`{agente}`}.md</code> ao executar.
        </div>
      )}
    </div>
  )
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px',
        color: '#6E665A',
        fontSize: '12px',
        fontStyle: 'italic',
      }}
    >
      Nenhum {label} registrado para este evento.
    </div>
  )
}
