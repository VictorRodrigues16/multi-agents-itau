'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

interface AgenteResumo {
  id: string
  name: string
  description: string
  model: string
  tools: string[]
  arquivo: string
  tamanho: number
  modificado_em: string
  tem_backup: boolean
}

interface AgenteCompleto extends AgenteResumo {
  frontmatter: Record<string, string | string[]>
  corpo: string
  conteudo: string
}

export function AgentesView() {
  const [agentes, setAgentes] = useState<AgenteResumo[]>([])
  const [selecionado, setSelecionado] = useState<AgenteCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const fetchLista = useCallback(async () => {
    try {
      const res = await fetch('/api/agentes', { cache: 'no-store' })
      const d = await res.json()
      setAgentes(d.agentes || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLista()
  }, [fetchLista])

  async function abrir(id: string) {
    const res = await fetch(`/api/agentes?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    const d = await res.json()
    setSelecionado(d.agente)
  }

  const filtrados = useMemo(() => {
    if (!busca.trim()) return agentes
    const q = busca.toLowerCase()
    return agentes.filter(
      (a) => a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    )
  }, [agentes, busca])

  const agrupados = useMemo(() => {
    const grupos: Record<string, AgenteResumo[]> = {
      Orquestração: [],
      Desenvolvimento: [],
      Testes: [],
      Documentação: [],
    }
    for (const ag of filtrados) {
      if (ag.id === 'orquestrador') grupos['Orquestração'].push(ag)
      else if (ag.id.startsWith('dev-')) grupos['Desenvolvimento'].push(ag)
      else if (ag.id.startsWith('teste-')) grupos['Testes'].push(ag)
      else if (ag.id === 'doc-especialista') grupos['Documentação'].push(ag)
      else grupos['Orquestração'].push(ag)
    }
    return grupos
  }, [filtrados])

  return (
    <div style={{ padding: '28px', height: '100%', overflow: 'auto', background: '#FBF6EE' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.01em' }}>
            Agentes — personalize os prompts
          </h2>
          <p style={{ fontSize: '13px', color: '#6E665A', marginTop: '6px', maxWidth: '680px' }}>
            Cada agente é um arquivo <code style={codeStyle}>.md</code> em <code style={codeStyle}>.claude/agents/</code>. Edite as instruções, modelo ou ferramentas — o Claude Code carrega a versão atual a cada execução.
          </p>
        </header>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, ID ou descrição..."
          style={{
            background: '#FFFFFF',
            border: '1px solid #D9CFC1',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            width: '100%',
            marginBottom: '18px',
            outline: 'none',
          }}
        />

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6E665A' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(agrupados).map(([grupo, lista]) =>
              lista.length === 0 ? null : (
                <section key={grupo}>
                  <h3
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#6E665A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.10em',
                      marginBottom: '10px',
                    }}
                  >
                    {grupo} ({lista.length})
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {lista.map((ag) => (
                      <CardAgente key={ag.id} agente={ag} onAbrir={() => abrir(ag.id)} />
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>

      {selecionado && (
        <EditorAgente
          agente={selecionado}
          onClose={() => setSelecionado(null)}
          onSalvo={(novo) => {
            setSelecionado(novo)
            fetchLista()
          }}
        />
      )}
    </div>
  )
}

function CardAgente({ agente, onAbrir }: { agente: AgenteResumo; onAbrir: () => void }) {
  const modeloStyles: Record<string, { bg: string; color: string }> = {
    'claude-opus-4-6': { bg: 'rgba(124, 58, 237, 0.12)', color: '#5B21B6' },
    'claude-sonnet-4-6': { bg: 'rgba(0, 60, 143, 0.10)', color: '#003C8F' },
  }
  const mStyle = modeloStyles[agente.model] ?? { bg: '#F4ECE3', color: '#6E665A' }

  return (
    <button
      onClick={onAbrir}
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE7DD',
        borderRadius: '12px',
        padding: '14px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 3px rgba(26, 26, 26, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.borderColor = '#EC7000'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(236, 112, 0, 0.18)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#EDE7DD'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 26, 26, 0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#EC7000', flex: 1 }}>
          {agente.id}
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '4px',
            background: mStyle.bg,
            color: mStyle.color,
          }}
        >
          {agente.model.replace('claude-', '').replace('-4-6', '')}
        </span>
        {agente.tem_backup && (
          <span title="Foi personalizado (tem backup do default)" style={{ fontSize: '10px' }}>
            ✎
          </span>
        )}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '4px' }}>
        {agente.name}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#6E665A',
          lineHeight: 1.45,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {agente.description || '—'}
      </div>
      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #F4ECE3',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          color: '#6E665A',
        }}
      >
        <span>{(agente.tamanho / 1024).toFixed(1)} KB</span>
        <span>·</span>
        <span>{agente.tools.length} ferramentas</span>
        <span style={{ marginLeft: 'auto', color: '#EC7000', fontWeight: 600 }}>editar →</span>
      </div>
    </button>
  )
}

function EditorAgente({
  agente,
  onClose,
  onSalvo,
}: {
  agente: AgenteCompleto
  onClose: () => void
  onSalvo: (novo: AgenteCompleto) => void
}) {
  const [conteudo, setConteudo] = useState(agente.conteudo)
  const [salvando, setSalvando] = useState(false)
  const [restaurando, setRestaurando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [confirmaFechar, setConfirmaFechar] = useState(false)

  const modificado = conteudo !== agente.conteudo

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !salvando && !modificado) onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (modificado && !salvando) salvar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modificado, salvando, conteudo])

  async function salvar() {
    setSalvando(true)
    setMensagem(null)
    try {
      const res = await fetch('/api/agentes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agente.id, conteudo }),
      })
      const d = await res.json()
      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: d.erro || 'Erro ao salvar' })
      } else {
        setMensagem({ tipo: 'ok', texto: 'Prompt salvo. Backup do original preservado.' })
        onSalvo(d.agente)
      }
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message })
    } finally {
      setSalvando(false)
      setTimeout(() => setMensagem(null), 5000)
    }
  }

  async function restaurar() {
    if (!confirm('Restaurar o conteúdo original deste agente? A versão atual será movida pro histórico.')) return
    setRestaurando(true)
    try {
      const res = await fetch(`/api/agentes?action=restaurar&id=${encodeURIComponent(agente.id)}`, {
        method: 'POST',
      })
      const d = await res.json()
      if (res.ok) {
        setConteudo(d.agente.conteudo)
        setMensagem({ tipo: 'ok', texto: 'Original restaurado.' })
        onSalvo(d.agente)
      } else {
        setMensagem({ tipo: 'erro', texto: d.erro || 'Erro ao restaurar' })
      }
    } finally {
      setRestaurando(false)
      setTimeout(() => setMensagem(null), 5000)
    }
  }

  function tentarFechar() {
    if (modificado) {
      setConfirmaFechar(true)
    } else {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 26, 26, 0.50)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) tentarFechar()
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(26, 26, 26, 0.30)',
        }}
      >
        <header
          style={{
            padding: '16px 22px',
            background: 'linear-gradient(90deg, #EC7000 0%, #FF8410 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>{agente.name}</h3>
              <span
                className="mono"
                style={{
                  fontSize: '11px',
                  background: 'rgba(0, 0, 0, 0.20)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                {agente.id}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {agente.model.replace('claude-', '').replace('-4-6', '')}
              </span>
            </div>
            <p style={{ fontSize: '11px', opacity: 0.92, marginTop: '3px' }}>{agente.description}</p>
          </div>
          <button
            onClick={tentarFechar}
            style={{
              background: 'rgba(255, 255, 255, 0.20)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: '10px',
            }}
          >
            ✕
          </button>
        </header>

        <div
          style={{
            padding: '10px 22px',
            background: '#FBF6EE',
            borderBottom: '1px solid #EDE7DD',
            display: 'flex',
            gap: '14px',
            fontSize: '11px',
            color: '#3D3830',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong style={{ color: '#6E665A' }}>Ferramentas:</strong>{' '}
            {agente.tools.length > 0 ? agente.tools.join(', ') : '—'}
          </span>
          <span>
            <strong style={{ color: '#6E665A' }}>Modificado:</strong>{' '}
            {new Date(agente.modificado_em).toLocaleString('pt-BR')}
          </span>
          {agente.tem_backup && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#1B7F5F' }}>●</span> backup do default preservado
            </span>
          )}
        </div>

        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            outline: 'none',
            padding: '16px 22px',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '12.5px',
            lineHeight: 1.7,
            color: '#1A1A1A',
            background: '#FFFFFF',
            resize: 'none',
            minHeight: '420px',
            tabSize: 2,
          }}
        />

        {mensagem && (
          <div
            style={{
              padding: '10px 22px',
              background: mensagem.tipo === 'ok' ? 'rgba(45, 157, 120, 0.14)' : '#FBE3E1',
              color: mensagem.tipo === 'ok' ? '#1B7F5F' : '#8C1F1F',
              fontSize: '12px',
              fontWeight: 600,
              borderTop: `1px solid ${mensagem.tipo === 'ok' ? '#2D9D78' : '#DA3127'}`,
            }}
          >
            {mensagem.texto}
          </div>
        )}

        <footer
          style={{
            padding: '14px 22px',
            background: '#FBF6EE',
            borderTop: '1px solid #EDE7DD',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, fontSize: '11px', color: '#6E665A' }}>
            {modificado ? (
              <span style={{ color: '#C75300', fontWeight: 600 }}>● alterações não salvas</span>
            ) : (
              <span>{conteudo.length.toLocaleString('pt-BR')} caracteres · ⌘S para salvar</span>
            )}
          </div>

          {agente.tem_backup && (
            <button
              onClick={restaurar}
              disabled={restaurando}
              style={{
                background: '#FFFFFF',
                border: '1px solid #D9CFC1',
                color: '#3D3830',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: restaurando ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {restaurando ? 'Restaurando...' : '↺ Restaurar default'}
            </button>
          )}

          <button
            onClick={tentarFechar}
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9CFC1',
              color: '#3D3830',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Fechar
          </button>

          <button
            onClick={salvar}
            disabled={!modificado || salvando}
            style={{
              background: modificado ? '#EC7000' : '#D9CFC1',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: !modificado || salvando ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              boxShadow: modificado ? '0 4px 12px rgba(236, 112, 0, 0.30)' : 'none',
            }}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </footer>
      </div>

      {confirmaFechar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 250,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px 22px',
              maxWidth: '380px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>
              Descartar alterações?
            </h4>
            <p style={{ fontSize: '12px', color: '#6E665A', marginBottom: '16px' }}>
              Você tem alterações não salvas no prompt do {agente.name}.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmaFechar(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D9CFC1',
                  color: '#3D3830',
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Continuar editando
              </button>
              <button
                onClick={() => {
                  setConfirmaFechar(false)
                  onClose()
                }}
                style={{
                  background: '#DA3127',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const codeStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EDE7DD',
  padding: '1px 6px',
  borderRadius: '4px',
  color: '#C75300',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11.5px',
}
