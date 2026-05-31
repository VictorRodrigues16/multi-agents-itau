'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { IconFolder, IconCheck } from '@/components/icons/icons'

interface FileChange {
  status: string
  path: string
  additions?: number
  deletions?: number
}

type Source = 'path' | 'worktree' | 'default'

interface DiffResponse {
  cwd: string
  branch: string | null
  diff: string
  staged: string
  files: FileChange[]
  resumo: { added: number; deleted: number; changed: number }
  conectado: boolean
  erro?: string
  source: Source
  agente?: string
  taskId?: string
}

interface DiffViewerProps {
  projectPath?: string
  agentId?: string
  taskId?: string
  refreshIntervalMs?: number
  accentColor?: string
}

export function DiffViewer({
  projectPath,
  agentId,
  taskId,
  refreshIntervalMs = 4000,
  accentColor = '#EC7000',
}: DiffViewerProps) {
  const [data, setData] = useState<DiffResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)

  const fetchDiff = useCallback(async () => {
    if (paused) return
    try {
      const params = new URLSearchParams()
      if (projectPath) params.set('path', projectPath)
      if (agentId) params.set('agent', agentId)
      if (taskId) params.set('task', taskId)
      const qs = params.toString()
      const url = qs ? `/api/diff?${qs}` : '/api/diff'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const json: DiffResponse = await res.json()
      // Evita re-render do diff a cada poll quando nada mudou (custoso em diffs grandes)
      setData((prev) =>
        prev &&
        prev.diff === json.diff &&
        prev.cwd === json.cwd &&
        prev.conectado === json.conectado &&
        prev.files.length === json.files.length
          ? prev
          : json,
      )
    } catch {
      // erro de rede ou JSON invalido: mantem o estado anterior, nao quebra a UI
    } finally {
      setLoading(false)
    }
  }, [projectPath, agentId, taskId, paused])

  useEffect(() => {
    fetchDiff()
    const id = setInterval(fetchDiff, refreshIntervalMs)
    return () => clearInterval(id)
  }, [fetchDiff, refreshIntervalMs])

  const diffPorArquivo = useMemo(() => {
    if (!data?.diff) return new Map<string, string>()
    const mapa = new Map<string, string>()
    const blocos = data.diff.split(/^diff --git /gm).filter(Boolean)
    for (const bloco of blocos) {
      const match = bloco.match(/^a\/([^\s]+) b\//)
      if (match) {
        mapa.set(match[1], 'diff --git ' + bloco)
      }
    }
    return mapa
  }, [data])

  const diffMostrado = useMemo(() => {
    if (!data) return ''
    if (arquivoSelecionado) {
      return diffPorArquivo.get(arquivoSelecionado) ?? ''
    }
    return data.diff
  }, [data, arquivoSelecionado, diffPorArquivo])

  if (loading && !data) {
    return (
      <div
        style={{
          padding: '48px 22px',
          textAlign: 'center',
          color: '#6E665A',
          fontSize: '13px',
          fontStyle: 'italic',
        }}
      >
        Carregando diff...
      </div>
    )
  }

  if (!data?.conectado) {
    return (
      <div
        style={{
          padding: '48px 22px',
          textAlign: 'center',
          color: '#6E665A',
          fontSize: '13px',
        }}
      >
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
          <IconFolder size={32} color="#B0A89A" strokeWidth={1.5} />
        </div>
        <div style={{ fontWeight: 600 }}>{data?.erro ?? 'Repositorio nao encontrado'}</div>
        <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
          Configure <code style={{ color: accentColor }}>AGENT_ITAU_DIFF_PATH</code> ou passe ?path=
        </div>
      </div>
    )
  }

  const semMudancas = !data.diff && data.files.length === 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar de arquivos */}
      <div
        style={{
          width: '280px',
          flexShrink: 0,
          background: '#FBF6EE',
          borderRight: '1px solid #EDE7DD',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #EDE7DD',
            background: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#6E665A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Branch
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              title={paused ? 'Retomar polling' : 'Pausar polling'}
              style={{
                background: paused ? 'rgba(45, 157, 120, 0.14)' : '#FFFFFF',
                border: `1px solid ${paused ? '#2D9D78' : '#D9CFC1'}`,
                color: paused ? '#1B7F5F' : '#3D3830',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {paused ? '▶' : '⏸'}
            </button>
          </div>
          <div className="mono" style={{ fontSize: '12px', color: accentColor, fontWeight: 700, marginTop: '3px' }}>
            {data.branch ?? '—'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11px' }}>
            <span style={{ color: '#1B7F5F', fontWeight: 700 }} className="mono">
              +{data.resumo.added}
            </span>
            <span style={{ color: '#8C1F1F', fontWeight: 700 }} className="mono">
              −{data.resumo.deleted}
            </span>
            <span style={{ color: '#6E665A', fontWeight: 500 }}>
              {data.resumo.changed} arquivo{data.resumo.changed !== 1 ? 's' : ''}
            </span>
          </div>
          <SourceBadge source={data.source} agente={data.agente} taskId={data.taskId} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          <button
            onClick={() => setArquivoSelecionado(null)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: !arquivoSelecionado ? '#FFE8D2' : 'transparent',
              border: 'none',
              padding: '6px 14px',
              borderLeft: !arquivoSelecionado ? `3px solid ${accentColor}` : '3px solid transparent',
              fontSize: '11px',
              color: !arquivoSelecionado ? '#C75300' : '#3D3830',
              cursor: 'pointer',
              fontWeight: !arquivoSelecionado ? 700 : 500,
              transition: 'background 0.15s ease',
            }}
          >
            ◧ Todos os arquivos
          </button>

          {data.files.map((f) => (
            <FileItem
              key={f.path}
              file={f}
              selected={arquivoSelecionado === f.path}
              onClick={() => setArquivoSelecionado(f.path)}
              accentColor={accentColor}
            />
          ))}

          {data.files.length === 0 && (
            <p
              style={{
                padding: '20px 14px',
                color: '#6E665A',
                fontSize: '11px',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              Sem alterações
            </p>
          )}
        </div>

        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid #EDE7DD',
            background: '#FFFFFF',
            fontSize: '10px',
            color: '#6E665A',
            flexShrink: 0,
          }}
          title={data.cwd}
        >
          <span style={{ fontWeight: 600 }}>cwd:</span>{' '}
          <span className="mono" style={{ wordBreak: 'break-all' }}>
            {data.cwd.replace(process.env.HOME || '', '~')}
          </span>
        </div>
      </div>

      {/* Diff body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#FBFAF6',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
        {semMudancas ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              color: '#6E665A',
              fontSize: '13px',
            }}
          >
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
              <IconCheck size={40} color="#2D9D78" strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 600 }}>Sem alterações em <span className="mono">{data.branch}</span></div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
              O diff aparece aqui em tempo real quando os agentes começarem a editar o código
            </div>
          </div>
        ) : (
          <DiffRender diff={diffMostrado || data.diff} />
        )}
      </div>
    </div>
  )
}

function FileItem({
  file,
  selected,
  onClick,
  accentColor,
}: {
  file: FileChange
  selected: boolean
  onClick: () => void
  accentColor: string
}) {
  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    A: { bg: 'rgba(45, 157, 120, 0.18)', color: '#1B7F5F', label: 'A' },
    M: { bg: 'rgba(248, 195, 0, 0.20)', color: '#A07700', label: 'M' },
    D: { bg: '#FBE3E1', color: '#8C1F1F', label: 'D' },
    R: { bg: 'rgba(0, 60, 143, 0.12)', color: '#003C8F', label: 'R' },
    '?': { bg: '#F4ECE3', color: '#6E665A', label: '?' },
  }
  const s = statusStyles[file.status] ?? statusStyles['?']

  return (
    <button
      onClick={onClick}
      title={file.path}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? '#FFE8D2' : 'transparent',
        border: 'none',
        padding: '6px 14px 6px 14px',
        borderLeft: selected ? `3px solid ${accentColor}` : '3px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = '#F4ECE3'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: '3px',
          background: s.bg,
          color: s.color,
          flexShrink: 0,
        }}
      >
        {s.label}
      </span>
      <span
        className="mono"
        style={{
          color: selected ? '#C75300' : '#3D3830',
          fontWeight: selected ? 700 : 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          direction: 'rtl',
          textAlign: 'left',
        }}
      >
        {file.path}
      </span>
      {(file.additions || file.deletions) ? (
        <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {file.additions ? (
            <span className="mono" style={{ color: '#1B7F5F', fontSize: '10px', fontWeight: 600 }}>
              +{file.additions}
            </span>
          ) : null}
          {file.deletions ? (
            <span className="mono" style={{ color: '#8C1F1F', fontSize: '10px', fontWeight: 600 }}>
              −{file.deletions}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  )
}

const MAX_LINHAS_DIFF = 1500

function DiffRender({ diff }: { diff: string }) {
  const linhas = useMemo(() => diff.split('\n'), [diff])
  const truncado = linhas.length > MAX_LINHAS_DIFF
  const visiveis = useMemo(
    () => (truncado ? linhas.slice(0, MAX_LINHAS_DIFF) : linhas),
    [linhas, truncado],
  )

  return (
    <pre
      style={{
        margin: 0,
        padding: '8px 0',
        fontSize: '12px',
        lineHeight: 1.55,
        whiteSpace: 'pre',
      }}
    >
      {visiveis.map((linha, idx) => (
        <LinhaDiff key={idx} linha={linha} />
      ))}
      {truncado && (
        <div
          style={{
            margin: '12px 16px',
            padding: '12px 16px',
            background: '#FFF4C2',
            border: '1px solid #F8C300',
            borderRadius: '8px',
            color: '#A07700',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.5,
            whiteSpace: 'normal',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Diff muito grande — mostrando as primeiras{' '}
          {MAX_LINHAS_DIFF.toLocaleString('pt-BR')} de {linhas.length.toLocaleString('pt-BR')}{' '}
          linhas. Selecione um arquivo na lista à esquerda para ver o diff completo dele.
        </div>
      )}
    </pre>
  )
}

function LinhaDiff({ linha }: { linha: string }) {
  let bg = 'transparent'
  let color = '#3D3830'
  let prefix = '  '

  if (linha.startsWith('diff --git')) {
    return (
      <div
        style={{
          background: '#1A1A1A',
          color: '#EC7000',
          padding: '6px 16px',
          fontWeight: 700,
          marginTop: '8px',
          fontSize: '11.5px',
        }}
      >
        {linha}
      </div>
    )
  }
  if (linha.startsWith('index ') || linha.startsWith('--- ') || linha.startsWith('+++ ')) {
    return (
      <div
        style={{
          background: '#2D2D2D',
          color: '#A8A8C0',
          padding: '2px 16px',
          fontSize: '11px',
        }}
      >
        {linha}
      </div>
    )
  }
  if (linha.startsWith('@@')) {
    return (
      <div
        style={{
          background: '#FFF4C2',
          color: '#A07700',
          padding: '3px 16px',
          fontWeight: 700,
          fontSize: '11.5px',
        }}
      >
        {linha}
      </div>
    )
  }
  if (linha.startsWith('+') && !linha.startsWith('+++')) {
    bg = 'rgba(45, 157, 120, 0.10)'
    color = '#1B7F5F'
    prefix = '+ '
    return (
      <div style={{ background: bg, color, padding: '0 16px', display: 'flex' }}>
        <span style={{ width: '20px', flexShrink: 0, fontWeight: 700 }}>+</span>
        <span>{linha.slice(1)}</span>
      </div>
    )
  }
  if (linha.startsWith('-') && !linha.startsWith('---')) {
    bg = 'rgba(218, 49, 39, 0.08)'
    color = '#8C1F1F'
    prefix = '- '
    return (
      <div style={{ background: bg, color, padding: '0 16px', display: 'flex' }}>
        <span style={{ width: '20px', flexShrink: 0, fontWeight: 700 }}>−</span>
        <span>{linha.slice(1)}</span>
      </div>
    )
  }

  return (
    <div style={{ color, padding: '0 16px', display: 'flex' }}>
      <span style={{ width: '20px', flexShrink: 0 }} />
      <span>{linha}</span>
    </div>
  )
}

function SourceBadge({
  source,
  agente,
  taskId,
}: {
  source: Source
  agente?: string
  taskId?: string
}) {
  const styles: Record<Source, { bg: string; color: string; border: string; label: string; titulo: string }> = {
    worktree: {
      bg: '#FFE8D2',
      color: '#C75300',
      border: '#EC7000',
      label: '⎇ worktree do agente',
      titulo: 'Diff lido do worktree do agente em execução',
    },
    path: {
      bg: 'rgba(0, 60, 143, 0.10)',
      color: '#003C8F',
      border: '#003C8F',
      label: '◧ caminho explícito',
      titulo: 'Caminho passado via parametro ?path=',
    },
    default: {
      bg: '#F4ECE3',
      color: '#6E665A',
      border: '#D9CFC1',
      label: '◌ repo padrão',
      titulo: 'Sem worktree associado, mostrando o repositório base',
    },
  }
  const s = styles[source] ?? styles.default

  return (
    <div
      title={s.titulo}
      style={{
        marginTop: '10px',
        padding: '6px 8px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        lineHeight: 1.4,
      }}
    >
      <div>{s.label}</div>
      {(agente || taskId) && (
        <div
          className="mono"
          style={{
            marginTop: '3px',
            fontSize: '9.5px',
            opacity: 0.75,
            wordBreak: 'break-all',
          }}
        >
          {[agente, taskId].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  )
}
