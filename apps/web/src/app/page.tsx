'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  useEffect(() => {
    if (!apiClient.isAuthenticated() || !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (mustChangePassword) {
      router.push('/auth/change-password');
      return;
    }

    router.push('/dashboard');
  }, [isAuthenticated, mustChangePassword, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );
}