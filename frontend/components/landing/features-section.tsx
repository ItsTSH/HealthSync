"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mic,
  FileText,
  Brain,
  Shield,
  Clock,
  Search,
  Users,
  BarChart3
} from "lucide-react"

const features = [
  {
    icon: Mic,
    title: "Voice-to-Text Transcription",
    description: "Real-time audio transcription with speaker diarization. Capture doctor-patient conversations accurately.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    icon: FileText,
    title: "SOAP Note Generation",
    description: "Automatically structure transcripts into professional SOAP format clinical notes ready for review.",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-100 dark:bg-teal-900/30"
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Advanced NLP extracts symptoms, medications, allergies, and treatment plans from conversations.",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30"
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Enterprise-grade security with end-to-end encryption. Your patient data is always protected.",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30"
  },
  {
    icon: Clock,
    title: "Save 2+ Hours Daily",
    description: "Reduce documentation time by 70%. Spend more time with patients and less time typing.",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30"
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Find any patient note instantly with AI-powered semantic search across your entire practice.",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-100 dark:bg-pink-900/30"
  },
  {
    icon: Users,
    title: "Patient Management",
    description: "Organize notes by patient with comprehensive profiles and visit history tracking.",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30"
  },
  {
    icon: BarChart3,
    title: "Practice Analytics",
    description: "Gain insights into your practice with detailed analytics and productivity metrics.",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30"
  }
]

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
            Features
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
            Everything you need for
            <span className="text-teal-600 dark:text-teal-400"> efficient documentation</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            HealthSync combines cutting-edge AI with intuitive design to streamline your clinical workflow.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-slate-800"
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-teal-600 dark:text-teal-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
