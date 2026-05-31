import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agents - Itaú',
  description: 'Monitor Squad Payments — Itaú',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#FBF6EE', color: '#1A1A1A', margin: 0 }}>{children}</body>
    </html>
  )
}
