"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export function PreferencesSection() {
  const [preferences, setPreferences] = useState({
    theme: "system",
    language: "en",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h"
  })

  const handleChange = (key: string, value: string) => {
    setPreferences({ ...preferences, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how HealthSync looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-slate-700 dark:text-slate-300 mb-4 block">Theme</Label>
            <div className="space-y-3">
              {[
                { value: "light", label: "Light", description: "Light theme" },
                { value: "dark", label: "Dark", description: "Dark theme" },
                { value: "system", label: "System", description: "Automatically match your device settings" }
              ].map((option) => (
                <label key={option.value} className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={preferences.theme === option.value}
                    onChange={(e) => handleChange("theme", e.target.value)}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span className="ml-3">
                    <p className="font-medium text-slate-900 dark:text-white">{option.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language & Localization */}
      <Card>
        <CardHeader>
          <CardTitle>Language & Localization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language" className="text-slate-700 dark:text-slate-300 block mb-2">
              Language
            </Label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => handleChange("language", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <Label htmlFor="timezone" className="text-slate-700 dark:text-slate-300 block mb-2">
              Timezone
            </Label>
            <select
              id="timezone"
              value={preferences.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <Label htmlFor="date-format" className="text-slate-700 dark:text-slate-300 block mb-2">
              Date Format
            </Label>
            <select
              id="date-format"
              value={preferences.dateFormat}
              onChange={(e) => handleChange("dateFormat", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <Label htmlFor="time-format" className="text-slate-700 dark:text-slate-300 block mb-2">
              Time Format
            </Label>
            <select
              id="time-format"
              value={preferences.timeFormat}
              onChange={(e) => handleChange("timeFormat", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
          <CardDescription>Settings to improve accessibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "reduced-motion", label: "Reduce Motion", description: "Minimize animations and transitions" },
            { id: "high-contrast", label: "High Contrast", description: "Use higher contrast colors" },
            { id: "large-text", label: "Larger Text", description: "Increase default text size" }
          ].map((setting) => (
            <div key={setting.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{setting.label}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{setting.description}</p>
              </div>
              <button className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-300 dark:bg-slate-600 transition-colors">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white transition-transform translate-x-1" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
