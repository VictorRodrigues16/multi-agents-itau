import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Procura uma pasta pelo nome em locais comuns do sistema do usuário.
 * Resolve a limitação do browser que não dá path absoluto via webkitdirectory.
 */

const HOME = os.homedir()

const BASES_DEFAULT = [
  HOME,
  path.join(HOME, 'dsg'),
  path.join(HOME, 'projetos'),
  path.join(HOME, 'Projetos'),
  path.join(HOME, 'projects'),
  path.join(HOME, 'dev'),
  path.join(HOME, 'Dev'),
  path.join(HOME, 'code'),
  path.join(HOME, 'Code'),
  path.join(HOME, 'work'),
  path.join(HOME, 'Work'),
  path.join(HOME, 'repos'),
  path.join(HOME, 'Repos'),
  path.join(HOME, 'src'),
  path.join(HOME, 'workspace'),
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Desktop'),
]

function basesConfiguradas(): string[] {
  const extra = process.env.PROJECTS_ROOT
  if (extra) return [extra, ...BASES_DEFAULT]
  return BASES_DEFAULT
}

interface Match {
  caminho: string
  caminho_home: string // formato ~/...
  profundidade: number // 1 = direto em base/, 2 = base/x/, etc.
  base: string // qual base achou
}

function buscarPorNome(nome: string): Match[] {
  const resultados: Match[] = []
  const visitados = new Set<string>()

  for (const base of basesConfiguradas()) {
    if (!fs.existsSync(base)) continue
    try {
      // Procura via find no macOS/Linux — rápido e respeita .gitignore implicitamente
      // -maxdepth 3 evita varrer node_modules profundo
      const cmd = `find "${base}" -maxdepth 3 -type d -name "${nome.replace(/"/g, '\\"')}" 2>/dev/null`
      const saida = execSync(cmd, { encoding: 'utf-8', timeout: 3000, maxBuffer: 1024 * 1024 })
      const linhas = saida
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

      for (const caminho of linhas) {
        // Ignora node_modules, .git, .next
        if (caminho.includes('/node_modules/') || caminho.includes('/.git/') || caminho.includes('/.next/')) continue
        if (visitados.has(caminho)) continue
        visitados.add(caminho)

        // Calcula profundidade relativa à base
        const rel = path.relative(base, caminho)
        const profundidade = rel.split('/').length

        resultados.push({
          caminho,
          caminho_home: caminho.startsWith(HOME) ? '~' + caminho.slice(HOME.length) : caminho,
          profundidade,
          base,
        })
      }
    } catch {
      // ignora bases inacessíveis ou timeouts
    }
  }

  // Ordena: mais raso primeiro (mais provável de ser o projeto real)
  resultados.sort((a, b) => a.profundidade - b.profundidade)

  return resultados
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const nome = (url.searchParams.get('nome') || '').trim()

  if (!nome) {
    return NextResponse.json({ matches: [], erro: 'nome é obrigatório' }, { status: 400 })
  }

  // Sanitiza nome (sem barras, sem chars de shell)
  if (/[\\/$`<>;&|]/.test(nome)) {
    return NextResponse.json({ matches: [], erro: 'nome inválido' }, { status: 400 })
  }

  const matches = buscarPorNome(nome)
  return NextResponse.json({
    matches,
    total: matches.length,
    nome,
    locais_buscados: basesConfiguradas().filter((b) => fs.existsSync(b)),
  })
}
