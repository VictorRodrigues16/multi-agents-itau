import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('task')
  if (!taskId || !/^TASK-\d+$/.test(taskId)) {
    return NextResponse.json({ erro: 'task inválido' }, { status: 400 })
  }

  const pdfPath = path.join(AGENT_ROOT, 'relatorios', `${taskId}.pdf`)
  if (!fs.existsSync(pdfPath)) {
    return NextResponse.json({ erro: 'PDF não encontrado para esta tarefa' }, { status: 404 })
  }

  const buffer = fs.readFileSync(pdfPath)
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${taskId}.pdf"`,
      'Cache-Control': 'no-cache',
    },
  })
}
