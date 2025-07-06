'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';
import { BookOpen, Settings, Users, Clock, BarChart3, TrendingUp, LogOut } from 'lucide-react';
import { checkAdminAccess } from '@/lib/auth/admin';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const navigation = [
  {
    name: 'Overview',
    href: ROUTES.ADMIN,
    icon: BarChart3,
  },
  {
    name: 'Bookings',
    href: ROUTES.ADMIN_BOOKINGS,
    icon: BookOpen,
  },
  {
    name: 'Availability',
    href: ROUTES.ADMIN_AVAILABILITY,
    icon: Clock,
  },
  {
    name: 'Customers',
    href: ROUTES.ADMIN_CUSTOMERS,
    icon: Users,
  },
  {
    name: 'Analytics',
    href: ROUTES.ADMIN_ANALYTICS,
    icon: TrendingUp,
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
  const supabase = createClientComponentClient();

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(ROUTES.SIGN_IN);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <LoadingState>Verifying admin access...</LoadingState>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#BA0C2F] mb-2">Access Denied</h1>
          <p className="text-[#C7C7C7]">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#141414]">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <aside className="w-64 border-r border-gray-800 bg-[#1E1E1E]">
          <nav className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
              <h1 className="text-xl font-semibold text-[#F2F2F2]">Admin Portal</h1>
            </div>
            <div className="flex-1 space-y-1 p-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-[#262626] text-[#9146FF]'
                        : 'text-[#C7C7C7] hover:bg-[#262626]'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            <div className="p-2 border-t border-gray-800">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-400 hover:bg-[#262626] hover:text-red-300"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
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