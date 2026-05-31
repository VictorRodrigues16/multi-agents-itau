import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import os from 'os'
import path from 'path'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const AGENTS_DIR = path.join(AGENT_ROOT, '.claude', 'agents')
const BACKUP_DIR = path.join(AGENT_ROOT, '.workflow', 'agentes-backup')

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

function parseFrontmatter(raw: string): { fm: Record<string, string | string[]>; corpo: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { fm: {}, corpo: raw }

  const fm: Record<string, string | string[]> = {}
  const linhas = match[1].split('\n')
  for (const l of linhas) {
    const idx = l.indexOf(':')
    if (idx <= 0) continue
    const k = l.slice(0, idx).trim()
    const v = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')

    // Array no formato YAML: tools: ["a", "b"]
    if (v.startsWith('[') && v.endsWith(']')) {
      fm[k] = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else {
      fm[k] = v
    }
  }
  return { fm, corpo: match[2] }
}

function lerAgente(arquivo: string): AgenteCompleto | null {
  const filePath = path.join(AGENTS_DIR, arquivo)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const stat = fs.statSync(filePath)
  const { fm, corpo } = parseFrontmatter(raw)
  const id = arquivo.replace(/\.md$/, '')
  const backupPath = path.join(BACKUP_DIR, `${id}.md`)

  return {
    id,
    name: typeof fm.name === 'string' ? fm.name : id,
    description: typeof fm.description === 'string' ? fm.description : '',
    model: typeof fm.model === 'string' ? fm.model : '—',
    tools: Array.isArray(fm.tools) ? fm.tools : [],
    arquivo,
    tamanho: stat.size,
    modificado_em: stat.mtime.toISOString(),
    tem_backup: fs.existsSync(backupPath),
    frontmatter: fm,
    corpo,
    conteudo: raw,
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!fs.existsSync(AGENTS_DIR)) {
    return NextResponse.json({ agentes: [], erro: 'Diretório de agentes não existe' })
  }

  if (id) {
    const arquivo = id.endsWith('.md') ? id : `${id}.md`
    const ag = lerAgente(arquivo)
    if (!ag) {
      return NextResponse.json({ erro: 'agente não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ agente: ag })
  }

  // Lista
  const arquivos = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).sort()
  const agentes = arquivos.map(lerAgente).filter((a): a is AgenteCompleto => a !== null)

  const resumo: AgenteResumo[] = agentes.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    model: a.model,
    tools: a.tools,
    arquivo: a.arquivo,
    tamanho: a.tamanho,
    modificado_em: a.modificado_em,
    tem_backup: a.tem_backup,
  }))

  return NextResponse.json({ agentes: resumo, total: resumo.length })
}

export async function PUT(request: NextRequest) {
  let body: { id: string; conteudo: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  if (!body.id || typeof body.conteudo !== 'string') {
    return NextResponse.json({ erro: 'id e conteudo obrigatorios' }, { status: 400 })
  }

  const arquivo = body.id.endsWith('.md') ? body.id : `${body.id}.md`
  const filePath = path.join(AGENTS_DIR, arquivo)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ erro: 'agente não encontrado' }, { status: 404 })
  }

  // Backup do original (so faz uma vez — preserva o "default")
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const backupPath = path.join(BACKUP_DIR, arquivo)
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath)
  }

  // Salva versão atual com timestamp tambem (historico simples)
  const histDir = path.join(BACKUP_DIR, 'historico', body.id.replace(/\.md$/, ''))
  fs.mkdirSync(histDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(path.join(histDir, `${ts}.md`), fs.readFileSync(filePath, 'utf-8'), 'utf-8')

  // Escreve novo conteudo
  fs.writeFileSync(filePath, body.conteudo, 'utf-8')

  const ag = lerAgente(arquivo)
  return NextResponse.json({ ok: true, agente: ag })
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const id = url.searchParams.get('id')

  if (action !== 'restaurar' || !id) {
    return NextResponse.json({ erro: 'use ?action=restaurar&id=xxx' }, { status: 400 })
  }

  const arquivo = id.endsWith('.md') ? id : `${id}.md`
  const filePath = path.join(AGENTS_DIR, arquivo)
  const backupPath = path.join(BACKUP_DIR, arquivo)

  if (!fs.existsSync(backupPath)) {
    return NextResponse.json({ erro: 'sem backup disponível para restaurar' }, { status: 404 })
  }

  fs.copyFileSync(backupPath, filePath)
  const ag = lerAgente(arquivo)
  return NextResponse.json({ ok: true, agente: ag })
}
