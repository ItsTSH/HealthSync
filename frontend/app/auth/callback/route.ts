import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // If no profile exists, redirect to complete profile
      if (!profile) {
        return NextResponse.redirect(
          new URL(`/auth/complete-profile?redirect=${encodeURIComponent(redirect)}`, request.url)
        );
      }

      return NextResponse.redirect(
        new URL(redirect, request.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}
