"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "Can I switch plans anytime?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle."
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes, we offer a 20% discount when you choose annual billing. That's equivalent to saving 2.4 months of subscription costs per year."
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data is yours. If you cancel, we'll provide you with a full export of your notes and patient data in standard formats (PDF, CSV, JSON)."
  },
  {
    question: "Is there a free tier or trial?",
    answer: "Yes! We offer a free tier with 500 sessions per year. No credit card required to get started. Upgrade to Pro anytime for unlimited sessions."
  },
  {
    question: "Do you provide API access for integrations?",
    answer: "API access is available on our Enterprise plan. For other plans, contact our sales team to discuss custom integration options."
  },
  {
    question: "What's included in 'Advanced AI Processing'?",
    answer: "Advanced AI Processing includes more accurate medical terminology recognition, improved speaker diarization, and priority processing for your sessions."
  },
  {
    question: "Can I have multiple users on one account?",
    answer: "Yes! Pro plans support up to 5 team members, and Enterprise plans support unlimited team members with customizable permissions."
  },
  {
    question: "What security measures do you have in place?",
    answer: "We're HIPAA-compliant, SOC 2 certified, and use end-to-end encryption for all patient data. All data is encrypted at rest and in transit."
  }
]

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl">
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-600"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-left font-semibold text-slate-900 dark:text-white">
                {faq.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4 ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {openIndex === index && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
