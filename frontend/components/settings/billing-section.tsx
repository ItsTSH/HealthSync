"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Check, CreditCard, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export function BillingSection() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Professional Plan · Renews on May 15, 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Monthly Cost</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">$20<span className="text-lg text-slate-600 dark:text-slate-400">/month</span></p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Next Billing Date</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">May 15, 2026</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {[
              "Unlimited sessions",
              "Advanced AI processing",
              "Team collaboration (up to 5)",
              "Priority support"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/pricing')}
            >
              View All Plans
            </Button>
            <Button className="bg-red-600 hover:bg-red-700">
              Downgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sessions Used</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">342 / Unlimited</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full" style={{ width: "35%" }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>How we charge you</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <CreditCard className="w-8 h-8 text-slate-400" />
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">Visa ending in 4242</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Expires 12/28</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "April 15, 2026", amount: "$20.00", status: "Paid" },
                  { date: "March 15, 2026", amount: "$20.00", status: "Paid" },
                  { date: "February 15, 2026", amount: "$20.00", status: "Paid" }
                ].map((invoice, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{invoice.date}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{invoice.amount}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <Check className="w-3 h-3" />
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
