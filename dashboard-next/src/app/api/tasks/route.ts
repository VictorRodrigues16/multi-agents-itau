import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const TAREFAS_DIR = path.join(AGENT_ROOT, 'tarefas')
const RELATORIOS_DIR = path.join(AGENT_ROOT, 'relatorios')
const WORKFLOW_TASKS_DIR = path.join(AGENT_ROOT, '.workflow', 'tasks')

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
        const v = l
          .slice(idx + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
        fm[k] = v
      }
    }
    return fm
  } catch {
    return {}
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(TAREFAS_DIR)) {
      return NextResponse.json({ tarefas: [] })
    }

    const arquivos = fs
      .readdirSync(TAREFAS_DIR)
      .filter((f) => /^TASK-\d+\.md$/.test(f))
      .sort()

    const tarefas = arquivos.map((arq) => {
      const id = arq.replace(/\.md$/, '')
      const fm = lerFrontmatter(path.join(TAREFAS_DIR, arq))
      const pdfPath = path.join(RELATORIOS_DIR, `${id}.pdf`)
      const workflowDir = path.join(WORKFLOW_TASKS_DIR, id)

      let status: 'pendente' | 'em-execucao' | 'concluida' = 'pendente'
      if (fs.existsSync(pdfPath)) status = 'concluida'
      else if (fs.existsSync(workflowDir)) status = 'em-execucao'

      return {
        id,
        titulo: fm.titulo || id,
        tipo: fm.tipo || '—',
        projetos: fm.projetos || '',
        criadoEm: fm.criado_em || '—',
        status,
        pdfPath: status === 'concluida' ? pdfPath : undefined,
      }
    })

    return NextResponse.json({ tarefas })
  } catch (err) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
