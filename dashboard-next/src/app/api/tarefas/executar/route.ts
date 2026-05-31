import { NextRequest, NextResponse } from 'next/server'
import { spawn, execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  let taskId = url.searchParams.get('id') || ''
  const simular = url.searchParams.get('simular') === '1'
  if (!taskId) {
    const body = await request.json().catch(() => ({}))
    taskId = String(body.taskId || body.id || '')
  }

  if (!/^TASK-\d+$/.test(taskId)) {
    return NextResponse.json({ erro: 'taskId inválido' }, { status: 400 })
  }

  const tarefaMd = path.join(AGENT_ROOT, 'tarefas', `${taskId}.md`)
  if (!fs.existsSync(tarefaMd)) {
    return NextResponse.json({ erro: `tarefa ${taskId} não encontrada` }, { status: 404 })
  }

  // ─── Modo SIMULAÇÃO: runner Node (visual + PDF, não edita código) ───
  if (simular) {
    const runner = path.join(AGENT_ROOT, 'scripts', 'executar-tarefa.js')
    try {
      const child = spawn('node', [runner, taskId], {
        cwd: AGENT_ROOT,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      })
      child.unref()
      return NextResponse.json({
        iniciado: true,
        modo: 'simulacao',
        pid: child.pid,
        taskId,
        mensagem: 'Simulação iniciada — pipeline visual + PDF. NÃO edita o código real.',
      })
    } catch (e) {
      return NextResponse.json({ iniciado: false, erro: (e as Error).message }, { status: 500 })
    }
  }

  // ─── Modo REAL: abre Terminal rodando o Claude no projeto-alvo ───
  const script = path.join(AGENT_ROOT, 'scripts', 'executar-real.sh')
  if (!fs.existsSync(script)) {
    return NextResponse.json({ erro: 'executar-real.sh não encontrado' }, { status: 500 })
  }

  if (process.platform !== 'darwin') {
    return NextResponse.json(
      {
        iniciado: false,
        erro: 'Execução real automática só suportada no macOS por enquanto.',
        comando_manual: `bash ${script.replace(os.homedir(), '~')} ${taskId}`,
      },
      { status: 501 },
    )
  }

  try {
    // Roda síncrono — o script só abre o Terminal e retorna na hora
    const out = execFileSync('bash', [script, taskId], {
      cwd: AGENT_ROOT,
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env },
    })

    // Extrai projeto/caminho do output
    const proj = out.match(/projeto=(.+)/)?.[1]?.trim()
    const caminho = out.match(/caminho=(.+)/)?.[1]?.trim()

    return NextResponse.json({
      iniciado: true,
      modo: 'real',
      taskId,
      projeto: proj,
      caminho: caminho?.replace(os.homedir(), '~'),
      mensagem: `Terminal aberto no projeto ${proj || ''}. O Claude vai implementar o código de verdade — acompanhe no terminal e o diff aparece no dashboard. O PDF é gerado ao final.`,
    })
  } catch (e) {
    const err = e as Error & { stderr?: string }
    const msg = err.stderr || err.message
    return NextResponse.json(
      {
        iniciado: false,
        erro: `Não foi possível iniciar: ${msg}`,
        comando_manual: `cd ${AGENT_ROOT.replace(os.homedir(), '~')} && bash scripts/executar-real.sh ${taskId}`,
      },
      { status: 500 },
    )
  }
}
