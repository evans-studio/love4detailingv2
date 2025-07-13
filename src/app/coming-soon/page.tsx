'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { 
  CheckCircle, 
  Mail, 
  MapPin, 
  Star, 
  Clock, 
  Car, 
  Sparkles,
  ArrowRight,
  Shield,
  Award,
  Zap
} from 'lucide-react'
import Image from 'next/image'

interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  // Launch date: July 31st, 2025 at 12:00 PM London time
  const launchDate = new Date('2025-07-31T12:00:00+01:00')

  useEffect(() => {
    setIsLoaded(true)
    
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = launchDate.getTime() - now

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [launchDate])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setSubmitStatus('error')
      setSubmitMessage('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/coming-soon/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitStatus('success')
        setSubmitMessage('Thank you! We\'ll notify you when we launch.')
        setEmail('')
      } else {
        setSubmitStatus('error')
        setSubmitMessage(data.message || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTimeMessage = () => {
    const totalDays = timeLeft.days
    if (totalDays > 30) return "We're putting the finishing touches on something special..."
    if (totalDays > 7) return "Almost ready! The countdown is on..."
    if (totalDays > 0) return "Final preparations underway. Launch is imminent!"
    return "It's time! Welcome to Love4Detailing!"
  }

  const CountdownBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-lg p-4 md:p-6 min-w-[80px] md:min-w-[100px] shadow-premium transition-all duration-300 hover:scale-105 hover:shadow-premium-lg">
        <div className="text-2xl md:text-4xl font-bold text-foreground text-center">
          {value.toString().padStart(2, '0')}
        </div>
      </div>
      <div className="text-muted-foreground text-sm md:text-base mt-2 font-medium">
        {label}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
      
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
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className={`flex items-center space-x-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Love4Detailing - Premium Mobile Car Detailing"
                  width={300}
                  height={90}
                  className="h-16 md:h-20 w-auto object-contain filter drop-shadow-lg"
                  priority
                />
              </div>
              <div className="h-8 w-px bg-gradient-to-b from-purple-500 to-purple-300 hidden md:block" />
              <div className="hidden md:block">
                <p className="text-purple-200 text-sm font-medium">Premium Mobile Car Detailing</p>
                <p className="text-gray-400 text-xs">Coming Soon</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <div className={`mb-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm rounded-full border border-border mb-6 shadow-premium">
                <Clock className="w-4 h-4 text-primary mr-2" />
                <span className="text-foreground text-sm font-medium">Coming Soon</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Love 4 Detailing
                <br />
                <span className="text-primary">Booking App</span>
              </h2>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                We're launching our new booking app to make scheduling your car detailing even easier.
              </p>

              {/* Service Area Messaging */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <p className="text-lg text-primary font-medium">
                    Serving SW9 and surrounding areas within 17.5 mile radius.
                  </p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Standard pricing within 10 miles • Extended areas available with travel supplement
                </p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Fully Insured
                </Badge>
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                  <Award className="w-4 h-4 mr-2" />
                  Professional Grade
                </Badge>
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                  <Zap className="w-4 h-4 mr-2" />
                  Same Day Service
                </Badge>
              </div>

              <div className="text-muted-foreground text-lg mb-8">
                {getTimeMessage()}
              </div>
            </div>

            {/* Countdown Timer */}
            <div className={`mb-16 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Launch Countdown
              </h3>
              
              <div className="flex justify-center items-center space-x-4 md:space-x-8">
                <CountdownBox value={timeLeft.days} label="Days" />
                <CountdownBox value={timeLeft.hours} label="Hours" />
                <CountdownBox value={timeLeft.minutes} label="Minutes" />
                <CountdownBox value={timeLeft.seconds} label="Seconds" />
              </div>
            </div>

            {/* Services Preview */}
            <div className={`mb-16 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="bg-card/40 backdrop-blur-sm border-border hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-premium group">
                  <CardContent className="p-6 text-center">
                    <Car className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h4 className="text-xl font-semibold text-foreground mb-2">Mobile Service</h4>
                    <p className="text-muted-foreground">We come to you - at home, work, or anywhere convenient</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-border hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-premium group">
                  <CardContent className="p-6 text-center">
                    <Star className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h4 className="text-xl font-semibold text-foreground mb-2">Premium Quality</h4>
                    <p className="text-muted-foreground">Professional equipment and premium products for exceptional results</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-border hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-premium group">
                  <CardContent className="p-6 text-center">
                    <MapPin className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h4 className="text-xl font-semibold text-foreground mb-2">South London</h4>
                    <p className="text-muted-foreground">Comprehensive coverage across South London boroughs</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Email Signup */}
            <div className={`max-w-md mx-auto transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Card className="bg-card/40 backdrop-blur-sm border-border shadow-premium hover:shadow-premium-lg transition-all duration-300">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">Get Notified</h3>
                    <p className="text-muted-foreground">
                      Be the first to know when we launch and get exclusive early access
                    </p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:scale-105"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Signing up...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Notify Me</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>

                  {submitStatus === 'success' && (
                    <Alert className="mt-4 bg-l4d-success/20 border-l4d-success/30">
                      <CheckCircle className="h-4 w-4 text-l4d-success" />
                      <AlertDescription className="text-l4d-success">
                        {submitMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {submitStatus === 'error' && (
                    <Alert className="mt-4 bg-destructive/20 border-destructive/30">
                      <AlertDescription className="text-destructive">
                        {submitMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <p className="text-muted-foreground text-sm mt-4 text-center">
                    We respect your privacy. No spam, ever.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 md:p-8 border-t border-border/30">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <p className="text-muted-foreground text-sm">
                © 2025 Love4Detailing. Premium mobile car detailing services launching soon in South London.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-l4d-success" />
                  Fully Insured
                </span>
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-l4d-success" />
                  Professional Grade
                </span>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </footer>
      </div>
    </div>
  )
}