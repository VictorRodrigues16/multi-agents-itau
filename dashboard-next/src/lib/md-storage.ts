/**
 * Lib leve para ler/escrever dados estruturados em arquivos Markdown.
 *
 * Convenções:
 * - **Frontmatter YAML simples** no topo: `chave: valor` (sem aninhamento profundo)
 * - **Listas em formato YAML inline**: `[a, b, c]` ou multilinha com `- item`
 * - **Sections `## Título`** para blocos de texto longos
 * - **Listas de propriedades** em bullets: `- **chave**: valor`
 * - **Tabelas markdown** para coleções
 *
 * Sem dependências externas — parser regex robusto o suficiente.
 */

export interface MdDocumento {
  frontmatter: Record<string, unknown>
  body: string
  sections: Map<string, string>
}

/**
 * Parseia um arquivo MD com frontmatter YAML + sections.
 */
export function parseMd(raw: string): MdDocumento {
  const { fm, body } = extrairFrontmatter(raw)
  const sections = extrairSections(body)
  return { frontmatter: fm, body, sections }
}

/**
 * Extrai frontmatter YAML simples (entre `---`).
 */
function extrairFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { fm: {}, body: raw }
  return { fm: parseFrontmatterBody(m[1]), body: m[2] }
}

/**
 * Parser simples de frontmatter YAML.
 * Suporta:
 * - chave: valor (string)
 * - chave: 123 (numero)
 * - chave: true/false (boolean)
 * - chave: [a, b, c] (array inline)
 * - chave: (linha vazia)
 *     - item1
 *     - item2  (array multilinha)
 */
function parseFrontmatterBody(text: string): Record<string, unknown> {
  const fm: Record<string, unknown> = {}
  const linhas = text.split(/\r?\n/)
  let i = 0
  while (i < linhas.length) {
    const l = linhas[i]
    if (!l.trim() || l.startsWith('#')) {
      i++
      continue
    }
    const matchKV = l.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/)
    if (!matchKV) {
      i++
      continue
    }
    const [, chave, valorRaw] = matchKV
    const valorTrim = valorRaw.trim()

    if (valorTrim === '') {
      // Lista multilinha
      const itens: string[] = []
      let j = i + 1
      while (j < linhas.length) {
        const item = linhas[j].match(/^\s*-\s+(.+)$/)
        if (!item) break
        itens.push(removerAspas(item[1].trim()))
        j++
      }
      if (itens.length > 0) {
        fm[chave] = itens
        i = j
        continue
      }
      fm[chave] = ''
      i++
      continue
    }

    if (valorTrim.startsWith('[') && valorTrim.endsWith(']')) {
      fm[chave] = valorTrim
        .slice(1, -1)
        .split(',')
        .map((s) => removerAspas(s.trim()))
        .filter(Boolean)
    } else if (valorTrim === 'true' || valorTrim === 'false') {
      fm[chave] = valorTrim === 'true'
    } else if (/^-?\d+(\.\d+)?$/.test(valorTrim)) {
      fm[chave] = parseFloat(valorTrim)
    } else {
      fm[chave] = removerAspas(valorTrim)
    }
    i++
  }
  return fm
}

function removerAspas(s: string): string {
  return s.replace(/^["']|["']$/g, '')
}

/**
 * Extrai sections H2 do markdown.
 * Retorna Map<titulo, conteudo>.
 */
function extrairSections(body: string): Map<string, string> {
  const mapa = new Map<string, string>()
  const partes = body.split(/^##\s+(.+)$/m)
  // partes[0] = pre-section (ignorado), partes[1] = titulo1, partes[2] = conteudo1, ...
  for (let i = 1; i < partes.length; i += 2) {
    const titulo = partes[i].trim()
    const conteudo = (partes[i + 1] || '').trim()
    mapa.set(titulo, conteudo)
  }
  return mapa
}

/**
 * Serializa frontmatter para texto YAML.
 */
export function serializarFrontmatter(fm: Record<string, unknown>): string {
  const linhas: string[] = []
  for (const [k, v] of Object.entries(fm)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) {
      if (v.length === 0) linhas.push(`${k}: []`)
      else linhas.push(`${k}: [${v.map((x) => formatarValorYaml(x)).join(', ')}]`)
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      linhas.push(`${k}: ${v}`)
    } else {
      linhas.push(`${k}: ${formatarValorYaml(String(v))}`)
    }
  }
  return linhas.join('\n')
}

function formatarValorYaml(v: unknown): string {
  const s = String(v)
  // Se tem caracteres especiais, encapsula em aspas
  if (/[:#{}[\],&*!|>'"%@`]/.test(s) || s.includes('\n')) {
    return `"${s.replace(/"/g, '\\"')}"`
  }
  return s
}

/**
 * Parseia bullets do tipo `- **chave**: valor` ou `- chave: valor`.
 */
export function parseListaPropriedades(text: string): Record<string, string> {
  const obj: Record<string, string> = {}
  const linhas = text.split(/\r?\n/)
  for (const l of linhas) {
    const m = l.match(/^\s*-\s+\*?\*?([a-zA-Z0-9_.-]+)\*?\*?\s*:\s*(.+?)$/)
    if (!m) continue
    let valor = m[2].trim()
    // Remove backticks ao redor
    valor = valor.replace(/^`(.*)`$/, '$1')
    obj[m[1].trim()] = removerAspas(valor)
  }
  return obj
}

/**
 * Parseia tabela markdown em array de objetos.
 * Espera primeira linha = header, segunda linha = separador.
 */
export function parseTabelaMd(text: string): Array<Record<string, string>> {
  const linhas = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'))

  if (linhas.length < 2) return []

  const cabecalho = linhas[0]
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim())

  const linhasData = linhas.slice(2) // pula header + separador

  return linhasData.map((l) => {
    const cels = l
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim())
    const obj: Record<string, string> = {}
    cabecalho.forEach((col, idx) => {
      obj[col] = cels[idx] ?? ''
    })
    return obj
  })
}

/**
 * Renderiza tabela markdown a partir de array de objetos.
 */
export function renderTabelaMd(
  itens: Array<Record<string, string | number | boolean | undefined>>,
  colunas?: string[],
): string {
  if (itens.length === 0) return '_sem entradas_'
  const cols = colunas ?? Object.keys(itens[0])
  const linhas: string[] = []
  linhas.push('| ' + cols.join(' | ') + ' |')
  linhas.push('|' + cols.map(() => '---').join('|') + '|')
  for (const it of itens) {
    linhas.push(
      '| ' +
        cols.map((c) => formatarCelula(it[c])).join(' | ') +
        ' |',
    )
  }
  return linhas.join('\n')
}

function formatarCelula(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  const s = String(v)
  return s.replace(/\|/g, '\\|')
}
