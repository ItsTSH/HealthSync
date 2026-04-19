import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Chat',
  description: 'Continue your conversation with HealthSync AI',
}

export default function ChatDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
