import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect") || "/dashboard";

    console.log('[auth/callback] Received code:', code ? 'yes' : 'no');
    console.log('[auth/callback] Redirect target:', redirect);

    if (!code) {
      console.log('[auth/callback] No code provided, redirecting to login');
      return NextResponse.redirect(new URL("/login?error=no_code", request.url));
    }

    const supabase = await createClient();
    console.log('[auth/callback] Exchanging code for session...');
    
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Auth error:', error.message);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
    }

    if (!data?.user) {
      console.error('[auth/callback] No user data returned');
      return NextResponse.redirect(new URL("/login?error=no_user", request.url));
    }

    console.log('[auth/callback] Auth successful, user:', data.user.email);

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[auth/callback] Profile check error:', profileError.message);
    }

    // If no profile exists, redirect to complete profile
    if (!profile) {
      console.log('[auth/callback] No profile found, redirecting to complete-profile');
      return NextResponse.redirect(
        new URL(`/auth/complete-profile?redirect=${encodeURIComponent(redirect)}`, request.url)
      );
    }

    console.log('[auth/callback] Profile found, redirecting to:', redirect);
    return NextResponse.redirect(new URL(redirect, request.url));
  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
