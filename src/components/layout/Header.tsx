'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { ROUTES } from '@/lib/constants/routes';
import { Menu, X } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#141414] border-b border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-[#F2F2F2]">
              Love4Detailing
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <Link href="/#pricing">
              <Button variant="ghost" className="text-sm lg:text-base">View Pricing</Button>
            </Link>
            <Link href="/book">
              <Button className="text-sm lg:text-base">Book Detail</Button>
            </Link>
            {user ? (
              <Link href={ROUTES.DASHBOARD}>
                <Button variant="outline" className="text-sm lg:text-base">Dashboard</Button>
              </Link>
            ) : (
              <Link href={ROUTES.SIGN_IN}>
                <Button variant="outline" className="text-sm lg:text-base">Log In</Button>
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-md hover:bg-gray-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-[#F2F2F2]" />
            ) : (
              <Menu className="h-6 w-6 text-[#F2F2F2]" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-3 border-t border-gray-800">
            <Link href="/#pricing" className="block">
              <Button variant="ghost" className="w-full justify-start text-left h-10 sm:h-12">
                View Pricing
              </Button>
            </Link>
            <Link href="/book" className="block">
              <Button className="w-full h-10 sm:h-12">
                Book Detail
              </Button>
            </Link>
            {user ? (
              <Link href={ROUTES.DASHBOARD} className="block">
                <Button variant="outline" className="w-full justify-start text-left h-10 sm:h-12">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href={ROUTES.SIGN_IN} className="block">
                <Button variant="outline" className="w-full justify-start text-left h-10 sm:h-12">
                  Log In
                </Button>
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
} 