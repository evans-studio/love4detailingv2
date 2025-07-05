'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';
import { BookOpen, Settings, Users, Clock } from 'lucide-react';
import { checkAdminAccess } from '@/lib/auth/admin';
import { LoadingState } from '@/components/ui/LoadingState';

const navigation = [
  {
    name: 'Bookings',
    href: ROUTES.ADMIN_BOOKINGS,
    icon: BookOpen,
  },
  {
    name: 'Users',
    href: ROUTES.ADMIN_USERS,
    icon: Users,
  },
  {
    name: 'Time Slots',
    href: '/admin/time-slots',
    icon: Clock,
  },
  {
    name: 'Settings',
    href: ROUTES.ADMIN_SETTINGS,
    icon: Settings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const hasAccess = await checkAdminAccess();
        setIsAdmin(hasAccess);
        
        if (!hasAccess) {
          // Redirect to sign-in if not admin
          router.replace('/auth/sign-in?message=Admin access required');
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        setIsAdmin(false);
        router.replace('/auth/sign-in?message=Admin access required');
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState>Verifying admin access...</LoadingState>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-off-white">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <aside className="w-64 border-r bg-white">
          <nav className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h1 className="text-xl font-semibold text-primary-600">Admin Portal</h1>
            </div>
            <div className="space-y-1 p-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      pathname === item.href
                        ? 'bg-primary-50 text-primary-500'
                        : 'text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 