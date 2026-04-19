import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Patient Details',
  description: 'View patient details and records',
}

export default function PatientDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
