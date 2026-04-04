"use client"

import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { PatientProvider } from "@/components/patients/PatientContext"
import { SidebarProvider } from "@/components/animate-ui/components/radix/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Navbar } from "@/components/Navbar"
import { AuthProvider } from "@/components/auth/AuthContext"

interface ProvidersProps {
  children: React.ReactNode
  defaultOpen: boolean
}

export function Providers({ children, defaultOpen }: ProvidersProps) {
  const pathname = usePathname()
  
  // Hide sidebar and navbar for auth pages
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/auth/') || pathname === '/signup'

  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <PatientProvider>
          {isAuthPage ? (
            // Auth pages layout - no sidebar or navbar
            <div className="w-full bg-background">
              <div className="px-4">{children}</div>
            </div>
          ) : (
            // App pages layout - with sidebar and navbar
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar />
              <main className="w-full bg-background rounded-2xl drop-shadow-xl border border-border pl-4">
                <Navbar />
                <div className="px-4">{children}</div>
              </main>
            </SidebarProvider>
          )}
        </PatientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
