import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HealthSync | Pricing',
  description: 'View our pricing plans',
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
