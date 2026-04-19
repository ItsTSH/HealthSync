"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "HealthSync has transformed how I document patient visits. I'm saving at least 2 hours every day and can focus more on my patients.",
    author: "Dr. Sarah Chen",
    role: "Family Medicine Physician",
    location: "Boston, MA",
    rating: 5,
    avatar: "SC"
  },
  {
    quote: "The AI accuracy is impressive. It correctly captures medical terminology and the SOAP notes are ready to use with minimal editing.",
    author: "Dr. Michael Rodriguez",
    role: "Internal Medicine",
    location: "San Francisco, CA",
    rating: 5,
    avatar: "MR"
  },
  {
    quote: "Finally, a solution that understands the nuances of medical conversations. The speaker diarization works flawlessly.",
    author: "Dr. Emily Watson",
    role: "Pediatrician",
    location: "Chicago, IL",
    rating: 5,
    avatar: "EW"
  }
]

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 bg-slate-50 dark:bg-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
            Trusted by
            <span className="text-teal-600 dark:text-teal-400"> healthcare providers</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            See what doctors are saying about HealthSync.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow duration-300"
            >
              <CardContent className="p-8">
                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-teal-500 text-teal-500" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 text-lg">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "10,000+", label: "Active Users" },
            { value: "500K+", label: "Notes Generated" },
            { value: "2M+", label: "Hours Saved" },
            { value: "99.9%", label: "Uptime SLA" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">
                {stat.value}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
