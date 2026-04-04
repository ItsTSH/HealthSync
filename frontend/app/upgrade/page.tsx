import Pricing from '@/components/shadcn/pricing-component'

const pricingData = [
  {
    id: 'starter',
    title: 'Starter',
    description: 'Perfect for getting started',
    monthly: 29,
    annual: 290,
    features: [
      'Up to 50 sessions/month',
      'Basic AI processing',
      'Patient management',
      'Email support',
      'Dashboard analytics'
    ]
  },
  {
    id: 'professional',
    title: 'Professional',
    description: 'Best for growing practices',
    monthly: 79,
    annual: 790,
    highlighted: true,
    features: [
      'Unlimited sessions',
      'Advanced AI processing',
      'Advanced patient management',
      'Priority email & chat support',
      'Advanced analytics & reports',
      'Custom templates',
      'Team collaboration'
    ]
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    description: 'For large organizations',
    monthly: 199,
    annual: 1990,
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      '24/7 phone support',
      'Advanced security features',
      'API access',
      'On-premise deployment option'
    ]
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Upgrade to Pro</h1>
          <p className="text-lg text-muted-foreground">
            Unlock advanced features to streamline your medical documentation
          </p>
        </div>
        <Pricing pricingData={pricingData} />
      </div>
    </div>
  )
}
