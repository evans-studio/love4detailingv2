'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ROUTES } from '@/lib/constants/routes';
import content from '@/data/content.json';
import { getAvailableServices, getServicePricesBySize } from '@/lib/config/services';
import { Check, Clock, MapPin, Star } from 'lucide-react';

export default function LandingPage() {
  const orbRef = useRef<HTMLDivElement>(null);
  const services = getAvailableServices();
  const mainService = services[0]; // Full Valet & Detail
  const servicePrices = mainService ? getServicePricesBySize(mainService.id) : {};

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
    <main className="min-h-screen bg-[#141414] text-[#F2F2F2] relative overflow-hidden">
      {/* Animated Orb */}
      <div
        ref={orbRef}
        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-[#9146FF] to-purple-700 blur-lg opacity-30 -top-32 -right-32"
      />

      {/* Hero Section */}
      <section className="bg-[#141414] py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-[#F2F2F2] to-[#C7C7C7] bg-clip-text text-transparent">
              {content.brand.name}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-[#C7C7C7] mb-6 sm:mb-8 max-w-2xl mx-auto">
              Premium mobile car detailing in SW9, London. Professional service delivered to your doorstep.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-[#C7C7C7] mb-8">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#9146FF]" />
                <span>SW9, London • 10 Mile Radius</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#28C76F]" />
                <span>5★ Premium Service</span>
              </div>
            </div>
          </div>

          {/* Service Showcase */}
          {mainService && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-4 sm:p-6 lg:p-8 mb-12">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F2F2F2] mb-4">
                    {mainService.name}
                  </h2>
                  <p className="text-base sm:text-lg text-[#C7C7C7] mb-4 sm:mb-6">
                    {mainService.description}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[#9146FF] font-medium">
                    <Clock className="w-5 h-5" />
                    <span>{mainService.duration}</span>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {mainService.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#28C76F] flex-shrink-0" />
                      <span className="text-sm sm:text-base text-[#C7C7C7]">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div id="pricing" className="bg-[#141414] rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F2F2F2] mb-4 text-center">
                    Transparent Pricing
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {Object.entries(servicePrices).map(([size, price]) => (
                      <div key={size} className="text-center bg-[#1E1E1E] rounded-lg p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-[#C7C7C7] mb-1 capitalize">{size}</div>
                        <div className="text-lg sm:text-xl font-bold text-[#9146FF]">£{price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <Link
                    href={ROUTES.BOOK}
                    className="inline-block bg-[#9146FF] text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#9146FF]/90 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
                  >
                    Book Your Service Now
                  </Link>
                  <p className="text-xs sm:text-sm text-[#C7C7C7] mt-4">
                    Mobile service • Cash payment • Fully insured
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#9146FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-[#9146FF]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#F2F2F2] mb-2">Mobile Service</h3>
              <p className="text-sm sm:text-base text-[#C7C7C7]">We come to you. No need to travel or wait around.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#28C76F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-[#28C76F]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#F2F2F2] mb-2">Premium Quality</h3>
              <p className="text-sm sm:text-base text-[#C7C7C7]">Professional products and attention to detail.</p>
            </div>
            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 bg-[#9146FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#9146FF]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#F2F2F2] mb-2">Fast & Efficient</h3>
              <p className="text-sm sm:text-base text-[#C7C7C7]">Quick turnaround without compromising quality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141414] z-0" />
    </main>
  );
} 