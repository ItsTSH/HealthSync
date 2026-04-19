import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Chatbot',
  description: 'Chat with HealthSync AI Assistant',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
