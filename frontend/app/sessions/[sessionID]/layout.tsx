import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Session Details',
  description: 'View session details and notes',
}

export default function SessionDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
