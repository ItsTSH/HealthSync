import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Complete Profile',
  description: 'Complete your profile setup',
}

export default function CompleteProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
