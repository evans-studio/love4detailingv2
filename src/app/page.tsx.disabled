'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Calendar, 
  Users, 
  Star,
  Settings, 
  Car, 
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Shield,
  MapPin,
  Quote,
  Award,
  Zap,
  ChevronDown,
  Gem,
  Target,
  Phone,
  Mail,
  Wrench,
  Palette,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import PostcodeChecker from '@/components/PostcodeChecker'
import DynamicHeader from '@/components/layout/DynamicHeader'

// Smooth scroll animation hook
const useScrollAnimation = () => {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-smooth-fade-in')
        }
      })
    }, observerOptions)

    const elements = document.querySelectorAll('.fade-in-on-scroll')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}

interface ServiceData {
  id: string
  name: string
  code: string
  description: string
  short_description: string
  display_order: number
  features: string[]
  base_duration_minutes: number
  is_active: boolean
  pricing_summary: {
    range: { min: number; max: number }
    formatted_range: string
    vehicle_sizes: string[]
    min_price_formatted: string
    min_duration: number
  }
}

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [services, setServices] = useState<ServiceData[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  
  useScrollAnimation()
  
  useEffect(() => {
    let mounted = true // Prevent state updates if component unmounted
    
    setIsLoaded(true)
    
    // Fetch services from API
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services')
        const result = await response.json()
        
        if (mounted && response.ok && result.success) {
          // Take first 3 services for homepage display
          const servicesToShow = result.data.slice(0, 3)
          setServices(servicesToShow)
        }
      } catch (error) {
        if (mounted) {
          console.error('❌ Homepage: Error fetching services:', error)
        }
      } finally {
        if (mounted) {
          setServicesLoading(false)
        }
      }
    }
    
    fetchServices()
    
    return () => {
      mounted = false
    }
    
    // Smooth scroll behavior
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY
        const rate = scrolled * -0.5
        heroRef.current.style.transform = `translateY(${rate}px)`
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* Dynamic Navigation Header */}
      <DynamicHeader />
      
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Premium Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isLoaded && [...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-float"
              style={{
                left: `${((i * 47) % 100)}%`,
                top: `${((i * 73) % 100)}%`,
                animationDelay: `${(i * 0.15) % 3}s`,
                animationDuration: `${3 + (i * 0.1) % 2}s`
              }}
            />
          ))}
        </div>
        
        <div ref={heroRef} className="container mx-auto px-4 py-16 text-center relative z-10">
          <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Premium Brand Logo */}
            <div className="mb-8">
              <div className="relative mb-6">
                <Image
                  src="/logo.png"
                  alt="Love4Detailing - Premium Mobile Car Detailing"
                  width={400}
                  height={120}
                  className="mx-auto h-20 md:h-28 w-auto object-contain filter drop-shadow-lg"
                  priority
                />
              </div>
              <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-purple-300 mx-auto rounded-full" />
            </div>
            
            {/* Premium Value Proposition */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-light mb-6 text-gray-200">
                Premium Mobile Car Detailing
              </h2>
              <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                Professional detailing that comes to you. Experience the difference of premium service, 
                exceptional attention to detail, and the convenience of mobile expertise.
              </p>
              
              {/* Service Area Messaging */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-purple-400" />
                  <p className="text-lg text-purple-200 font-medium">
                    Serving SW9 and surrounding areas within 25 miles
                  </p>
                </div>
                <p className="text-gray-400 text-sm">
                  Standard pricing within 10 miles • Extended areas available with travel supplement
                </p>
              </div>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Badge className="bg-purple-600/20 text-purple-200 border-purple-500/30 px-4 py-2">
                  <Shield className="w-4 h-4 mr-2" aria-label="Insurance coverage" />
                  Fully Insured
                </Badge>
                <Badge className="bg-purple-600/20 text-purple-200 border-purple-500/30 px-4 py-2">
                  <Award className="w-4 h-4 mr-2" aria-label="Professional certification" />
                  Professional Grade
                </Badge>
                <Badge className="bg-purple-600/20 text-purple-200 border-purple-500/30 px-4 py-2">
                  <Zap className="w-4 h-4 mr-2" aria-label="Service speed" />
                  Same Day Service
                </Badge>
              </div>
            </div>
            
            {/* Premium CTAs */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-lg mx-auto mb-12">
              <Link href="/booking" className="group">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 px-8 py-4 text-lg font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30">
                  Book Premium Service
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/auth/login" className="group">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                  Customer Portal
                  <Users className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            
            {/* Scroll Indicator */}
            <button 
              onClick={scrollToServices}
              className="animate-bounce cursor-pointer p-2 rounded-full bg-purple-600/20 hover:bg-purple-600/30 transition-colors"
              aria-label="Scroll to services section"
            >
              <ChevronDown className="h-6 w-6 text-purple-300" aria-hidden="true" />
            </button>
          </div>
        </div>
        
      </section>

      {/* Premium Service Showcase */}
      <section id="services" className="relative py-20 bg-gradient-to-b from-gray-900 via-black to-gray-900">
        {/* Seamless transition from hero */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
        
        {/* Subtle floating elements for continuity */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isLoaded && [...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/10 rounded-full animate-float"
              style={{
                left: `${((i * 67) % 100)}%`,
                top: `${((i * 89) % 100)}%`,
                animationDelay: `${(i * 0.4) % 4}s`,
                animationDuration: `${4 + (i * 0.2) % 2}s`
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 fade-in-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Premium Service Experience
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Every detail matters. Every service exceeds expectations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Dynamic Service Cards */}
            {(() => {
              console.log('🎯 Homepage: Rendering services section', { 
                servicesLoading, 
                servicesCount: services.length, 
                services: services.map(s => s.name) 
              })
              return null
            })()}
            {servicesLoading ? (
              // Loading state
              [...Array(3)].map((_, index) => (
                <Card key={index} className="bg-gray-800/50 border-purple-500/20 text-white fade-in-on-scroll animate-pulse">
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 bg-purple-400/20 rounded-full mx-auto mb-6"></div>
                    <div className="h-6 bg-purple-400/20 rounded mb-4"></div>
                    <div className="h-4 bg-gray-600/20 rounded mb-2"></div>
                    <div className="h-4 bg-gray-600/20 rounded mb-6"></div>
                    <div className="h-8 bg-purple-400/20 rounded mb-6"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600/20 rounded"></div>
                      <div className="h-4 bg-gray-600/20 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : services.length > 0 ? (
              // Dynamic services from database
              services.map((service, index) => {
                console.log('🎨 Homepage: Rendering service card:', service)
                console.log('🎨 Homepage: Service pricing_summary:', service.pricing_summary)
                
                try {
                  // Define service-specific icons based on service name or use defaults
                  const getServiceIcon = (serviceName: string) => {
                  const name = serviceName.toLowerCase()
                  if (name.includes('full') || name.includes('valet') || name.includes('complete')) {
                    return <Award className="h-12 w-12 text-purple-400" aria-label="Premium quality service" />
                  } else if (name.includes('mobile') || name.includes('convenience')) {
                    return <MapPin className="h-12 w-12 text-purple-400" aria-label="Mobile service delivery" />
                  } else if (name.includes('premium') || name.includes('experience')) {
                    return <Shield className="h-12 w-12 text-purple-400" aria-label="Professional reliability" />
                  } else if (name.includes('interior') || name.includes('inside')) {
                    return <Palette className="h-12 w-12 text-purple-400" aria-label="Interior detailing" />
                  } else if (name.includes('exterior') || name.includes('outside')) {
                    return <Car className="h-12 w-12 text-purple-400" aria-label="Exterior detailing" />
                  } else if (name.includes('wash') || name.includes('clean')) {
                    return <Wrench className="h-12 w-12 text-purple-400" aria-label="Cleaning service" />
                  }
                  return <Star className="h-12 w-12 text-purple-400" aria-label="Premium service" />
                }

                console.log('🎨 About to render card for:', service.name)
                console.log('🎨 Pricing data:', service.pricing_summary)
                
                // Build final service card carefully
                console.log('🎨 Building final service card...')
                
                return (
                  <Card key={service.id} className="bg-gray-800/50 border-purple-500/20 text-white">
                    <CardContent className="p-8 text-center">
                      <h3 className="text-xl font-bold mb-4 text-purple-200">{service.name}</h3>
                      <p className="text-gray-300 mb-6">
                        Complete interior and exterior transformation
                      </p>
                      <div className="mb-6">
                        <div className="text-2xl font-bold text-purple-400 mb-2">
                          From £50.00
                        </div>
                        <div className="text-sm text-gray-400">
                          90 min service
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-300">
                          ✓ Professional service
                        </div>
                        <div className="text-sm text-gray-300">
                          ✓ Premium products
                        </div>
                        <div className="text-sm text-gray-300">
                          ✓ Mobile convenience
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
                } catch (error) {
                  console.error('❌ Error rendering service card:', error, service)
                  return (
                    <Card key={service.id} className="bg-red-500/20 border-red-500/50 text-white">
                      <CardContent className="p-8 text-center">
                        <p>Error rendering service: {service.name}</p>
                      </CardContent>
                    </Card>
                  )
                }
              })
            ) : (
              // Fallback: original hardcoded content if no services in database
              [
                {
                  icon: <Award className="h-12 w-12 text-purple-400" aria-label="Premium quality service" />,
                  title: "Full Valet Service",
                  description: "Complete interior and exterior transformation using premium products and professional techniques",
                  price: "From £50",
                  features: ["Premium wax finish", "Interior deep clean", "Wheel & tire detail"]
                },
                {
                  icon: <MapPin className="h-12 w-12 text-purple-400" aria-label="Mobile service delivery" />,
                  title: "Mobile Convenience",
                  description: "Professional service delivered to your location - home, office, or anywhere you need us",
                  price: "No Travel",
                  features: ["We come to you", "Flexible scheduling", "All equipment provided"]
                },
                {
                  icon: <Shield className="h-12 w-12 text-purple-400" aria-label="Professional reliability" />,
                  title: "Premium Experience",
                  description: "Efficient service without compromise on quality, delivered by experienced professionals",
                  price: "1-3 Hours",
                  features: ["Real-time updates", "Quality guarantee", "Same-day booking"]
                }
              ].map((service, index) => (
                <Card key={index} className="bg-gray-800/50 border-purple-500/20 text-white hover:border-purple-400/40 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 fade-in-on-scroll group">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-purple-200">{service.title}</h3>
                    <p className="text-gray-300 mb-6 leading-relaxed">{service.description}</p>
                    <div className="mb-6">
                      <div className="text-2xl font-bold text-purple-400 mb-2">{service.price}</div>
                      <div className="text-sm text-gray-400">Professional service</div>
                    </div>
                    <div className="space-y-2">
                      {service.features.map((feature, i) => (
                        <div key={i} className="flex items-center justify-center gap-2 text-sm text-gray-300">
                          <CheckCircle className="h-4 w-4 text-purple-400" aria-hidden="true" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="about" className="relative py-20 bg-gradient-to-b from-gray-900 via-black to-gray-900">
        {/* Organic section transition */}
        <div className="absolute top-0 left-0 right-0 h-40">
          <svg className="w-full h-full" viewBox="0 0 1200 160" preserveAspectRatio="none">
            <path d="M0,160 C300,120 600,140 1200,100 L1200,0 L0,0 Z" fill="rgba(17,24,39,0.8)" />
          </svg>
        </div>
        
        {/* Ambient background continuation */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-purple-800/5" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 fade-in-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Trusted by Discerning Customers
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Quality that speaks for itself through customer satisfaction
            </p>
          </div>
          
          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
            {[
              {
                name: "Sarah Johnson",
                review: "Exceptional attention to detail. My car looks better than when I first bought it. The mobile service is incredibly convenient.",
                rating: 5,
                location: "London"
              },
              {
                name: "Michael Chen",
                review: "Professional service from start to finish. The team arrived on time and exceeded all expectations. Highly recommend.",
                rating: 5,
                location: "Manchester"
              },
              {
                name: "Emma Wilson",
                review: "Outstanding quality and customer service. The convenience of having them come to my office is invaluable.",
                rating: 5,
                location: "Birmingham"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-gray-800/50 border-purple-500/20 text-white hover:border-purple-400/40 transition-all duration-500 hover:scale-105 fade-in-on-scroll">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-purple-400 mb-4" />
                  <p className="text-gray-300 mb-4 italic">"{testimonial.review}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-purple-200">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.location}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto fade-in-on-scroll">
            {[
              { number: "500+", label: "Happy Customers" },
              { number: "99%", label: "Satisfaction Rate" },
              { number: "24/7", label: "Support Available" },
              { number: "2 Hour", label: "Average Response" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">{stat.number}</div>
                <div className="text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative py-20 bg-gradient-to-b from-gray-900 via-black to-gray-900">
        {/* Seamless curved transition */}
        <div className="absolute top-0 left-0 right-0 h-32">
          <svg className="w-full h-full" viewBox="0 0 1200 128" preserveAspectRatio="none">
            <path d="M0,128 C400,80 800,96 1200,64 L1200,0 L0,0 Z" fill="rgba(0,0,0,0.6)" />
          </svg>
        </div>
        
        {/* Subtle purple glow for continuity */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(151,71,255,0.05),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 fade-in-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Simple. Professional. Reliable.
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Three simple steps to premium car detailing
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Book Online",
                description: "Choose your preferred time slot and service package through our intuitive booking system",
                icon: <Calendar className="h-6 w-6 text-purple-400" aria-label="Online booking" />
              },
              {
                step: "02",
                title: "We Come to You",
                description: "Our professional team arrives at your location with all premium equipment and products",
                icon: <Car className="h-6 w-6 text-purple-400" aria-label="Mobile service" />
              },
              {
                step: "03",
                title: "Enjoy the Results",
                description: "Experience the transformation as your vehicle receives our signature premium treatment",
                icon: <Star className="h-6 w-6 text-purple-400" aria-label="Service completion" />
              }
            ].map((process, index) => (
              <div key={index} className="text-center fade-in-on-scroll group">
                <div className="relative mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/25">
                    {process.icon}
                  </div>
                  {/* Step number indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-purple-500/50 text-xs font-bold text-purple-300">
                    {process.step}
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-purple-200">{process.title}</h3>
                <p className="text-gray-300 leading-relaxed">{process.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Area Checker Section */}
      <section id="contact" className="relative py-20 bg-gradient-to-b from-gray-900 via-black to-gray-900">
        {/* Seamless curved transition */}
        <div className="absolute top-0 left-0 right-0 h-32">
          <svg className="w-full h-full" viewBox="0 0 1200 128" preserveAspectRatio="none">
            <path d="M0,128 C400,80 800,96 1200,64 L1200,0 L0,0 Z" fill="rgba(0,0,0,0.6)" />
          </svg>
        </div>
        
        {/* Subtle purple glow for continuity */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(151,71,255,0.05),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 fade-in-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Check If We Serve Your Area
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Enter your postcode to confirm service availability and get transparent pricing information
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto fade-in-on-scroll">
            <PostcodeChecker 
              title="Service Area Validation"
              description="We serve SW9 and surrounding areas within 25 miles • Standard pricing within 10 miles"
              className="border-purple-500/30 shadow-xl shadow-purple-500/10 bg-gray-800/50 backdrop-blur-sm"
            />
          </div>
          
          {/* Service Area Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12 fade-in-on-scroll">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-200 mb-2">Standard Area</h3>
              <p className="text-sm text-gray-300">
                Within 10 miles of SW9 • No additional travel charges
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-200 mb-2">Extended Area</h3>
              <p className="text-sm text-gray-300">
                10-25 miles from SW9 • Small travel supplement applies
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-purple-200 mb-2">Special Arrangements</h3>
              <p className="text-sm text-gray-300">
                Beyond 25 miles • Contact us for custom solutions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 bg-gradient-to-b from-gray-900 to-black">
        {/* Elegant wave transition */}
        <div className="absolute top-0 left-0 right-0 h-24">
          <svg className="w-full h-full" viewBox="0 0 1200 96" preserveAspectRatio="none">
            <path d="M0,96 C200,60 400,80 600,50 C800,20 1000,40 1200,10 L1200,0 L0,0 Z" fill="rgba(17,24,39,0.8)" />
          </svg>
        </div>
        
        {/* Premium purple ambiance */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-transparent to-purple-800/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <Card className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border-purple-500/30 max-w-4xl mx-auto fade-in-on-scroll backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="mb-8">
                <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Ready for Premium Service?
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                  Experience the difference of professional mobile car detailing. 
                  Book your premium service today and discover why customers choose Love4Detailing.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
                <Link href="/booking" className="group">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 px-8 py-4 text-lg font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30">
                    Book Premium Service Now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth/login" className="group">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                    Customer Portal
                    <Users className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-gray-400">
                New customers: Start your premium experience • Existing customers: Manage your services
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Professional Footer */}
      <footer className="relative bg-gradient-to-b from-black to-gray-900 border-t border-purple-500/20">
        {/* Subtle transition glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="mb-4">
                <Image
                  src="/logo.png"
                  alt="Love4Detailing"
                  width={200}
                  height={60}
                  className="h-12 w-auto object-contain filter brightness-110"
                />
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Premium mobile car detailing service delivering professional results at your convenience.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4 text-purple-400" aria-label="Service area" />
                <span>Serving Greater London Area</span>
              </div>
            </div>
            
            {/* Services */}
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-200">Services</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                {services.length > 0 ? (
                  services.slice(0, 4).map((service) => (
                    <li key={service.id} className="hover:text-purple-300 transition-colors cursor-pointer">
                      {service.name}
                    </li>
                  ))
                ) : (
                  // Fallback services if no dynamic services available
                  <>
                    <li className="hover:text-purple-300 transition-colors cursor-pointer">Full Valet Service</li>
                    <li className="hover:text-purple-300 transition-colors cursor-pointer">Interior Cleaning</li>
                    <li className="hover:text-purple-300 transition-colors cursor-pointer">Exterior Detailing</li>
                    <li className="hover:text-purple-300 transition-colors cursor-pointer">Mobile Service</li>
                  </>
                )}
              </ul>
            </div>
            
            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-200">Contact</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-purple-400" aria-label="Phone number" />
                  <span>0800 123 4567</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-400" aria-label="Email address" />
                  <span>hello@love4detailing.co.uk</span>
                </div>
              </div>
            </div>
            
            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-200">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="hover:text-purple-300 transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-purple-300 transition-colors cursor-pointer">Terms of Service</li>
                <li className="hover:text-purple-300 transition-colors cursor-pointer">Service Guarantee</li>
                <li className="hover:text-purple-300 transition-colors cursor-pointer">Insurance Details</li>
              </ul>
            </div>
          </div>
          
          {/* Footer Bottom */}
          <div className="mt-12 pt-8 border-t border-purple-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2024 Love4Detailing. All rights reserved. Professional mobile car detailing service.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-400" aria-label="Insurance status" />
                Fully Insured
              </span>
              <span className="flex items-center gap-1">
                <Award className="h-4 w-4 text-green-400" aria-label="Professional certification" />
                Professional Grade
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
    </>
  )
}