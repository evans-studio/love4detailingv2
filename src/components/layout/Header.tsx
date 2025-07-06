'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { ROUTES } from '@/lib/constants/routes';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-[#141414] border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-[#F2F2F2]">Love4Detailing</span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link href="/#pricing">
            <Button variant="ghost">View Pricing</Button>
          </Link>
          <Link href="/book">
            <Button>Book Detail</Button>
          </Link>
          {user ? (
            <Link href={ROUTES.DASHBOARD}>
              <Button variant="outline">Dashboard</Button>
            </Link>
          ) : (
            <Link href={ROUTES.SIGN_IN}>
              <Button variant="outline">Log In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 