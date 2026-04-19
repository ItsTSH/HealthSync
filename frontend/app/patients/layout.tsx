import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Patients',
  description: 'View and manage all patients',
}

export default function PatientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
