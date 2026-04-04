"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthContext";

type ProfileForm = {
  username: string;
  profession: string;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { session } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleCompleteProfile = async (data: ProfileForm) => {
    setLoading(true);
    setError("");
    
    try {
      if (!session?.user?.id) {
        setError("User not authenticated");
        return;
      }

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: session.user.id,
          username: data.username,
          profession: data.profession,
        });

      if (insertError) {
        if (insertError.message.includes('unique constraint')) {
          setError("Username already exists. Please choose a different one.");
        } else {
          setError(insertError.message);
        }
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-muted-foreground mt-2">Just a few more details to get started</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit(handleCompleteProfile)} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Dr. John Smith"
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  maxLength: {
                    value: 50,
                    message: "Username must be less than 50 characters",
                  },
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
                type="text"
                placeholder="Cardiologist"
                {...register("profession", {
                  required: "Profession is required",
                  minLength: {
                    value: 2,
                    message: "Profession must be at least 2 characters",
                  },
                })}
                className="mt-1"
              />
              {errors.profession && (
                <p className="text-sm text-destructive mt-1">{errors.profession.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating profile..." : "Complete Profile"}
            </Button>
          </form>
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
