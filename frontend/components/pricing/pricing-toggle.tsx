"use client"

import { Button } from "@/components/ui/button"

interface PricingToggleProps {
  isAnnual: boolean
  onChange: (isAnnual: boolean) => void
}

export function PricingToggle({ isAnnual, onChange }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className={`text-sm font-medium transition-colors ${
        !isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
      }`}>
        Monthly
      </span>

      <button
        onClick={() => onChange(!isAnnual)}
        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
          isAnnual ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
            isAnnual ? 'translate-x-10' : 'translate-x-1'
          }`}
        />
      </button>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium transition-colors ${
          isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
        }`}>
          Annual
        </span>
        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
          Save 20%
        </span>
      </div>
    </div>
  )
}
