import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Sessions',
  description: 'View and manage all recording sessions',
}

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
