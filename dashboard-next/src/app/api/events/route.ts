import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const EVENTS_FILE = process.env.AGENT_ITAU_EVENTS || path.join(os.homedir(), '.claude', 'agent-events-itau.jsonl')

export async function GET() {
  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      return NextResponse.json({ eventos: [], file: EVENTS_FILE, exists: false })
    }

    const raw = fs.readFileSync(EVENTS_FILE, 'utf-8')
    const linhas = raw.split('\n').filter((l) => l.trim().length > 0)
    const eventos = linhas
      .map((l) => {
        try {
          return JSON.parse(l)
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return NextResponse.json({ eventos, file: EVENTS_FILE, exists: true })
  } catch (err) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '', 'utf-8')
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
