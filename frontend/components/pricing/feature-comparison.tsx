"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X } from "lucide-react"

const features = [
  { category: "Core Features", items: [
    { name: "Sessions per year", free: "500", pro: "Unlimited", enterprise: "Unlimited" },
    { name: "AI Processing", free: "Basic", pro: "Advanced", enterprise: "Advanced+" },
    { name: "SOAP Note Generation", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { name: "Speaker Diarization", free: "Yes", pro: "Yes", enterprise: "Yes" },
  ]},
  { category: "Patient Management", items: [
    { name: "Patient Profiles", free: "Up to 10", pro: "Unlimited", enterprise: "Unlimited" },
    { name: "Visit History", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { name: "Custom Fields", free: false, pro: "Yes", enterprise: "Yes" },
  ]},
  { category: "Search & Analytics", items: [
    { name: "Semantic Search", free: false, pro: "Yes", enterprise: "Yes" },
    { name: "Practice Analytics", free: false, pro: "Basic", enterprise: "Advanced" },
    { name: "Custom Reports", free: false, pro: false, enterprise: "Yes" },
  ]},
  { category: "Collaboration", items: [
    { name: "Team Members", free: false, pro: "Up to 5", enterprise: "Unlimited" },
    { name: "Role-Based Access", free: false, pro: "Yes", enterprise: "Yes" },
    { name: "Audit Logging", free: false, pro: "Yes", enterprise: "Yes" },
  ]},
  { category: "Integrations & API", items: [
    { name: "EHR Integration", free: false, pro: "Coming soon", enterprise: "Yes" },
    { name: "API Access", free: false, pro: false, enterprise: "Yes" },
    { name: "Custom Integrations", free: false, pro: false, enterprise: "Yes" },
  ]},
  { category: "Support", items: [
    { name: "Email Support", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { name: "Priority Support", free: false, pro: "Yes", enterprise: "Yes" },
    { name: "Dedicated Account Manager", free: false, pro: false, enterprise: "Yes" },
    { name: "24/7 Phone Support", free: false, pro: false, enterprise: "Yes" },
  ]},
]

interface FeatureComparisonProps {
  isAnnual?: boolean
}

export function FeatureComparison({ isAnnual }: FeatureComparisonProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 dark:border-slate-700">
            <TableHead className="h-12 text-left font-semibold text-slate-900 dark:text-white w-48">
              Feature
            </TableHead>
            <TableHead className="h-12 text-center font-semibold text-slate-900 dark:text-white">
              Free
            </TableHead>
            <TableHead className="h-12 text-center font-semibold text-slate-900 dark:text-white">
              Pro
            </TableHead>
            <TableHead className="h-12 text-center font-semibold text-slate-900 dark:text-white">
              Enterprise
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.flatMap((category, categoryIndex) => [
            // Category Header
            <TableRow key={`category-${categoryIndex}`} className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <TableCell colSpan={4} className="font-semibold text-slate-900 dark:text-white py-3">
                {category.category}
              </TableCell>
            </TableRow>,
            // Feature Items
            ...category.items.map((item, itemIndex) => (
              <TableRow key={`${categoryIndex}-item-${itemIndex}`} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <TableCell className="text-sm text-slate-600 dark:text-slate-300 font-medium py-4">
                  {item.name}
                </TableCell>
                <TableCell className="text-center py-4">
                  {typeof item.free === 'boolean' ? (
                    item.free ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.free}</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-4">
                  {typeof item.pro === 'boolean' ? (
                    item.pro ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.pro}</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-4">
                  {typeof item.enterprise === 'boolean' ? (
                    item.enterprise ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.enterprise}</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ])}
        </TableBody>
      </Table>
    </div>
  )
}
