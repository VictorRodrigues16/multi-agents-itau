import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { parseMd, parseListaPropriedades } from '@/lib/md-storage'

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

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const DEFAULT_PATH = process.env.AGENT_ITAU_DIFF_PATH || AGENT_ROOT

function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 })
  } catch {
    return ''
  }
}

function resolverCwd(opts: {
  pathParam: string | null
  agente: string | null
  taskId: string | null
}): { cwd: string; source: Source; erro?: string } {
  if (opts.pathParam) {
    return { cwd: path.resolve(opts.pathParam), source: 'path' }
  }

  if (opts.agente && opts.taskId) {
    const wtFile = path.join(AGENT_ROOT, '.workflow', 'tasks', opts.taskId, 'worktrees.md')
    if (fs.existsSync(wtFile)) {
      try {
        const raw = fs.readFileSync(wtFile, 'utf-8')
        const doc = parseMd(raw)
        // Procura na section "Mapeamento" ou no body inteiro
        const conteudo = doc.sections.get('Mapeamento') ?? doc.body
        const mapa = parseListaPropriedades(conteudo)
        const wtPath = mapa[opts.agente]
        if (wtPath) {
          const resolvido = wtPath.startsWith('~/')
            ? path.join(os.homedir(), wtPath.slice(2))
            : path.resolve(wtPath)
          return { cwd: resolvido, source: 'worktree' }
        }
      } catch (e) {
        return {
          cwd: DEFAULT_PATH,
          source: 'default',
          erro: 'worktrees.md inválido: ' + (e as Error).message,
        }
      }
    }
  }

  return { cwd: DEFAULT_PATH, source: 'default' }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathParam = url.searchParams.get('path')
  const agente = url.searchParams.get('agent')
  const taskId = url.searchParams.get('task')

  const { cwd, source, erro: erroResolucao } = resolverCwd({ pathParam, agente, taskId })

  const respostaBase: Omit<DiffResponse, 'diff' | 'staged' | 'files' | 'resumo'> = {
    cwd,
    branch: null,
    conectado: false,
    source,
    agente: agente ?? undefined,
    taskId: taskId ?? undefined,
  }

  if (!fs.existsSync(cwd)) {
    return NextResponse.json<DiffResponse>({
      ...respostaBase,
      diff: '',
      staged: '',
      files: [],
      resumo: { added: 0, deleted: 0, changed: 0 },
      erro: erroResolucao || 'Caminho nao existe',
    })
  }

  const inGit = safeExec('git rev-parse --is-inside-work-tree', cwd).trim()
  if (inGit !== 'true') {
    return NextResponse.json<DiffResponse>({
      ...respostaBase,
      diff: '',
      staged: '',
      files: [],
      resumo: { added: 0, deleted: 0, changed: 0 },
      erro: erroResolucao || 'Nao e um repositorio git',
    })
  }

  const branch = safeExec('git rev-parse --abbrev-ref HEAD', cwd).trim() || null
  const diff = safeExec('git diff HEAD', cwd)
  const staged = safeExec('git diff --staged', cwd)
  const status = safeExec('git diff --name-status HEAD', cwd).trim()
  const statusUntracked = safeExec('git ls-files --others --exclude-standard', cwd).trim()
  const numstat = safeExec('git diff --numstat HEAD', cwd).trim()

  const nstatMap = new Map<string, { adds: number; dels: number }>()
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [adds, dels, p] = line.split('\t')
    nstatMap.set(p, {
      adds: adds === '-' ? 0 : parseInt(adds, 10) || 0,
      dels: dels === '-' ? 0 : parseInt(dels, 10) || 0,
    })
  }

  const files: FileChange[] = []
  let totalAdds = 0
  let totalDels = 0

  for (const line of status.split('\n').filter(Boolean)) {
    const m = line.match(/^([A-Z])\s+(.+)$/)
    if (!m) continue
    const [, st, p] = m
    const stat = nstatMap.get(p) || { adds: 0, dels: 0 }
    totalAdds += stat.adds
    totalDels += stat.dels
    files.push({
      status: st,
      path: p,
      additions: stat.adds,
      deletions: stat.dels,
    })
  }

  for (const p of statusUntracked.split('\n').filter(Boolean)) {
    files.push({ status: '?', path: p })
  }

  return NextResponse.json<DiffResponse>({
    ...respostaBase,
    branch,
    diff,
    staged,
    files,
    resumo: { added: totalAdds, deleted: totalDels, changed: files.length },
    conectado: true,
  })
}
