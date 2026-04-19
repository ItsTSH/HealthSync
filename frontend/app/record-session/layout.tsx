import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Record Session',
  description: 'Record a new medical session',
}

export default function RecordSessionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
