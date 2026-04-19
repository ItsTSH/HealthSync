import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Appointments',
  description: 'View and manage your appointments',
}

export default function AppointmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
