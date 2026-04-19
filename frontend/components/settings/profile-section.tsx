"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthContext"
import { createClient } from "@/lib/supabase-browser"
import { AlertCircle, CheckCircle } from "lucide-react"

export function ProfileSection() {
  const { session } = useAuth()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    specialty: "",
    license_number: "",
    bio: "",
    location: "",
    phone: ""
  })
  const [isPublic, setIsPublic] = useState(false)

  // Fetch profile data
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setError(null)
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else if (data) {
          setFormData({
            specialty: data.specialty || "",
            license_number: data.license_number || "",
            bio: data.bio || "",
            location: data.location || "",
            phone: data.phone || ""
          })
          setIsPublic(data.public_profile || false)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session?.user?.id, supabase])

  const handleSave = async () => {
    if (!session?.user?.id) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          specialty: formData.specialty,
          license_number: formData.license_number,
          bio: formData.bio,
          location: formData.location,
          phone: formData.phone,
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

  const handleTogglePublic = async () => {
    if (!session?.user?.id) return

    try {
      setError(null)
      const { error } = await supabase
        .from('user_profiles')
        .update({
          public_profile: !isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (error) {
        setError(error.message)
      } else {
        setIsPublic(!isPublic)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to update visibility')
    }
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

      {/* Professional Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Your professional details and credentials</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={saving}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialty" className="text-slate-700 dark:text-slate-300">
                Specialty
              </Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Family Medicine"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="license" className="text-slate-700 dark:text-slate-300">
                License Number
              </Label>
              <Input
                id="license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., MD123456"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-slate-700 dark:text-slate-300">
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Boston, MA"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., (555) 123-4567"
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-slate-700 dark:text-slate-300">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setFormData({ ...formData, bio: e.target.value })
                }
              }}
              disabled={!isEditing}
              placeholder="Tell us about yourself..."
              className="mt-2 min-h-24"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
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

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Visibility</CardTitle>
          <CardDescription>Control who can see your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Public Profile</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Your profile is visible to other healthcare providers</p>
              </div>
              <button
                onClick={handleTogglePublic}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
