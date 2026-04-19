'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ChatContainer } from '@/components/chat';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

export default function ChatDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  
  const chatId = params?.chat_id as string;
  const patientId = searchParams?.get('patient_id') as string;

  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  if (!chatId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Invalid chat ID</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChatContainer
        chatId={chatId}
        patientId={patientId}
        onError={(error) => console.error('Chat error:', error)}
      />
    </div>
  );
}
