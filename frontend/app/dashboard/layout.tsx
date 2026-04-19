import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Dashboard',
  description: 'Dashboard overview and quick actions',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
