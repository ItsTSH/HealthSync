"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"

export function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 -z-10" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-teal-100/30 dark:bg-teal-900/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Content */}
        <div className="text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            AI-Powered Medical Documentation
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            Medical Documentation,
            <span className="text-teal-600 dark:text-teal-400"> Reimagined</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mt-6 leading-relaxed max-w-2xl mx-auto lg:mx-0">
            AI-powered clinical notes that write themselves. Focus on your patients while HealthSync handles the documentation. HIPAA-compliant and trusted by healthcare providers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start">
            <Button
              size="lg"
              className="rounded-full px-8 h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl"
              onClick={() => router.push('/login')}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-12 text-base font-semibold border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>HIPAA Compliant</span>
            </div>
            <div className="hidden sm:block text-slate-300 dark:text-slate-600">|</div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>500 Sessions Free</span>
            </div>
            <div className="hidden sm:block text-slate-300 dark:text-slate-600">|</div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No Credit Card Required</span>
            </div>
          </div>
        </div>

        {/* Right: Hero Visual */}
        <div className="relative">
          <div className="relative z-10">
            {/* Main card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1" />
                <span className="text-xs text-slate-400">HealthSync AI</span>
              </div>

              {/* Mock transcript */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-semibold">
                    Dr
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Can you describe your symptoms?
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    Pt
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      I've been having persistent headaches for the past week, mainly in the frontal region...
                    </p>
                  </div>
                </div>

                {/* AI Processing indicator */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-600">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI generating clinical notes...</span>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 animate-float">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Note Complete</p>
                  <p className="text-xs text-slate-500">Just now</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">SOAP Format</p>
                  <p className="text-xs text-slate-500">Auto-generated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-blue-500/10 dark:from-teal-500/5 dark:to-blue-500/5 rounded-3xl transform rotate-3 scale-105 -z-10" />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}
