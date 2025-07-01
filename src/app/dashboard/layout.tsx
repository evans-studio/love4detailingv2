'use client';

import React from 'react';
import { useRequireAuth } from '@/lib/api/auth';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-off-white">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <DashboardSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 