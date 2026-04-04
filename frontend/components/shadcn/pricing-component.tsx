'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Check } from 'lucide-react'

type PricingPlan = {
  id: string
  title: string
  description: string
  monthly: number
  annual: number
  features: string[]
  highlighted?: boolean
}[]

const PricingCards = ({ pricingData }: { pricingData: PricingPlan }) => {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section className='bg-muted py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:space-y-24 lg:px-8'>
        <div className='flex flex-col items-center gap-10 text-center'>
          <div className='flex flex-col items-center gap-4'>
            <h2 className='text-2xl font-semibold sm:text-3xl lg:text-4xl'>Select the Best Plan for You!</h2>
            <p className='text-muted-foreground text-xl'>
              Discover Our Flexible Plans, Compare Features, and Choose <br />
              the Ideal Option for Your Needs.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <span className='font-medium'>Monthly</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className='font-medium'>Annually</span>
          </div>
        </div>
        <div className='flex items-center justify-center gap-6 max-lg:flex-col'>
          {pricingData.map(plan => {
            const price = isAnnual ? plan.annual : plan.monthly
            const period = isAnnual ? 'year' : 'month'
            const savings = isAnnual ? plan.monthly * 12 - plan.annual : null

            return (
              <Card key={plan.id} className={`w-full shadow-none sm:w-lg ${plan.highlighted ? 'border-primary border-2' : ''}`}>
                <CardContent className='flex flex-col gap-6 pt-6'>
                  <div className='flex flex-col gap-2'>
                    <h3 className='text-3xl font-semibold'>{plan.title}</h3>
                    <p className='text-muted-foreground text-base'>{plan.description}</p>
                  </div>

                  <div className='flex flex-col items-start'>
                    <div className='flex items-end'>
                      <span className='text-primary text-5xl font-bold'>${price}</span>
                      <span className='text-muted-foreground ml-1 text-lg'>/{period}</span>
                    </div>
                    {savings && (
                      <span className='mt-1 text-sm font-medium text-green-600'>
                        Save ${savings.toLocaleString()}/year
                      </span>
                    )}
                  </div>

                  <div className='flex flex-col gap-3'>
                    <h4 className='font-semibold text-sm'>Features:</h4>
                    <ul className='space-y-2'>
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Check className='w-4 h-4 text-green-600 flex-shrink-0' />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className='w-full mt-4'>
                    {plan.highlighted ? 'Get Started' : 'Choose Plan'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default PricingCards
