'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ROUTES } from '@/lib/constants/routes';
import content from '@/data/content.json';

export default function LandingPage() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current) return;

    const orb = orbRef.current;
    
    // Create the floating animation
    gsap.to(orb, {
      y: -20,
      duration: 2,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });

    // Create the glow pulse
    gsap.to(orb, {
      boxShadow: '0 0 30px rgba(151, 71, 255, 0.4)',
      duration: 1.5,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });

    return () => {
      gsap.killTweensOf(orb);
    };
  }, []);

  return (
    <main className="min-h-screen bg-primary-black text-primary-off-white relative overflow-hidden">
      {/* Animated Orb */}
      <div
        ref={orbRef}
        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 blur-lg opacity-50 -top-32 -right-32"
      />

      {/* Hero Content */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          {content.brand.name}
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-secondary-text-muted">
          {content.brand.description}
        </p>
        <Link
          href={ROUTES.BOOK}
          className="inline-block bg-primary-purple text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-600 transition-colors"
        >
          {content.navigation.header.cta}
        </Link>
      </div>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-black z-0" />
    </main>
  );
} 