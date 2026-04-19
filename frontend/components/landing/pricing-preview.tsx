"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

const plans = [
  {
    id: "free",
    title: "Free",
    description: "Perfect for getting started",
    monthly: 0,
    annual: 0,
    features: [
      "Up to 500 sessions/year",
      "Basic AI processing",
      "Patient management (up to 10)",
      "Email support",
      "Basic analytics"
    ],
    cta: "Get Started",
    highlighted: false
  },
  {
    id: "professional",
    title: "Pro",
    description: "Best for growing practices",
    monthly: 20,
    annual: 200,
    features: [
      "Unlimited sessions",
      "Advanced AI processing",
      "Unlimited patient profiles",
      "Priority support",
      "Advanced analytics & reports",
      "Custom SOAP templates",
      "Team collaboration"
    ],
    cta: "Get Started",
    highlighted: true
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description: "For large organizations",
    monthly: 100,
    annual: 1000,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "24/7 phone support",
      "API access",
      "On-premise deployment option"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
]

export function PricingPreviewSection() {
  const router = useRouter()

  return (
    <section className="py-24 px-4 bg-slate-100 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
            Pricing
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
            Simple, transparent
            <span className="text-teal-600 dark:text-teal-400"> pricing</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            Choose the plan that fits your practice. Start with our free tier — no credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col border transition-all duration-300 ${
                plan.highlighted
                  ? 'border-teal-500 shadow-xl scale-105 bg-white dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800'
              }`}
            >
              {/* Popular Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-teal-500 text-white text-sm font-medium whitespace-nowrap">
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  {plan.title}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-slate-900 dark:text-white">
                      ${plan.monthly}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    or ${plan.annual}/year (save ${(plan.monthly * 12 - plan.annual).toLocaleString()})
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full h-12 rounded-full text-base font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                  }`}
                  onClick={() => router.push('/login')}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All Plans CTA */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 text-base font-semibold border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => router.push('/pricing')}
          >
            View All Plans & Features
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  )
}
