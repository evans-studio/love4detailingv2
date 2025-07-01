'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Love4Detailing</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary-500',
              pathname === '/' ? 'text-primary-500' : 'text-black'
            )}
          >
            Home
          </Link>
          <Link
            href="/services"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary-500',
              pathname === '/services' ? 'text-primary-500' : 'text-black'
            )}
          >
            Services
          </Link>
          <Link
            href="/about"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary-500',
              pathname === '/about' ? 'text-primary-500' : 'text-black'
            )}
          >
            About
          </Link>
          <Link
            href="/contact"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary-500',
              pathname === '/contact' ? 'text-primary-500' : 'text-black'
            )}
          >
            Contact
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Link href="/book">
            <Button>Book Service</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </header>
  );
} 