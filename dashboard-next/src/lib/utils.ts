export function formatarDuracao(ms: number | undefined): string {
  if (ms == null) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sr = s % 60
  if (m < 60) return `${m}m ${sr}s`
  const h = Math.floor(m / 60)
  const mr = m % 60
  return `${h}h ${mr}m`
}

export function formatarHora(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function statusCor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'running':
    case 'spawning':
      return { bg: 'bg-itau-orange', text: 'text-white', border: 'border-itau-orange' }
    case 'success':
      return { bg: 'bg-(--color-success-bg)', text: 'text-(--color-success)', border: 'border-(--color-success)' }
    case 'error':
    case 'timeout':
      return { bg: 'bg-(--color-error-bg)', text: 'text-(--color-error)', border: 'border-(--color-error)' }
    case 'idle':
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    idle: 'ocioso',
    spawning: 'iniciando',
    running: 'rodando',
    success: 'sucesso',
    error: 'erro',
    timeout: 'timeout',
  }
  return map[status] || status
}
