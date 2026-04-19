import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Sign In',
  description: 'Sign in to your HealthSync account',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
