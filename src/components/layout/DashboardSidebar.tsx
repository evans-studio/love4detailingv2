'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
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
      <aside className="w-64 border-r bg-white">
        <nav className="flex flex-col h-full">
          <div className="space-y-1 p-2">
            {navigation.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500"
              >
                <div className="h-5 w-5 bg-gray-200 rounded" />
                {item.name}
              </div>
            ))}
          </div>
          <div className="mt-auto p-2">
            <div className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500">
              <div className="h-5 w-5 bg-gray-200 rounded" />
              Sign Out
            </div>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-white">
      <nav className="flex flex-col h-full">
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
          
          {/* Admin Portal Link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium border-t mt-2 pt-2',
                pathname.startsWith('/admin')
                  ? 'bg-primary-50 text-primary-500'
                  : 'text-orange-600 hover:bg-orange-50'
              )}
            >
              <Shield className="h-5 w-5" />
              Admin Portal
            </Link>
          )}
        </div>

        <div className="mt-auto p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 hover:text-red-600"
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