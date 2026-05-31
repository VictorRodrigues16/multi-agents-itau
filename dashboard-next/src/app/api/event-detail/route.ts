import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { parseMd, parseTabelaMd } from '@/lib/md-storage'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const EVENTS_FILE = process.env.AGENT_ITAU_EVENTS || path.join(os.homedir(), '.claude', 'agent-events-itau.jsonl')

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
  source?: 'md' | 'events-fallback'
  atividade?: AtividadeItem[]
}

function lerEventoMd(filePath: string): EventDetail | null {
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const doc = parseMd(raw)
    const ts = typeof doc.frontmatter.ts === 'number' ? doc.frontmatter.ts : 0
    const agente = String(doc.frontmatter.agente || '')
    const taskId = String(doc.frontmatter.task || doc.frontmatter.taskId || '')

    const prompt = doc.sections.get('Prompt')
    const result = doc.sections.get('Resultado') ?? doc.sections.get('Result')
    const diffRaw = doc.sections.get('Diff')
    const diff = diffRaw ? extrairDoBlocoDeCodigo(diffRaw) : undefined

    const filesSection = doc.sections.get('Arquivos') ?? doc.sections.get('Files')
    const files = filesSection ? parseArquivos(filesSection) : undefined

    const metadata: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(doc.frontmatter)) {
      if (['ts', 'agente', 'task', 'taskId'].includes(k)) continue
      metadata[k] = v
    }

    return {
      found: true,
      ts,
      agente,
      taskId,
      prompt,
      result,
      diff,
      files,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      source: 'md',
    }
  } catch {
    return null
  }
}

function extrairDoBlocoDeCodigo(s: string): string {
  const m = s.match(/^```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/)
  if (m) return m[1]
  return s
}

function parseArquivos(text: string): EventDetail['files'] {
  const tabela = parseTabelaMd(text)
  if (tabela.length === 0) return []
  return tabela.map((row) => ({
    path: row['path'] || row['arquivo'] || '',
    status: row['status'] || row['st'] || undefined,
    additions: row['+'] || row['additions'] ? parseInt(row['+'] || row['additions'], 10) : undefined,
    deletions: row['-'] || row['deletions'] ? parseInt(row['-'] || row['deletions'], 10) : undefined,
  }))
}

/**
 * Fallback: quando não há .md gravado pelo agente, monta uma resposta sintética
 * a partir dos eventos brutos do JSONL — mostrando a atividade em tempo real.
 */
function montarFallback(tsAlvo: number, agente: string, taskId: string): EventDetail | null {
  if (!fs.existsSync(EVENTS_FILE)) return null

  let eventos: Array<Record<string, unknown>> = []
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf-8')
    eventos = raw
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
    return null
  }

  const eventosDoAgente = eventos
    .filter((e) => e.agent_id === agente && e.task_id === taskId)
    .map((e) => ({
      ts: Number(e.ts || 0),
      tipo: e.tipo as AtividadeItem['tipo'],
      status: e.status as AtividadeItem['status'],
      descricao: String(e.descricao || ''),
    }))
    .sort((a, b) => a.ts - b.ts)

  if (eventosDoAgente.length === 0) return null

  // Encontra o spawning mais próximo do ts solicitado (esse é o início "desta" execução)
  const spawnings = eventosDoAgente.filter((e) => e.tipo === 'spawning')
  const spawningRelevante =
    spawnings.find((e) => e.ts === tsAlvo) ??
    spawnings.find((e) => Math.abs(e.ts - tsAlvo) < 2000) ??
    spawnings[0]

  const stoppedRelevante = eventosDoAgente.find(
    (e) => e.tipo === 'stopped' && e.ts >= (spawningRelevante?.ts ?? 0),
  )

  // Monta um "prompt sintético" descritivo
  const promptSintetico = [
    `## Instrução recebida`,
    ``,
    `**Tarefa:** \`${taskId}\``,
    `**Agente:** \`${agente}\``,
    `**Iniciado em:** ${new Date(spawningRelevante?.ts ?? tsAlvo).toLocaleTimeString('pt-BR')}`,
    ``,
    `**Descrição da execução:**`,
    spawningRelevante?.descricao ?? '(sem descrição registrada)',
    ``,
    `---`,
    ``,
    `_Este agente está executando em tempo real. Para detalhes completos do prompt original, diff de código e resultado estruturado, o agente precisa gravar o arquivo:_`,
    ``,
    `\`.workflow/tasks/${taskId}/events/${tsAlvo}-${agente}.md\``,
  ].join('\n')

  // Resultado: usa o stopped se já existe, senão estado atual
  const result = stoppedRelevante
    ? `**Status final:** ${stoppedRelevante.status === 'success' ? 'sucesso' : 'erro'}\n\n${stoppedRelevante.descricao}`
    : '_Agente ainda em execução. Acompanhe a atividade em tempo real abaixo._'

  return {
    found: true,
    source: 'events-fallback',
    ts: tsAlvo,
    agente,
    taskId,
    prompt: promptSintetico,
    result,
    atividade: eventosDoAgente,
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const ts = url.searchParams.get('ts')
  const agente = url.searchParams.get('agent')
  const taskId = url.searchParams.get('task')

  if (!ts || !agente || !taskId) {
    return NextResponse.json<EventDetail>({
      found: false,
      ts: 0,
      agente: agente ?? '',
      taskId: taskId ?? '',
    })
  }

  const tsNum = parseInt(ts, 10) || 0
  const eventsDir = path.join(AGENT_ROOT, '.workflow', 'tasks', taskId, 'events')
  const fileBase = `${ts}-${agente}`
  const mdFile = path.join(eventsDir, `${fileBase}.md`)

  // 1. Tenta o arquivo MD (preferido)
  const detalheMd = lerEventoMd(mdFile)
  if (detalheMd) return NextResponse.json<EventDetail>(detalheMd)

  // 2. Fallback: monta a partir dos eventos brutos do JSONL
  const fallback = montarFallback(tsNum, agente, taskId)
  if (fallback) return NextResponse.json<EventDetail>(fallback)

  return NextResponse.json<EventDetail>({
    found: false,
    ts: tsNum,
    agente,
    taskId,
  })
}
