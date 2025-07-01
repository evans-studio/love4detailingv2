'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Car,
  CreditCard,
  Home,
  LogOut,
  Settings,
  Star,
  User,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Book Service',
    href: '/dashboard/book',
    icon: Calendar,
  },
  {
    name: 'My Vehicles',
    href: '/dashboard/vehicles',
    icon: Car,
  },
  {
    name: 'Loyalty Points',
    href: '/dashboard/rewards',
    icon: Star,
  },
  {
    name: 'Payment History',
    href: '/dashboard/payments',
    icon: CreditCard,
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col border-r border-stone bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-stone px-6">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Love4Detailing</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary-50 text-primary-500'
                  : 'text-black hover:bg-primary-50 hover:text-primary-500'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-500' : 'text-muted group-hover:text-primary-500'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-stone p-4">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="h-4 w-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">John Doe</p>
            <p className="text-xs text-muted truncate">john@example.com</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start mt-2"
          onClick={() => {
            // Handle logout
          }}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
} 