import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { parseMd, parseListaPropriedades } from '@/lib/md-storage'

const AGENT_ROOT = process.env.AGENT_ITAU_ROOT || path.resolve(process.cwd(), '..')
const PROJETOS_MD = path.join(AGENT_ROOT, '.claude', 'projetos.md')
// Template versionado — usado num clone novo, antes do usuário registrar o 1º projeto
const PROJETOS_EXAMPLE_MD = path.join(AGENT_ROOT, '.claude', 'projetos.example.md')

interface Projeto {
  id: string
  nome: string
  caminho: string
  stack?: string[]
  descricao?: string
  criado_em: string
  ativo: boolean
}

function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', maxBuffer: 1024 * 1024 })
  } catch {
    return ''
  }
}

/**
 * Estrutura esperada do projetos.md:
 *
 * ---
 * version: 1
 * ---
 *
 * # Projetos registrados — agent-itau
 *
 * (texto livre)
 *
 * ## {id-do-projeto}
 *
 * - **nome**: ...
 * - **caminho**: `~/...`
 * - **stack**: NestJS, TypeScript
 * - **descricao**: ...
 * - **ativo**: true
 * - **criado_em**: 2026-05-22T...
 */
function lerProjetos(): Projeto[] {
  // Fonte real é projetos.md (gitignorado, criado ao registrar o 1º projeto).
  // Num clone novo ele ainda não existe → cai no template versionado projetos.example.md.
  const fonte = fs.existsSync(PROJETOS_MD) ? PROJETOS_MD : PROJETOS_EXAMPLE_MD
  if (!fs.existsSync(fonte)) return []
  try {
    const raw = fs.readFileSync(fonte, 'utf-8')
    const doc = parseMd(raw)
    const projetos: Projeto[] = []

    for (const [id, conteudo] of doc.sections.entries()) {
      // Ignora sections meta como "Como os agentes usam"
      if (id.toLowerCase().includes('como') || id.toLowerCase().includes('uso')) continue
      const props = parseListaPropriedades(conteudo)
      if (!props.caminho) continue

      projetos.push({
        id,
        nome: props.nome || id,
        caminho: expandirHome(props.caminho),
        stack: props.stack
          ? props.stack.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        descricao: props.descricao,
        ativo: props.ativo !== 'false' && props.ativo !== 'nao' && props.ativo !== 'não',
        criado_em: props.criado_em || new Date().toISOString(),
      })
    }
    return projetos
  } catch {
    return []
  }
}

function expandirHome(p: string): string {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function colapsarHome(p: string): string {
  const home = os.homedir()
  if (p.startsWith(home)) return '~' + p.slice(home.length)
  return p
}

function salvarProjetos(projetos: Projeto[]): void {
  if (!fs.existsSync(path.dirname(PROJETOS_MD))) {
    fs.mkdirSync(path.dirname(PROJETOS_MD), { recursive: true })
  }

  const linhas: string[] = []
  linhas.push('---')
  linhas.push('version: 1')
  linhas.push(`atualizado: ${new Date().toISOString()}`)
  linhas.push('---')
  linhas.push('')
  linhas.push('# Projetos registrados — agent-itau')
  linhas.push('')
  linhas.push('> Fonte canônica dos projetos onde os agentes podem trabalhar.')
  linhas.push('> Este arquivo é lido e escrito pelo dashboard (aba **Projetos**).')
  linhas.push('> Você pode editar diretamente — mantenha o formato `## {id}` + bullets `- **chave**: valor`.')
  linhas.push('')

  const ativos = projetos.filter((p) => p.ativo)
  const inativos = projetos.filter((p) => !p.ativo)

  if (ativos.length === 0 && inativos.length === 0) {
    linhas.push('_Nenhum projeto registrado. Use a aba **Projetos** no dashboard para adicionar._')
  }

  for (const p of [...ativos, ...inativos]) {
    linhas.push(`## ${p.id}`)
    linhas.push('')
    linhas.push(`- **nome**: ${p.nome}`)
    linhas.push(`- **caminho**: \`${colapsarHome(p.caminho)}\``)
    if (p.descricao) linhas.push(`- **descricao**: ${p.descricao}`)
    if (p.stack && p.stack.length > 0) linhas.push(`- **stack**: ${p.stack.join(', ')}`)
    linhas.push(`- **ativo**: ${p.ativo ? 'true' : 'false'}`)
    linhas.push(`- **criado_em**: ${p.criado_em}`)
    linhas.push('')
  }

  linhas.push('## Como os agentes usam')
  linhas.push('')
  linhas.push('Quando o `dev-tech-lead` precisa criar worktrees, ele consulta este arquivo para localizar')
  linhas.push('o projeto-alvo via `caminho`. O caminho pode usar `~/` (será expandido para o home).')
  linhas.push('')

  fs.writeFileSync(PROJETOS_MD, linhas.join('\n'), 'utf-8')
}

function gerarId(caminho: string, nome?: string): string {
  if (nome) {
    const slug = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug) return slug
  }
  return path.basename(caminho)
}

