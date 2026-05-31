import type { NextConfig } from 'next'

// Fixa a raiz do workspace no proprio dashboard-next.
// Sem isso, o Next infere a raiz pelo lockfile mais externo (~/dsg/agent-itau),
// e o file-watcher do Turbopack passa a vigiar a arvore inteira do repo
// (incluindo .claude/worktrees/ aninhados + node_modules), estourando a
// memoria assim que o navegador carrega a pagina e o watcher entra em acao.
const projectRoot = import.meta.dirname

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
}

export default nextConfig
