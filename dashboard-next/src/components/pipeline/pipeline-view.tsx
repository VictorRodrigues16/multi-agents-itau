'use client'

import type { TaskInfo, Team, PipelineStage } from '@/types/agents'
import { PIPELINE_STAGES } from '@/data/agents-config'

interface PipelineViewProps {
  currentTask: TaskInfo | null
  teams: Team[]
}

const STAGE_TEAM: Record<PipelineStage, Team['id'] | null> = {
  analise: 'orquestracao',
  desenvolvimento: 'desenvolvimento',
  review: 'desenvolvimento',
  testes: 'testes',
  documentacao: 'documentacao',
}

export function PipelineView({ currentTask, teams }: PipelineViewProps) {
  return (
    <div style={{ padding: '28px', height: '100%', overflow: 'auto', background: '#FBF6EE' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#1A1A1A',
              letterSpacing: '-0.01em',
            }}
          >
            Pipeline de execução
          </h2>
          <p style={{ fontSize: '13px', color: '#6E665A', marginTop: '6px' }}>
            {currentTask
              ? `Tarefa em andamento: ${currentTask.id} — ${currentTask.title}`
              : 'Nenhuma tarefa em andamento'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {PIPELINE_STAGES.map((stage) => {
            const isActive = currentTask?.stage === stage.id
            const isDone = currentTask?.completedStages.includes(stage.id) ?? false
            const isFuture = !isActive && !isDone
            const teamId = STAGE_TEAM[stage.id]
            const time = teamId ? teams.find((t) => t.id === teamId) : null
            const ativos =
              time?.agents.filter(
                (a) =>
                  a.status === 'working' ||
                  a.status === 'reviewing' ||
                  a.status === 'spawning',
              ) ?? []

            const accentColor = isActive ? '#EC7000' : isDone ? '#2D9D78' : '#D9CFC1'
            const bgColor = isActive ? '#FFFFFF' : isDone ? '#FFFFFF' : '#FFFFFF'

            return (
              <div
                key={stage.id}
                style={{
                  background: bgColor,
                  border: `2px solid ${accentColor}`,
                  borderRadius: '14px',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive
                    ? '0 8px 24px rgba(236, 112, 0, 0.18)'
                    : '0 2px 6px rgba(26, 26, 26, 0.04)',
                  opacity: isFuture ? 0.7 : 1,
                }}
              >
                {/* Numero da fase */}
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: isActive
                      ? '#EC7000'
                      : isDone
                        ? '#2D9D78'
                        : '#F4ECE3',
                    color: isActive || isDone ? '#FFFFFF' : '#6E665A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    flexShrink: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: isActive
                      ? '0 4px 14px rgba(236, 112, 0, 0.40)'
                      : isDone
                        ? '0 4px 14px rgba(45, 157, 120, 0.30)'
                        : 'none',
                  }}
                >
                  {isDone ? '✓' : stage.order}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 700,
                        color: '#1A1A1A',
                      }}
                    >
                      {stage.label}
                    </h3>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          background: '#EC7000',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          animation: 'pulse-dot 1.5s ease-in-out infinite',
                        }}
                      >
                        Em andamento
                      </span>
                    )}
                    {isDone && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#1B7F5F',
                          background: 'rgba(45, 157, 120, 0.14)',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          border: '1px solid #2D9D78',
                        }}
                      >
                        Concluído
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#6E665A' }}>
                    {descricaoFase(stage.id)}
                  </p>
                </div>

                {/* Agentes ativos da fase */}
                {ativos.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {ativos.map((a) => (
                      <div
                        key={a.id}
                        title={`${a.id} — ${a.currentSubtask ?? a.role}`}
                        style={{
                          padding: '5px 10px',
                          background: '#FFE8D2',
                          border: '1px solid #EC7000',
                          borderRadius: '7px',
                          fontSize: '11px',
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#C75300',
                          fontWeight: 700,
                        }}
                      >
                        {a.id.replace('dev-especialista-', 'dev-').replace('teste-', 't-')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function descricaoFase(stage: PipelineStage): string {
  const map: Record<PipelineStage, string> = {
    analise: 'Orquestrador classifica a tarefa, decide número de devs e apresenta plano',
    desenvolvimento: 'Tech Lead distribui subtarefas; 1 a 5 devs implementam em paralelo',
    review: '2 revisores sorteados aleatoriamente revisam cada dev',
    testes: 'Quality Gate + cobertura + segurança + performance em paralelo',
    documentacao: 'Doc Especialista gera o relatório PDF Itaú detalhado',
  }
  return map[stage]
}
