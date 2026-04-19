"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export function CtaBanner() {
  const router = useRouter()

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800" />

      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
          Ready to transform your practice?
        </h2>
        <p className="text-xl text-teal-100 mb-10 max-w-2xl mx-auto">
          Join thousands of healthcare providers who are saving time and delivering better care with HealthSync.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="rounded-full px-8 h-12 text-base font-semibold bg-white text-teal-600 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all"
            onClick={() => router.push('/login')}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 h-12 text-base font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-all"
            onClick={() => router.push('/pricing')}
          >
            View Pricing
          </Button>
        </div>
        <p className="text-sm text-teal-100/80 mt-6">
          500 sessions free · No credit card required · HIPAA compliant
        </p>
      </div>
    </section>
  )
}