function enriquecerComGit(p: Projeto) {
  if (!fs.existsSync(p.caminho)) return p
  const isGit = safeExec('git rev-parse --is-inside-work-tree', p.caminho).trim()
  if (isGit !== 'true') return p

  const branch = safeExec('git rev-parse --abbrev-ref HEAD', p.caminho).trim() || null
  const status = safeExec('git status --porcelain', p.caminho).trim()
  const arquivosModificados = status ? status.split('\n').length : 0
  const lastCommit = safeExec('git log -1 --format=%s', p.caminho).trim() || undefined

  return {
    ...p,
    git: { branch, arquivos_modificados: arquivosModificados, last_commit: lastCommit },
  }
}

export async function GET() {
  const projetos = lerProjetos().map(enriquecerComGit)
  return NextResponse.json({ projetos })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const caminho = String(body.caminho || '').trim()
  const nome = body.nome ? String(body.nome).trim() : undefined
  const descricao = body.descricao ? String(body.descricao).trim() : undefined
  const stack = Array.isArray(body.stack) ? body.stack.map(String) : undefined

  if (!caminho) {
    return NextResponse.json({ erro: 'caminho é obrigatório' }, { status: 400 })
  }

  const expanded = expandirHome(caminho)
  const resolvido = path.resolve(expanded)

  if (!fs.existsSync(resolvido)) {
    return NextResponse.json({ erro: `caminho não existe: ${resolvido}` }, { status: 400 })
  }
  if (!fs.statSync(resolvido).isDirectory()) {
    return NextResponse.json({ erro: 'caminho não é uma pasta' }, { status: 400 })
  }

  const projetos = lerProjetos()
  if (projetos.find((p) => p.caminho === resolvido)) {
    return NextResponse.json({ erro: 'projeto já registrado' }, { status: 409 })
  }

  const novo: Projeto = {
    id: gerarId(resolvido, nome),
    nome: nome || path.basename(resolvido),
    caminho: resolvido,
    stack,
    descricao,
    criado_em: new Date().toISOString(),
    ativo: true,
  }

  projetos.push(novo)
  salvarProjetos(projetos)

  return NextResponse.json({ projeto: enriquecerComGit(novo) }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ erro: 'id é obrigatório' }, { status: 400 })

  const projetos = lerProjetos()
  const novoArray = projetos.filter((p) => p.id !== id)
  if (novoArray.length === projetos.length) {
    return NextResponse.json({ erro: 'projeto não encontrado' }, { status: 404 })
  }
  salvarProjetos(novoArray)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ erro: 'id é obrigatório' }, { status: 400 })

  const projetos = lerProjetos()
  const idx = projetos.findIndex((p) => p.id === id)
  if (idx < 0) return NextResponse.json({ erro: 'projeto não encontrado' }, { status: 404 })

  const p = projetos[idx]
  if (typeof body.ativo === 'boolean') p.ativo = body.ativo
  if (typeof body.nome === 'string') p.nome = body.nome
  if (typeof body.descricao === 'string') p.descricao = body.descricao
  if (Array.isArray(body.stack)) p.stack = body.stack.map(String)

  salvarProjetos(projetos)
  return NextResponse.json({ projeto: enriquecerComGit(p) })
}
