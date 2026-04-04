"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthContext"

export default function Home() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (session) {
        // If user is authenticated, redirect to dashboard
        router.push("/dashboard")
      } else {
        // If user is not authenticated, redirect to login
        router.push("/login")
      }
    }
  }, [session, loading, router])

  // Show loading state while checking authentication
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-2">HealthSync</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
