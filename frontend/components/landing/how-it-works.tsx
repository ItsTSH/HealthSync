"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Mic, Brain, FileCheck } from "lucide-react"

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Record Your Session",
    description: "Start recording your patient consultation with a single click. Our AI captures the entire conversation with speaker identification.",
    tips: ["Works with any microphone", "Background noise filtering", "Multi-language support"]
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Processing",
    description: "Our advanced AI transcribes the conversation, extracts key medical information, and structures it into SOAP format.",
    tips: ["Real-time transcription", "Medical terminology recognition", "PII auto-detection"]
  },
  {
    icon: FileCheck,
    step: "03",
    title: "Review & Export",
    description: "Review the generated notes, make any necessary edits, and export to your EHR or download as PDF.",
    tips: ["One-click edits", "EHR integration ready", "Multiple export formats"]
  }
]

export function HowItWorksSection() {
  return (
    <section className="py-24 px-4 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium mb-4">
            How It Works
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            From conversation to
            <span className="text-teal-400"> clinical notes in minutes</span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">
            Three simple steps to transform your documentation workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-teal-500/50 to-transparent -translate-x-8 z-0" />
              )}

              <Card className="relative z-10 bg-slate-800/50 border-slate-700 hover:border-teal-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10">
                <CardContent className="p-8">
                  {/* Step number */}
                  <div className="text-6xl font-bold text-slate-700 dark:text-slate-600 mb-4">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6">
                    <step.icon className="w-8 h-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-300 leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Tips */}
                  <ul className="space-y-2">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-300 mb-6">
            Ready to streamline your documentation?
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-sm">
            <svg className="w-5 h-5 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No setup required - Start in seconds</span>
          </div>
        </div>
      </div>
    </section>
  )
}
