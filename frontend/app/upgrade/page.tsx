'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpgradePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new pricing page
    router.push('/pricing')
  }, [router])

  return null
}
