"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Check, Smartphone } from "lucide-react"
import { useState } from "react"

export function SecuritySection() {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)

  return (
    <div className="space-y-6">
      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password regularly to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(true)}
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-pwd" className="text-slate-700 dark:text-slate-300">
                  Current Password
                </Label>
                <Input
                  id="current-pwd"
                  type="password"
                  placeholder="Enter your current password"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="new-pwd" className="text-slate-700 dark:text-slate-300">
                  New Password
                </Label>
                <Input
                  id="new-pwd"
                  type="password"
                  placeholder="Enter your new password"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  At least 12 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <Label htmlFor="confirm-pwd" className="text-slate-700 dark:text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  placeholder="Confirm your new password"
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">2FA is not enabled</p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                  Protect your account with two-factor authentication
                </p>
              </div>
            </div>
          </div>

          {!show2FASetup ? (
            <Button
              onClick={() => setShow2FASetup(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Set Up 2FA
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-slate-900 dark:text-white mb-2">Step 1: Scan QR Code</p>
                <div className="w-48 h-48 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">QR Code here</p>
                </div>
              </div>

              <div>
                <p className="font-medium text-slate-900 dark:text-white mb-2">Step 2: Enter Verification Code</p>
                <Input
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShow2FASetup(false)}
                >
                  Cancel
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { device: "Chrome on Mac", location: "Boston, MA", lastActive: "Just now", isCurrent: true },
            { device: "Safari on iPhone", location: "Boston, MA", lastActive: "2 hours ago", isCurrent: false },
            { device: "Chrome on Windows", location: "New York, NY", lastActive: "1 day ago", isCurrent: false }
          ].map((session, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  {session.device}
                  {session.isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Current
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {session.location} · Last active: {session.lastActive}
                </p>
              </div>
              {!session.isCurrent && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  Sign Out
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Today at 2:30 PM", device: "Chrome on Mac", location: "Boston, MA", status: "Success" },
              { date: "Yesterday at 9:15 AM", device: "Safari on iPhone", location: "Boston, MA", status: "Success" },
              { date: "3 days ago at 4:45 PM", device: "Chrome on Windows", location: "New York, NY", status: "Success" }
            ].map((entry, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {entry.date}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {entry.device} · {entry.location}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <Check className="w-3 h-3" />
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
