import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const TAREFAS_DIR = path.join(AGENT_ROOT, 'tarefas')

interface FormularioTarefa {
  titulo: string
  tipo?: string
  projetos?: string[]
  descricao?: string
  objetivo?: string
  criterios?: string[]
  notas?: string
  autor?: string
  executarAgora?: boolean
}

function proximoTaskId(): string {
  if (!fs.existsSync(TAREFAS_DIR)) fs.mkdirSync(TAREFAS_DIR, { recursive: true })

  const existentes = fs
    .readdirSync(TAREFAS_DIR)
    .map((f) => f.match(/^TASK-(\d+)\.md$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => parseInt(m[1], 10))

  const max = existentes.length > 0 ? Math.max(...existentes) : 0
  return `TASK-${String(max + 1).padStart(3, '0')}`
}

function montarMarkdown(taskId: string, form: FormularioTarefa): string {
  const dataIso = new Date().toISOString().slice(0, 10)
  const tipo = form.tipo || 'feature'
  const projetosLista = form.projetos && form.projetos.length > 0 ? form.projetos : []
  const projetosYaml = projetosLista.length > 0 ? `[${projetosLista.join(', ')}]` : '[]'

  const criterios = (form.criterios || []).filter((c) => c.trim().length > 0)
  const criteriosBloco =
    criterios.length > 0
      ? criterios.map((c) => `- [ ] ${c.trim()}`).join('\n')
      : '- [ ] _adicionar criterios_'

  return `---
id: ${taskId}
titulo: "${form.titulo.replace(/"/g, '\\"')}"
tipo: ${tipo}
projetos: ${projetosYaml}
autor: "${form.autor || 'Dashboard agent-itau'}"
criado_em: ${dataIso}
status: pendente
---

# ${form.titulo}

## Contexto / Jornada do cliente

${form.descricao || '_descrever a jornada do cliente, problema de negocio ou refinamento_'}

## Objetivo

${form.objetivo || '_o que precisa estar diferente ao final_'}

## Criterios de aceite

${criteriosBloco}

## Notas

${form.notas || '_links de design, conversas, restricoes, dependencias_'}
`
}

export async function POST(request: NextRequest) {
  let body: FormularioTarefa
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'JSON invalido' }, { status: 400 })
  }

  if (!body.titulo || !body.titulo.trim()) {
    return NextResponse.json({ erro: 'titulo é obrigatorio' }, { status: 400 })
  }

  const taskId = proximoTaskId()
  const filePath = path.join(TAREFAS_DIR, `${taskId}.md`)
  const conteudo = montarMarkdown(taskId, body)

  try {
    fs.writeFileSync(filePath, conteudo, 'utf-8')
  } catch (e) {
    return NextResponse.json(
      { erro: 'falha ao gravar arquivo: ' + (e as Error).message },
      { status: 500 },
    )
  }

  const resposta: Record<string, unknown> = {
    id: taskId,
    path: filePath,
    comando: `/tarefa ${taskId}`,
    cwd: AGENT_ROOT,
  }

  // Tenta executar via claude CLI (opcional, depende de claude estar no PATH)
  if (body.executarAgora) {
    const execucao = await tentarExecutar(taskId)
    resposta.execucao = execucao
  }

  return NextResponse.json(resposta, { status: 201 })
}

async function tentarExecutar(taskId: string): Promise<{
  iniciado: boolean
  pid?: number
  mensagem: string
  comando_manual?: string
}> {
  // Checa se `claude` está no PATH
  const claudeBin = await encontrarBin('claude')
  if (!claudeBin) {
    return {
      iniciado: false,
      mensagem: 'CLI `claude` nao encontrada no PATH. Execute manualmente.',
      comando_manual: `cd ${AGENT_ROOT} && claude\n/tarefa ${taskId}`,
    }
  }

  try {
    const child = spawn(claudeBin, ['--print', `/tarefa ${taskId}`], {
      cwd: AGENT_ROOT,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    })
    child.unref()
    return {
      iniciado: true,
      pid: child.pid,
      mensagem: `Pipeline iniciado em background (PID ${child.pid}). Acompanhe pelos eventos no dashboard.`,
    }
  } catch (e) {
    return {
      iniciado: false,
      mensagem: 'erro ao spawnar: ' + (e as Error).message,
      comando_manual: `cd ${AGENT_ROOT} && claude\n/tarefa ${taskId}`,
    }
  }
}

async function encontrarBin(nome: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('which', [nome], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    proc.stdout.on('data', (d) => {
      out += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0 && out.trim()) resolve(out.trim())
      else resolve(null)
    })
    proc.on('error', () => resolve(null))
  })
}
