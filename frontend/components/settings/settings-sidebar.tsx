"use client"

import { useState } from "react"
import {
  User,
  UserCircle,
  Bell,
  Lock,
  CreditCard,
  Settings,
  LucideIcon
} from "lucide-react"

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

const navItems: NavItem[] = [
  {
    id: "account",
    label: "Account",
    icon: User,
    description: "Manage your account settings"
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserCircle,
    description: "Update your professional information"
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Manage notification preferences"
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    description: "Security and authentication"
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "Manage your subscription"
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: Settings,
    description: "Customize your experience"
  }
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-700 pr-8 py-8">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/30 border-l-2 border-teal-600'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-2 border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isActive
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {item.description}
                </p>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
