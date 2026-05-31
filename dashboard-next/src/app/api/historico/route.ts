import { NextResponse } from 'next/server'
import fs from 'fs'
import os from 'os'
import path from 'path'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const TAREFAS_DIR = path.join(AGENT_ROOT, 'tarefas')
const RELATORIOS_DIR = path.join(AGENT_ROOT, 'relatorios')
const WORKFLOW_TASKS_DIR = path.join(AGENT_ROOT, '.workflow', 'tasks')
const EVENTS_FILE = process.env.AGENT_ITAU_EVENTS || path.join(os.homedir(), '.claude', 'agent-events-itau.jsonl')

interface TarefaHistorico {
  id: string
  titulo: string
  tipo: string
  projetos: string[]
  status: 'pendente' | 'em-execucao' | 'concluida' | 'falha'
  criado_em?: string
  inicio?: number
  fim?: number
  duracao_ms?: number
  veredicto?: 'PASS' | 'WARN' | 'FAIL'
  nota?: number
  agentes_envolvidos: string[]
  pdf?: { path: string; size_kb: number; existe: boolean }
}

function lerFrontmatter(filePath: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const m = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!m) return {}
    const linhas = m[1].split('\n')
    const fm: Record<string, string> = {}
    for (const l of linhas) {
      const idx = l.indexOf(':')
      if (idx > 0) {
        const k = l.slice(0, idx).trim()
        const v = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        fm[k] = v
      }
    }
    return fm
  } catch {
    return {}
  }
}

function lerEventosDaTask(taskId: string, todosEventos: Array<Record<string, unknown>>): {
  inicio?: number
  fim?: number
  agentes: string[]
} {
  const eventosTask = todosEventos.filter((e) => e.task_id === taskId)
  if (eventosTask.length === 0) return { agentes: [] }

  const ts = eventosTask.map((e) => Number(e.ts || 0)).filter(Boolean)
  const agentes = Array.from(new Set(eventosTask.map((e) => String(e.agent_id || '')).filter(Boolean)))

  return {
    inicio: ts.length > 0 ? Math.min(...ts) : undefined,
    fim: ts.length > 0 ? Math.max(...ts) : undefined,
    agentes,
  }
}

function lerSummaryTestes(taskId: string): { veredicto?: TarefaHistorico['veredicto']; nota?: number } {
  const summaryPath = path.join(WORKFLOW_TASKS_DIR, taskId, 'testes', 'summary.md')
  if (!fs.existsSync(summaryPath)) return {}
  try {
    const raw = fs.readFileSync(summaryPath, 'utf-8')
    let veredicto: TarefaHistorico['veredicto']
    if (raw.includes('PASS')) veredicto = 'PASS'
    if (raw.includes('WARN')) veredicto = 'WARN'
    if (raw.includes('FAIL')) veredicto = 'FAIL'

    const matchNota = raw.match(/(\d{1,3})\s*\/\s*100/)
    const nota = matchNota ? parseInt(matchNota[1], 10) : undefined

    return { veredicto, nota }
  } catch {
    return {}
  }
}

function tentarLerDadosExemplo(taskId: string): { veredicto?: TarefaHistorico['veredicto']; nota?: number } {
  // Lê o relatorio-dados.json gerado pelo runner (ou o -exemplo.json de demo)
  const candidatos = [
    path.join(WORKFLOW_TASKS_DIR, taskId, 'relatorio-dados.json'),
    path.join(WORKFLOW_TASKS_DIR, taskId, 'relatorio-dados-exemplo.json'),
  ]
  for (const arquivo of candidatos) {
    if (!fs.existsSync(arquivo)) continue
    try {
      const raw = fs.readFileSync(arquivo, 'utf-8')
      const d = JSON.parse(raw)
      return {
        veredicto: d?.testes?.veredicto,
        nota: d?.testes?.nota_global,
      }
    } catch {
      continue
    }
  }
  return {}
}

export async function GET() {
  // Carrega todos os eventos uma vez
  let todosEventos: Array<Record<string, unknown>> = []
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf-8')
      todosEventos = raw
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l) as Record<string, unknown>
          } catch {
            return null
          }
        })
        .filter((e): e is Record<string, unknown> => e !== null)
    } catch {
      /* ignora */
    }
  }

  // Encontra todas as tasks de várias fontes
  const taskIds = new Set<string>()

  if (fs.existsSync(TAREFAS_DIR)) {
    for (const f of fs.readdirSync(TAREFAS_DIR)) {
      const m = f.match(/^(TASK-\d+)\.md$/)
      if (m) taskIds.add(m[1])
    }
  }

  if (fs.existsSync(WORKFLOW_TASKS_DIR)) {
    for (const f of fs.readdirSync(WORKFLOW_TASKS_DIR)) {
      if (/^TASK-\d+$/.test(f)) taskIds.add(f)
    }
  }

  for (const e of todosEventos) {
    if (typeof e.task_id === 'string' && /^TASK-\d+$/.test(e.task_id)) {
      taskIds.add(e.task_id)
    }
  }

  const tarefas: TarefaHistorico[] = []

  for (const id of taskIds) {
    const tarefaMd = path.join(TAREFAS_DIR, `${id}.md`)
    const workflowDir = path.join(WORKFLOW_TASKS_DIR, id)
    const pdfPath = path.join(RELATORIOS_DIR, `${id}.pdf`)

    const fm = lerFrontmatter(tarefaMd)
    const { inicio, fim, agentes } = lerEventosDaTask(id, todosEventos)
    const testesSummary = lerSummaryTestes(id)
    const dadosExemplo = !testesSummary.veredicto ? tentarLerDadosExemplo(id) : {}
    const veredicto = testesSummary.veredicto ?? dadosExemplo.veredicto
    const nota = testesSummary.nota ?? dadosExemplo.nota

    const pdfExiste = fs.existsSync(pdfPath)
    let pdfSize = 0
    if (pdfExiste) {
      try {
        pdfSize = Math.round(fs.statSync(pdfPath).size / 1024)
      } catch {
        /* ignora */
      }
    }

    let status: TarefaHistorico['status'] = 'pendente'
    if (pdfExiste) status = 'concluida'
    else if (fs.existsSync(workflowDir) || inicio) status = 'em-execucao'
    if (veredicto === 'FAIL') status = 'falha'

    const projetos = fm.projetos
      ? fm.projetos
          .replace(/[[\]]/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    tarefas.push({
      id,
      titulo: fm.titulo || id,
      tipo: fm.tipo || '—',
      projetos,
      status,
      criado_em: fm.criado_em,
      inicio,
      fim: status === 'concluida' ? fim : undefined,
      duracao_ms: inicio && fim && status === 'concluida' ? fim - inicio : undefined,
      veredicto,
      nota,
      agentes_envolvidos: agentes,
      pdf: pdfExiste ? { path: pdfPath, size_kb: pdfSize, existe: true } : undefined,
    })
  }

  // Ordena: mais recente primeiro (por inicio, depois por id descendente)
  tarefas.sort((a, b) => {
    if (a.inicio && b.inicio) return b.inicio - a.inicio
    if (a.inicio) return -1
    if (b.inicio) return 1
    return b.id.localeCompare(a.id)
  })

  return NextResponse.json({ tarefas, total: tarefas.length })
}
