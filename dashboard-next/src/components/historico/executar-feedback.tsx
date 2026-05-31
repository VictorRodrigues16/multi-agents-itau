'use client'

import { useEffect } from 'react'
import { IconClose, IconRocket, IconWarning } from '@/components/icons/icons'

export interface ResultadoExecucao {
  iniciado: boolean
  pid?: number
  taskId?: string
  metodo?: string
  modo?: 'real' | 'simulacao'
  projeto?: string
  caminho?: string
  mensagem?: string
  erro?: string
  comando_manual?: string
}

interface Props {
  taskId: string
  resultado: ResultadoExecucao | null
  onClose: () => void
}

export function ExecutarFeedback({ taskId, resultado, onClose }: Props) {
  useEffect(() => {
    if (!resultado) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resultado, onClose])

  if (!resultado) return null

  function copiar() {
    if (resultado?.comando_manual) {
      navigator.clipboard.writeText(resultado.comando_manual)
    }
  }

  const ok = resultado.iniciado

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 26, 26, 0.50)',
        backdropFilter: 'blur(4px)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px 28px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '11px',
              background: ok ? 'rgba(45, 157, 120, 0.16)' : '#FBE3E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {ok ? (
              <IconRocket size={22} color="#1B7F5F" strokeWidth={2} />
            ) : (
              <IconWarning size={22} color="#8C1F1F" strokeWidth={2} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', marginBottom: '2px' }}>
              {ok ? 'Pipeline iniciado' : 'Não foi possível iniciar automaticamente'}
            </h3>
            <p className="mono" style={{ fontSize: '12px', color: '#EC7000', fontWeight: 600 }}>
              {taskId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9CFC1',
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar"
          >
            <IconClose size={14} color="#6E665A" strokeWidth={2} />
          </button>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: ok ? '#1B7F5F' : '#8C1F1F',
            background: ok ? 'rgba(45, 157, 120, 0.10)' : '#FBE3E1',
            border: `1px solid ${ok ? '#2D9D78' : '#DA3127'}`,
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          {ok ? resultado.mensagem : resultado.erro}
        </p>

        {resultado.comando_manual && (
          <div>
            <p
              style={{
                fontSize: '11px',
                color: '#6E665A',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '6px',
              }}
            >
              {ok ? 'Ou execute manualmente:' : 'Execute manualmente no seu terminal:'}
            </p>
            <div
              style={{
                background: '#1A1A1A',
                color: '#EC7000',
                padding: '12px 14px',
                borderRadius: '8px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span style={{ wordBreak: 'break-all' }}>{resultado.comando_manual}</span>
              <button
                onClick={copiar}
                style={{
                  background: '#EC7000',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        {ok && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: '#FFF4C2',
              border: '1px solid #F8C300',
              borderRadius: '8px',
              fontSize: '11.5px',
              color: '#A07700',
              lineHeight: 1.5,
            }}
          >
            {resultado.modo === 'real' ? (
              <>
                <strong>Execução real iniciada.</strong> Uma janela do Terminal abriu no projeto{' '}
                <strong>{resultado.projeto}</strong> com o Claude implementando o código de verdade.
                <br />
                <br />
                Acompanhe no terminal. Conforme o Claude trabalha, os eventos aparecem no Feed e o{' '}
                <strong>diff real</strong> aparece na aba Diff de cada agente. O PDF é gerado no final.
              </>
            ) : (
              <>
                <strong>Modo simulação:</strong> o pipeline anima no dashboard e gera o PDF, mas{' '}
                <strong>não edita o código real</strong>. Use só pra mostrar a interface.
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#EC7000',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
