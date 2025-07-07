'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants/routes';
import {
  Calendar,
  Car,
  CreditCard,
  Home,
  LogOut,
  Settings,
  Star,
  User,
  Shield,
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { checkAdminAccess } from '@/lib/auth/admin';

const navigation = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: Home,
  },
  {
    name: 'My Vehicles',
    href: ROUTES.DASHBOARD_VEHICLES,
    icon: Car,
  },
  {
    name: 'Loyalty Points',
    href: ROUTES.DASHBOARD_REWARDS,
    icon: Star,
  },
  {
    name: 'My Bookings',
    href: ROUTES.DASHBOARD_BOOKINGS,
    icon: Calendar,
  },
  {
    name: 'Profile',
    href: ROUTES.DASHBOARD_PROFILE,
    icon: User,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    setMounted(true);
    
    // Check admin access
    const checkAdmin = async () => {
      const hasAccess = await checkAdminAccess();
      setIsAdmin(hasAccess);
    };
    
    checkAdmin();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(ROUTES.SIGN_IN);
  };

  // During SSR and initial mount, render a simplified version
  if (!mounted) {
    return (
      <aside className="w-64 border-r border-gray-800 bg-[#1E1E1E]">
        <nav className="flex flex-col h-full">
          <div className="space-y-1 p-2">
            {navigation.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#C7C7C7]"
              >
                <div className="h-5 w-5 bg-[#262626] rounded" />
                {item.name}
              </div>
            ))}
          </div>
          <div className="mt-auto p-2">
            <div className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#C7C7C7]">
              <div className="h-5 w-5 bg-[#262626] rounded" />
              Sign Out
            </div>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-gray-800 bg-[#1E1E1E] h-full">
      <nav className="flex flex-col h-full">
        <div className="flex-1 space-y-1 p-4 sm:p-6">
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
                    : 'text-[#C7C7C7] hover:text-[#F2F2F2] hover:bg-[#262626]'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          {/* Admin Portal Link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium border-t border-gray-800 mt-2 pt-2 transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-[#262626] text-[#9146FF]'
                  : 'text-orange-400 hover:bg-[#262626] hover:text-orange-300'
              )}
            >
              <Shield className="h-5 w-5" />
              Admin Portal
            </Link>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-800">
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
  );
} 