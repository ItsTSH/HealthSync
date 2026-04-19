"use client"

import { useState } from "react"
import { LandingNavbar } from "@/components/landing/landing-navbar"
import { Footer } from "@/components/landing/footer"
import { CtaBanner } from "@/components/landing/cta-banner"
import { PricingToggle } from "@/components/pricing/pricing-toggle"
import { PricingCard } from "@/components/pricing/pricing-card"
import { FeatureComparison } from "@/components/pricing/feature-comparison"
import { PricingFAQ } from "@/components/pricing/pricing-faq"

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
      "Basic analytics",
      "30-day data retention"
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
      "Semantic search",
      "Priority email & chat support",
      "Advanced analytics & reports",
      "Custom SOAP templates",
      "Team collaboration (up to 5 members)",
      "Unlimited data retention",
      "EHR integration ready"
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
      "Advanced security features",
      "API access",
      "Single sign-on (SSO)",
      "Custom deployment options",
      "Unlimited team members",
      "Advanced compliance reporting",
      "Priority feature requests"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-6">
            Pricing Plans
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
            Simple, transparent
            <span className="text-teal-600 dark:text-teal-400"> pricing</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
            Choose the plan that fits your practice. Start with our free tier — no credit card required.
          </p>

          {/* Toggle */}
          <PricingToggle isAnnual={isAnnual} onChange={setIsAnnual} />
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} isAnnual={isAnnual} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Detailed Feature Comparison
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 overflow-x-auto">
            <FeatureComparison isAnnual={isAnnual} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Everything you need to know about our pricing
            </p>
          </div>

          <PricingFAQ />
        </div>
      </section>

      {/* CTA Banner */}
      <CtaBanner />

      {/* Footer */}
      <Footer />
    </div>
  )
}
