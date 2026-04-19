"use client"

import { useState } from "react"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"
import { AccountSection } from "@/components/settings/account-section"
import { ProfileSection } from "@/components/settings/profile-section"
import { NotificationsSection } from "@/components/settings/notifications-section"
import { SecuritySection } from "@/components/settings/security-section"
import { BillingSection } from "@/components/settings/billing-section"
import { PreferencesSection } from "@/components/settings/preferences-section"

const renderSection = (section: string) => {
  switch (section) {
    case "account":
      return <AccountSection />
    case "profile":
      return <ProfileSection />
    case "notifications":
      return <NotificationsSection />
    case "security":
      return <SecuritySection />
    case "billing":
      return <BillingSection />
    case "preferences":
      return <PreferencesSection />
    default:
      return <AccountSection />
  }
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account")

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Manage your account, preferences, and billing
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <SettingsSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {renderSection(activeSection)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
