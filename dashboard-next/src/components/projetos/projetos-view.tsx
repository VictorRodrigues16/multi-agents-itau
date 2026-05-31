'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Projeto } from '@/types/agents'
import { IconFolder, IconClose, IconPlus } from '@/components/icons/icons'

export function ProjetosView() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const fetchProjetos = useCallback(async () => {
    try {
      const res = await fetch('/api/projetos', { cache: 'no-store' })
      const data = await res.json()
      setProjetos(data.projetos || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjetos()
    const id = setInterval(fetchProjetos, 10_000)
    return () => clearInterval(id)
  }, [fetchProjetos])

  async function adicionar(form: { caminho: string; nome?: string; stack?: string; descricao?: string }) {
    setErro(null)
    try {
      const res = await fetch('/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caminho: form.caminho,
          nome: form.nome || undefined,
          descricao: form.descricao || undefined,
          stack: form.stack
            ? form.stack.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro || 'Erro ao adicionar projeto')
        return false
      }
      await fetchProjetos()
      setShowForm(false)
      return true
    } catch (e) {
      setErro((e as Error).message)
      return false
    }
  }

  async function remover(id: string) {
    if (!confirm(`Remover projeto ${id}?`)) return
    await fetch(`/api/projetos?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    fetchProjetos()
  }

  async function toggleAtivo(p: Projeto) {
    await fetch('/api/projetos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, ativo: !p.ativo }),
    })
    fetchProjetos()
  }

  return (
    <div style={{ padding: '28px', height: '100%', overflow: 'auto', background: '#FBF6EE' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#1A1A1A',
                letterSpacing: '-0.01em',
              }}
            >
              Projetos registrados
            </h2>
            <p style={{ fontSize: '13px', color: '#6E665A', marginTop: '6px', maxWidth: '600px' }}>
              Pastas do PC onde os agentes podem trabalhar. Quando você executa <code style={{ background: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', color: '#C75300', fontFamily: 'monospace' }}>/tarefa</code>, o
              tech-lead escolhe um destes projetos para apontar seus worktrees.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            style={{
              background: '#EC7000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(236, 112, 0, 0.30)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <IconPlus size={15} color="#FFFFFF" strokeWidth={2.5} />
            Adicionar projeto
          </button>
        </header>

        {showForm && (
          <FormularioProjeto onSubmit={adicionar} onCancel={() => setShowForm(false)} erro={erro} />
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6E665A' }}>Carregando…</div>
        ) : projetos.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '2px dashed #D9CFC1',
            }}
          >
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
              <IconFolder size={44} color="#B0A89A" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', marginBottom: '6px' }}>
              Nenhum projeto registrado ainda
            </div>
            <div style={{ fontSize: '12px', color: '#6E665A', marginBottom: '20px' }}>
              Adicione a pasta de um projeto pra os agentes começarem a trabalhar nele.
            </div>
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: '#EC7000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Adicionar primeiro projeto
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '14px',
            }}
          >
            {projetos.map((p) => (
              <CardProjeto key={p.id} projeto={p} onToggleAtivo={() => toggleAtivo(p)} onRemover={() => remover(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CardProjeto({
  projeto,
  onToggleAtivo,
  onRemover,
}: {
  projeto: Projeto
  onToggleAtivo: () => void
  onRemover: () => void
}) {
  const caminhoHome = projeto.caminho.replace(process.env.HOME || '/Users', '~')
  const accent = projeto.ativo ? '#EC7000' : '#B0A89A'

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${projeto.ativo ? '#EDE7DD' : '#EDE7DD'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        opacity: projeto.ativo ? 1 : 0.7,
        boxShadow: '0 2px 6px rgba(26, 26, 26, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          background: projeto.ativo
            ? 'linear-gradient(90deg, rgba(236, 112, 0, 0.08) 0%, transparent 80%)'
            : '#F4ECE3',
          borderBottom: '1px solid #EDE7DD',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${accent}1A`,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconFolder size={22} color={accent} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1A1A1A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projeto.nome}
            </div>
            <div
              className="mono"
              style={{
                fontSize: '10px',
                color: accent,
                fontWeight: 700,
                marginTop: '2px',
              }}
            >
              {projeto.id}
            </div>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: '999px',
              background: projeto.ativo ? 'rgba(45, 157, 120, 0.14)' : '#F4ECE3',
              color: projeto.ativo ? '#1B7F5F' : '#6E665A',
              border: `1px solid ${projeto.ativo ? '#2D9D78' : '#D9CFC1'}`,
            }}
          >
            {projeto.ativo ? 'ATIVO' : 'INATIVO'}
          </span>
        </div>

        {projeto.descricao && (
          <p style={{ fontSize: '12px', color: '#3D3830', marginTop: '8px', marginLeft: '50px' }}>
            {projeto.descricao}
          </p>
        )}
      </div>

      <div style={{ padding: '12px 18px' }}>
        <div
          className="mono"
          style={{
            fontSize: '11px',
            color: '#3D3830',
            background: '#FBF6EE',
            padding: '6px 10px',
            borderRadius: '6px',
            wordBreak: 'break-all',
            marginBottom: '10px',
          }}
          title={projeto.caminho}
        >
          {caminhoHome}
        </div>

        {projeto.stack && projeto.stack.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {projeto.stack.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#FBF6EE',
                  color: '#3D3830',
                  border: '1px solid #EDE7DD',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {projeto.git && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              color: '#6E665A',
              marginBottom: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⎇{' '}
              <span className="mono" style={{ color: '#003C8F', fontWeight: 600 }}>
                {projeto.git.branch ?? '—'}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ◧{' '}
              <span
                className="mono"
                style={{
                  color: projeto.git.arquivos_modificados > 0 ? '#C75300' : '#1B7F5F',
                  fontWeight: 600,
                }}
              >
                {projeto.git.arquivos_modificados}
              </span>{' '}
              mudança{projeto.git.arquivos_modificados !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {projeto.git?.last_commit && (
          <div
            style={{
              fontSize: '11px',
              color: '#6E665A',
              fontStyle: 'italic',
              marginBottom: '10px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={projeto.git.last_commit}
          >
            último: {projeto.git.last_commit}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid #F4ECE3' }}>
          <button
            onClick={onToggleAtivo}
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #D9CFC1',
              color: '#3D3830',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {projeto.ativo ? 'Desativar' : 'Ativar'}
          </button>
          <button
            onClick={onRemover}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FBE3E1',
              color: '#8C1F1F',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

function FormularioProjeto({
  onSubmit,
  onCancel,
  erro,
}: {
  onSubmit: (form: { caminho: string; nome?: string; stack?: string; descricao?: string }) => Promise<boolean>
  onCancel: () => void
  erro: string | null
}) {
  const [caminho, setCaminho] = useState('')
  const [nome, setNome] = useState('')
  const [stack, setStack] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await onSubmit({ caminho, nome, stack, descricao })
    } finally {
      setEnviando(false)
    }
  }

  const [buscando, setBuscando] = useState(false)
  const [sugestoes, setSugestoes] = useState<Array<{ caminho: string; caminho_home: string }>>([])

  function handleSelectPasta() {
    // Browser não dá acesso ao caminho absoluto. Detectamos o nome da pasta
    // selecionada e o backend procura ela em locais comuns (~/dsg, ~/projetos, etc.)
    type DirectoryFile = File & { webkitRelativePath?: string }
    interface DirectoryInput extends HTMLInputElement {
      webkitdirectory: boolean
    }
    const input = document.createElement('input') as DirectoryInput
    input.type = 'file'
    input.webkitdirectory = true
    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) return
      const primeiroPath = (files[0] as DirectoryFile).webkitRelativePath
      if (!primeiroPath) return
      const nomeRaiz = primeiroPath.split('/')[0]

      if (!nome) setNome(nomeRaiz)

      setBuscando(true)
      setSugestoes([])
      try {
        const res = await fetch(`/api/projetos/buscar?nome=${encodeURIComponent(nomeRaiz)}`)
        const data = await res.json()
        const matches: Array<{ caminho: string; caminho_home: string }> = data.matches || []

        if (matches.length === 1) {
          setCaminho(matches[0].caminho_home)
        } else if (matches.length > 1) {
          // Pega o primeiro (mais raso) e mostra os outros como opções
          setCaminho(matches[0].caminho_home)
          setSugestoes(matches.slice(1, 6))
        } else {
          // Não achou — usa ~/{nome} como fallback
          setCaminho(`~/${nomeRaiz}`)
        }
      } catch {
        setCaminho(`~/${nomeRaiz}`)
      } finally {
        setBuscando(false)
      }
    }
    input.click()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#FFFFFF',
        border: '2px solid #EC7000',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '20px',
        boxShadow: '0 6px 20px rgba(236, 112, 0, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A' }}>Adicionar projeto</h3>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6E665A',
            cursor: 'pointer',
            fontSize: '18px',
          }}
          aria-label="Fechar"
        >
          <IconClose size={16} color="#6E665A" strokeWidth={2} />
        </button>
      </div>

      <Campo
        label="Caminho absoluto da pasta *"
        hint="Cole o caminho ou use Procurar… (busca a pasta em ~/, ~/dsg, ~/projetos, ~/dev e outros locais comuns)"
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={caminho}
            onChange={(e) => setCaminho(e.target.value)}
            required
            placeholder="~/projetos/meu-app"
            className="mono"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={handleSelectPasta}
            disabled={buscando}
            style={{ ...btnSecundario, opacity: buscando ? 0.6 : 1 }}
          >
            {buscando ? 'Buscando…' : 'Procurar…'}
          </button>
        </div>
        {sugestoes.length > 0 && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 10px',
              background: '#FFE8D2',
              border: '1px solid #EC7000',
              borderRadius: '7px',
              fontSize: '11px',
              color: '#C75300',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>
              {sugestoes.length} outro{sugestoes.length > 1 ? 's' : ''} caminho{sugestoes.length > 1 ? 's' : ''}{' '}
              encontrado{sugestoes.length > 1 ? 's' : ''} com esse nome:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sugestoes.map((s) => (
                <button
                  key={s.caminho}
                  type="button"
                  onClick={() => {
                    setCaminho(s.caminho_home)
                    setSugestoes([])
                  }}
                  className="mono"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D9CFC1',
                    color: '#3D3830',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {s.caminho_home}
                </button>
              ))}
            </div>
          </div>
        )}
      </Campo>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Campo label="Nome do projeto" hint="Default: nome da pasta">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Meu App" style={inputStyle} />
        </Campo>
        <Campo label="Stack (separar por vírgula)" hint="Ex: NestJS, TypeScript, Postgres">
          <input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="NestJS, TypeScript" style={inputStyle} />
        </Campo>
      </div>

      <Campo label="Descrição (opcional)">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder="O que esse projeto faz, contexto de negócio..."
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Campo>

      {erro && (
        <div
          style={{
            background: '#FBE3E1',
            border: '1px solid #DA3127',
            color: '#8C1F1F',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            marginBottom: '12px',
            fontWeight: 500,
          }}
        >
          {erro}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={btnSecundario} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" style={btnPrimario} disabled={enviando || !caminho.trim()}>
          {enviando ? 'Adicionando…' : 'Adicionar projeto'}
        </button>
      </div>
    </form>
  )
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          color: '#3D3830',
          fontWeight: 700,
          marginBottom: '4px',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: '10px', color: '#6E665A', marginTop: '3px', fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FBF6EE',
  border: '1px solid #D9CFC1',
  borderRadius: '7px',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#1A1A1A',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
}

const btnSecundario: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D9CFC1',
  color: '#3D3830',
  padding: '8px 14px',
  borderRadius: '7px',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: 600,
}

const btnPrimario: React.CSSProperties = {
  background: '#EC7000',
  color: '#FFFFFF',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '7px',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: 700,
  boxShadow: '0 2px 6px rgba(236, 112, 0, 0.30)',
}
