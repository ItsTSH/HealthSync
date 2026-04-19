"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";

type LoginForm = {
  email: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { session, loading: authLoading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && session) {
      router.push(redirect);
    }
  }, [session, authLoading, redirect, router]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (data: LoginForm) => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError("Failed to send login link");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We've sent a login link to your email address. Click the link to complete your signin.
          </p>
          <Button
            onClick={() => setEmailSent(false)}
            variant="outline"
            className="w-full"
          >
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your HealthSync account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={!!loading}
              variant="outline"
              className="w-full h-10"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.91 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit(handleEmailLogin)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" disabled={!!loading} className="w-full">
              {loading ? "Sending link..." : "Sign in with Email Link"}
            </Button>
          </form>

          {/* Footer */}
          {/* <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-primary hover:underline font-semibold">
              Sign up
            </a>
          </p> */}
        </div>
      </div>

      {/* Right side - Image (Optional) */}
      <div className="hidden lg:block w-1/2 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">HealthSync</h2>
            <p className="text-lg text-muted-foreground">Medical Documentation Made Simple</p>
          </div>
        </div>
      </div>
    </div>
  );
}
