"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/AuthContext"
import { createClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { LogOut, Bell, Lock, User as UserIcon, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

type ProfileForm = {
  username: string
  profession: string
  full_name: string
}

type NotificationSettings = {
  email_notifications: boolean
  appointment_reminders: boolean
  session_summaries: boolean
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { session, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileForm>()
  
  const defaultTab = searchParams.get('tab') || 'account'
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    appointment_reminders: true,
    session_summaries: true
  })

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/login')
      return
    }

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (data) {
          setProfile(data)
          reset({
            username: data.username,
            profession: data.profession,
            full_name: data.full_name || ''
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session?.user?.id, supabase, reset, router])

  const handleProfileUpdate = async (data: ProfileForm) => {
    setUpdating(true)
    setError("")
    setSuccess("")

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: data.username,
          profession: data.profession,
          full_name: data.full_name || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', session?.user?.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess("Profile updated successfully!")
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update profile")
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    setSuccess("Notification preferences updated!")
    setTimeout(() => setSuccess(""), 3000)
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account preferences and settings
        </p>
      </div>

      {success && (
        <Alert className="mb-6 border-green-600 bg-green-50 text-green-900 shadow-md">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6 border-border shadow-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={defaultTab} className="w-full border-border shadow-md rounded-lg">
        <TabsList className="mb-6 border-b-border bg-transparent w-full justify-start rounded-md p-0">
          <TabsTrigger value="account" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <UserIcon className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-border shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      {...register("username", {
                        required: "Username is required"
                      })}
                      className="mt-1"
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="profession">Profession/Specialty</Label>
                    <Input
                      id="profession"
                      placeholder="Enter your profession"
                      {...register("profession", {
                        required: "Profession is required"
                      })}
                      className="mt-1"
                    />
                    {errors.profession && (
                      <p className="text-sm text-destructive mt-1">{errors.profession.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    {...register("full_name")}
                    className="mt-1"
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={updating}>
                    {updating ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Your account email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {session?.user?.email}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                To change your email address, please sign out and create a new account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg border-border shadow-md">
                <div>
                  <h4 className="font-semibold">Email Notifications</h4>
                  <p className="text-sm text-muted-foreground">Receive general email notifications</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('email_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.email_notifications ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg border-border shadow-md">
                <div>
                  <h4 className="font-semibold">Appointment Reminders</h4>
                  <p className="text-sm text-muted-foreground">Get reminders for upcoming appointments</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('appointment_reminders')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.appointment_reminders ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.appointment_reminders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg border-border shadow-md">
                <div>
                  <h4 className="font-semibold">Session Summaries</h4>
                  <p className="text-sm text-muted-foreground">Receive summaries of your sessions</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('session_summaries')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.session_summaries ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.session_summaries ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md rounded-lg">
            <CardHeader>
              <CardTitle>Sign Out</CardTitle>
              <CardDescription>Sign out from your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                You will be logged out from all devices after signing out.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
