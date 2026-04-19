"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthContext"
import { createClient } from "@/lib/supabase-browser"
import { AlertCircle, CheckCircle } from "lucide-react"

export function AccountSection() {
  const { session } = useAuth()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    username: ""
  })
  const [joinDate, setJoinDate] = useState<string | null>(null)

  // Fetch user profile
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setError(null)
        // Get auth user email
        const userEmail = session.user.email || ""

        // Get profile data
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          setFormData(prev => ({ ...prev, email: userEmail }))
        } else if (data) {
          setFormData({
            email: userEmail || data.email || "",
            full_name: data.full_name || "",
            username: data.username || ""
          })
          setJoinDate(data.created_at)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session?.user?.id, supabase, session?.user?.email])

  const handleSave = async () => {
    if (!session?.user?.id) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setIsEditing(false)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError('Failed to save changes')
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Recently'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-slate-600 dark:text-slate-400">Loading profile...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-400">Changes saved successfully</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{getInitials(formData.full_name)}</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {formData.full_name || 'Healthcare Professional'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Member since {formatDate(joinDate)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={saving}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-2 bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This is your login email (cannot be changed here)
              </p>
            </div>

            <div>
              <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Plan</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Professional</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Member Since</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatDate(joinDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/30">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/30">
            <p className="text-sm text-red-800 dark:text-red-400 mb-4">
              Deleting your account is permanent and cannot be undone. All your data will be deleted.
            </p>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
