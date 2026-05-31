'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Projeto } from '@/types/agents'
import { IconRocket, IconCheck } from '@/components/icons/icons'

interface NovaTarefaModalProps {
  open: boolean
  onClose: () => void
  onCriada?: (resultado: ResultadoCriacao) => void
}

interface ResultadoCriacao {
  id: string
  path: string
  comando: string
  cwd: string
  execucao?: {
    iniciado: boolean
    pid?: number
    mensagem: string
    comando_manual?: string
  }
}

const TIPOS = ['feature', 'bug-fix', 'refactor', 'docs', 'hotfix', 'spike']

export function NovaTarefaModal({ open, onClose, onCriada }: NovaTarefaModalProps) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('feature')
  const [projetosSelecionados, setProjetosSelecionados] = useState<string[]>([])
  const [descricao, setDescricao] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [criterios, setCriterios] = useState<string[]>([''])
  const [notas, setNotas] = useState('')
  const [executarAgora, setExecutarAgora] = useState(true)

  const [projetosDisponiveis, setProjetosDisponiveis] = useState<Projeto[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<ResultadoCriacao | null>(null)

  const fetchProjetos = useCallback(async () => {
    try {
      const res = await fetch('/api/projetos', { cache: 'no-store' })
      const d = await res.json()
      setProjetosDisponiveis((d.projetos || []).filter((p: Projeto) => p.ativo))
    } catch {
      /* ignora */
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchProjetos()
      setErro(null)
      setSucesso(null)
    }
  }, [open, fetchProjetos])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !enviando) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, enviando, onClose])

  function resetar() {
    setTitulo('')
    setTipo('feature')
    setProjetosSelecionados([])
    setDescricao('')
    setObjetivo('')
    setCriterios([''])
    setNotas('')
    setExecutarAgora(true)
    setSucesso(null)
    setErro(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo,
          projetos: projetosSelecionados,
          descricao,
          objetivo,
          criterios: criterios.filter((c) => c.trim().length > 0),
          notas,
          executarAgora,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro || 'Erro ao criar tarefa')
      } else {
        setSucesso(data)
        onCriada?.(data)
      }
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  function fecharResetando() {
    resetar()
    onClose()
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 26, 26, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) fecharResetando()
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(26, 26, 26, 0.30)',
        }}
      >
        <header
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(90deg, #EC7000 0%, #FF8410 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.01em' }}>Nova tarefa</h2>
            <p style={{ fontSize: '12px', opacity: 0.92, marginTop: '2px' }}>
              Descreva a jornada do cliente. O orquestrador analisa, planeja e dispara o squad.
            </p>
          </div>
          <button
            onClick={fecharResetando}
            disabled={enviando}
            style={{
              background: 'rgba(255, 255, 255, 0.20)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: enviando ? 'not-allowed' : 'pointer',
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        {sucesso ? (
          <SucessoView resultado={sucesso} onNovaTarefa={resetar} onFechar={fecharResetando} />
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}
          >
            <Campo label="Título da tarefa *" hint="Frase curta. Ex: Transferência PIX agendada">
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Implementar..."
                style={inputStyle}
                required
              />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '14px' }}>
              <Campo label="Tipo">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Projetos-alvo" hint="Selecione um ou mais projetos registrados">
                <SeletorProjetos
                  projetos={projetosDisponiveis}
                  selecionados={projetosSelecionados}
                  onChange={setProjetosSelecionados}
                />
              </Campo>
            </div>

            <Campo
              label="Contexto / Jornada do cliente *"
              hint="Conte a história em linguagem natural. O orquestrador entende narrativa."
            >
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Maria é cliente Itaú e quer..."
                rows={5}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                required
              />
            </Campo>

            <Campo label="Objetivo (resultado esperado)">
              <textarea
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ao final, o cliente deve conseguir..."
                rows={2}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </Campo>

            <Campo label="Critérios de aceite">
              <ListaDinamica items={criterios} setItems={setCriterios} placeholder="Critério..." />
            </Campo>

            <Campo label="Notas, restrições ou dependências">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Compliance, deadline, integrações, links de design..."
                rows={2}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </Campo>

            <div
              style={{
                background: '#FBF6EE',
                border: '1px solid #EDE7DD',
                borderRadius: '8px',
                padding: '12px 14px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <input
                type="checkbox"
                id="executar-agora"
                checked={executarAgora}
                onChange={(e) => setExecutarAgora(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#EC7000', cursor: 'pointer' }}
              />
              <label htmlFor="executar-agora" style={{ fontSize: '12px', color: '#1A1A1A', cursor: 'pointer', flex: 1 }}>
                <strong>Executar pipeline automaticamente</strong>
                <span style={{ color: '#6E665A' }}> — dispara o orquestrador via Claude CLI assim que a tarefa for criada</span>
              </label>
            </div>

            {erro && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  background: '#FBE3E1',
                  border: '1px solid #DA3127',
                  color: '#8C1F1F',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {erro}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid #EDE7DD',
              }}
            >
              <button
                type="button"
                onClick={fecharResetando}
                disabled={enviando}
                style={btnSecundario}
              >
                Cancelar
              </button>
              <button type="submit" disabled={enviando || !titulo.trim()} style={btnPrimario}>
                {enviando ? 'Criando...' : 'Criar tarefa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SucessoView({
  resultado,
  onNovaTarefa,
  onFechar,
}: {
  resultado: ResultadoCriacao
  onNovaTarefa: () => void
  onFechar: () => void
}) {
  const iniciado = resultado.execucao?.iniciado

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto)
  }

  return (
    <div style={{ padding: '24px 26px', textAlign: 'center' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: iniciado ? 'rgba(45, 157, 120, 0.16)' : 'rgba(248, 195, 0, 0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '8px auto 18px',
          color: iniciado ? '#1B7F5F' : '#A07700',
          fontSize: '32px',
        }}
      >
        {iniciado ? (
          <IconRocket size={32} color="#1B7F5F" strokeWidth={1.8} />
        ) : (
          <IconCheck size={32} color="#A07700" strokeWidth={2} />
        )}
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', marginBottom: '6px' }}>
        Tarefa{' '}
        <span className="mono" style={{ color: '#EC7000' }}>
          {resultado.id}
        </span>{' '}
        criada
      </h3>

      {iniciado && (
        <p style={{ fontSize: '13px', color: '#1B7F5F', marginBottom: '18px', fontWeight: 600 }}>
          {resultado.execucao!.mensagem}
        </p>
      )}

      {!iniciado && resultado.execucao && (
        <div style={{ marginBottom: '18px' }}>
          <p style={{ fontSize: '12px', color: '#A07700', marginBottom: '10px' }}>
            {resultado.execucao.mensagem}
          </p>
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '8px',
              padding: '12px 14px',
              textAlign: 'left',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{resultado.execucao.comando_manual}</pre>
            <button
              onClick={() => copiar(resultado.execucao!.comando_manual!)}
              style={{
                background: '#EC7000',
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {!resultado.execucao && (
        <div style={{ marginBottom: '18px' }}>
          <p style={{ fontSize: '12px', color: '#6E665A', marginBottom: '8px' }}>
            Para executar, rode no Claude Code:
          </p>
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '8px',
              padding: '12px 14px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              color: '#EC7000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{resultado.comando}</span>
            <button
              onClick={() => copiar(resultado.comando)}
              style={{
                background: '#EC7000',
                color: '#FFFFFF',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          background: '#FBF6EE',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#6E665A',
          marginBottom: '18px',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong style={{ color: '#3D3830' }}>Arquivo:</strong>{' '}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {resultado.path.replace(process.env.HOME || '', '~')}
          </code>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={onNovaTarefa} style={btnSecundario}>
          Criar outra
        </button>
        <button onClick={onFechar} style={btnPrimario}>
          Fechar
        </button>
      </div>
    </div>
  )
}

function SeletorProjetos({
  projetos,
  selecionados,
  onChange,
}: {
  projetos: Projeto[]
  selecionados: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    if (selecionados.includes(id)) {
      onChange(selecionados.filter((s) => s !== id))
    } else {
      onChange([...selecionados, id])
    }
  }

  if (projetos.length === 0) {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: '#FBF6EE',
          border: '1px dashed #D9CFC1',
          borderRadius: '7px',
          fontSize: '11px',
          color: '#6E665A',
          fontStyle: 'italic',
        }}
      >
        Nenhum projeto ativo. Adicione na aba <strong>Projetos</strong>.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {projetos.map((p) => {
        const ativo = selecionados.includes(p.id)
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            style={{
              border: `1px solid ${ativo ? '#EC7000' : '#D9CFC1'}`,
              background: ativo ? '#FFE8D2' : '#FFFFFF',
              color: ativo ? '#C75300' : '#3D3830',
              padding: '5px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: ativo ? 700 : 500,
              transition: 'all 0.15s ease',
            }}
            title={p.caminho}
          >
            {ativo && <span style={{ marginRight: '4px' }}>✓</span>}
            {p.nome}
          </button>
        )
      })}
    </div>
  )
}

function ListaDinamica({
  items,
  setItems,
  placeholder,
}: {
  items: string[]
  setItems: (v: string[]) => void
  placeholder: string
}) {
  function setItem(idx: number, v: string) {
    const novo = [...items]
    novo[idx] = v
    setItems(novo)
  }
  function remover(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }
  function adicionar() {
    setItems([...items, ''])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '6px' }}>
          <input
            value={item}
            onChange={(e) => setItem(idx, e.target.value)}
            placeholder={placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => remover(idx)}
              style={{
                background: '#FBE3E1',
                border: '1px solid #DA3127',
                color: '#8C1F1F',
                width: '32px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
              }}
              aria-label="Remover"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={adicionar}
        style={{
          background: '#FFFFFF',
          border: '1px dashed #D9CFC1',
          color: '#6E665A',
          padding: '6px',
          borderRadius: '7px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          width: 'fit-content',
        }}
      >
        + Adicionar critério
      </button>
    </div>
  )
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          color: '#3D3830',
          fontWeight: 700,
          marginBottom: '5px',
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
  padding: '9px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 600,
}

const btnPrimario: React.CSSProperties = {
  background: '#EC7000',
  color: '#FFFFFF',
  border: 'none',
  padding: '9px 20px',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 700,
  boxShadow: '0 4px 12px rgba(236, 112, 0, 0.30)',
}
