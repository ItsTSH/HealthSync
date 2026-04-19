"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthContext"
import { LandingNavbar } from "@/components/landing/landing-navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works"
import { TestimonialsSection } from "@/components/landing/testimonials"
import { PricingPreviewSection } from "@/components/landing/pricing-preview"
import { CtaBanner } from "@/components/landing/cta-banner"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && session) {
      // Redirect authenticated users to dashboard
      router.push("/dashboard")
    }
  }, [session, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render landing page if user is authenticated (redirecting to dashboard)
  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingPreviewSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
