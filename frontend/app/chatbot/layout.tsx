/**
 * Chatbot Layout
 * 
 * Provides full-height layout with sidebar and content inset
 */

'use client';

import { SidebarInset } from '@/components/animate-ui/components/radix/sidebar';

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarInset className="h-screen flex flex-col">
      {children}
    </SidebarInset>
  );
}
