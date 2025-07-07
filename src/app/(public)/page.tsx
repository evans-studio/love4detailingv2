'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Star, MapPin, Clock, Shield, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const SERVICES = [
  {
    id: 'full_valet',
    name: 'Full Valet',
    description: 'Complete interior and exterior valet service',
    duration: '2-3 hours',
    features: ['Exterior wash & wax', 'Interior deep clean', 'Tyre shine', 'Window cleaning'],
    prices: {
      small: 50,
      medium: 60,
      large: 70,
      extra_large: 85
    }
  }
]

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    location: 'Manchester',
    rating: 5,
    text: 'Absolutely fantastic service! My car looks brand new. The attention to detail is incredible.',
    service: 'Full Valet'
  },
  {
    name: 'Mike Thompson',
    location: 'Birmingham',
    rating: 5,
    text: 'Professional, punctual, and thorough. Will definitely be booking again.',
    service: 'Full Valet'
  },
  {
    name: 'Emma Wilson',
    location: 'Leeds',
    rating: 5,
    text: 'Love4Detailing exceeded my expectations. Outstanding value for money.',
    service: 'Full Valet'
  }
]

const TRUST_INDICATORS = [
  { icon: Shield, text: 'Fully Insured' },
  { icon: Users, text: '500+ Happy Customers' },
  { icon: CheckCircle, text: '100% Satisfaction Guarantee' },
  { icon: MapPin, text: 'Mobile Service Available' }
]

export default function LandingPage() {
  const [selectedVehicleSize, setSelectedVehicleSize] = useState<'small' | 'medium' | 'large' | 'extra_large'>('medium')

  const currentPrice = SERVICES[0].prices[selectedVehicleSize]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-purple-600">Love4Detailing</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/services" className="text-gray-600 hover:text-gray-900">Services</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
              <Link href="/auth/sign-in" className="text-gray-600 hover:text-gray-900">Sign In</Link>
              <Button asChild>
                <Link href="/booking/services">Book Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Premium Mobile Car Detailing
            <span className="text-purple-600 block">At Your Doorstep</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Professional car valeting and detailing services delivered to your location. 
            Book in minutes, no upfront payment required.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {TRUST_INDICATORS.map((indicator, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-600">
                <indicator.icon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">{indicator.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link href="/booking/services">Start Booking - No Payment Needed</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
              <Link href="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Service Preview */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Premium Service</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We specialize in delivering exceptional car detailing services with attention to every detail.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {SERVICES[0].name}
                    <Badge variant="secondary">Most Popular</Badge>
                  </CardTitle>
                  <CardDescription>{SERVICES[0].description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{SERVICES[0].duration}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">What's included:</h4>
                      <ul className="space-y-1">
                        {SERVICES[0].features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-2xl font-bold text-purple-600">
                        From £{currentPrice}
                      </p>
                      <p className="text-gray-500 text-sm">Final price based on vehicle size</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Service showcase image would go here</p>
              </div>
              
              <Button size="lg" className="w-full" asChild>
                <Link href="/booking/services">Book This Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Calculator Widget */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Instant Price Calculator</h2>
            <p className="text-gray-600">See exactly what you'll pay based on your vehicle size</p>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(SERVICES[0].prices).map(([size, price]) => (
                <button
                  key={size}
                  onClick={() => setSelectedVehicleSize(size as any)}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    selectedVehicleSize === size
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold capitalize">{size.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500">£{price}</div>
                </button>
              ))}
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">£{currentPrice}</div>
              <p className="text-gray-600 mb-4">Full Valet for {selectedVehicleSize.replace('_', ' ')} vehicle</p>
              <Button size="lg" asChild>
                <Link href="/booking/vehicle">Book Now - Get Started</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-gray-600 ml-2">4.9/5 from 500+ reviews</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {testimonial.location} • {testimonial.service}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Vehicle?</h2>
          <p className="text-xl mb-8 text-purple-100">
            Join hundreds of satisfied customers. Book your service in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
              <Link href="/booking/services">Book Your Service Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-purple-600">
              <Link href="/contact">Have Questions? Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Love4Detailing</h3>
              <p className="text-gray-400">Premium mobile car detailing services delivered to your doorstep.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/services" className="hover:text-white">Full Valet</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/booking/services" className="hover:text-white">Book Now</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/sign-in" className="hover:text-white">Sign In</Link></li>
                <li><Link href="/auth/sign-up" className="hover:text-white">Sign Up</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Love4Detailing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}