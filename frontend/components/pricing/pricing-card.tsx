"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface PricingCardProps {
  plan: {
    id: string
    title: string
    description: string
    monthly: number
    annual: number
    features: string[]
    cta: string
    highlighted: boolean
  }
  isAnnual: boolean
}

export function PricingCard({ plan, isAnnual }: PricingCardProps) {
  const router = useRouter()
  const price = isAnnual ? Math.round(plan.annual / 12) : plan.monthly
  const savings = plan.monthly * 12 - plan.annual

  return (
    <Card className={`relative flex flex-col p-8 rounded-2xl transition-all duration-300 ${
      plan.highlighted
        ? 'border-teal-500 shadow-xl scale-105 z-10 bg-white dark:bg-slate-800'
        : 'border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 hover:shadow-lg'
    }`}>
      {/* Popular Badge */}
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1.5 rounded-full bg-teal-500 text-white text-sm font-semibold whitespace-nowrap shadow-lg">
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
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-5xl font-bold text-slate-900 dark:text-white">
              ${price}
            </span>
            <span className="text-slate-500 dark:text-slate-400">/month</span>
          </div>
          {isAnnual && (
            <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 w-fit mx-auto">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414L10 3.586l4.707 4.707a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                Save ${savings}/year
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
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
              ? 'bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl text-white'
              : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
          }`}
          onClick={() => router.push('/login')}
        >
          {plan.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}
