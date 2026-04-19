"use client";

import { useAuth } from "./AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      // Redirect unauthenticated users to landing page
      router.push(`/?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [session, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
