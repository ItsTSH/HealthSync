"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface NotificationPreference {
  id: string
  label: string
  description: string
  enabled: boolean
}

const notificationPreferences: NotificationPreference[] = [
  {
    id: "session-complete",
    label: "Session Processing Complete",
    description: "Get notified when your audio session is processed",
    enabled: true
  },
  {
    id: "daily-summary",
    label: "Daily Summary",
    description: "Receive a daily summary of your sessions and notes",
    enabled: true
  },
  {
    id: "team-activity",
    label: "Team Activity",
    description: "Be notified about team member activities",
    enabled: false
  },
  {
    id: "security-alerts",
    label: "Security Alerts",
    description: "Critical security notifications and unusual activity",
    enabled: true
  },
  {
    id: "feature-updates",
    label: "Feature Updates",
    description: "Learn about new features and improvements",
    enabled: true
  },
  {
    id: "marketing",
    label: "Marketing & Promotions",
    description: "Receive news, tips, and special offers",
    enabled: false
  }
]

export function NotificationsSection() {
  const [preferences, setPreferences] = useState(notificationPreferences)

  const togglePreference = (id: string) => {
    setPreferences(preferences.map(pref =>
      pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
    ))
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.map((pref, index) => (
            <div key={pref.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-slate-900 dark:text-white font-medium cursor-pointer">
                    {pref.label}
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {pref.description}
                  </p>
                </div>
                <button
                  onClick={() => togglePreference(pref.id)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                    pref.enabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      pref.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {index < preferences.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["Immediately", "Daily", "Weekly"].map((freq) => (
              <label key={freq} className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  value={freq}
                  defaultChecked={freq === "Immediately"}
                  className="w-4 h-4 text-teal-600"
                />
                <span className="ml-3 text-slate-900 dark:text-white font-medium">
                  {freq}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
