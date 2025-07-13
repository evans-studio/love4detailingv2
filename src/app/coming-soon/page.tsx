'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Mail, 
  MapPin, 
  Star, 
  Clock, 
  Car, 
  Sparkles,
  ArrowRight
} from 'lucide-react'

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

  // Launch date: July 31st, 2025 at 12:00 PM London time
  const launchDate = new Date('2025-07-31T12:00:00+01:00')

  useEffect(() => {
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
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 md:p-6 min-w-[80px] md:min-w-[100px]">
        <div className="text-2xl md:text-4xl font-bold text-white text-center">
          {value.toString().padStart(2, '0')}
        </div>
      </div>
      <div className="text-white/80 text-sm md:text-base mt-2 font-medium">
        {label}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Love4Detailing</h1>
                <p className="text-purple-200 text-sm">Premium Mobile Car Detailing</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <div className="mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                <Clock className="w-4 h-4 text-purple-300 mr-2" />
                <span className="text-white/90 text-sm">Coming Soon</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Premium Mobile Car Detailing
                <br />
                <span className="text-purple-300">Coming to South London</span>
              </h2>
              
              <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
                Professional car detailing services brought directly to your doorstep. 
                Experience convenience, quality, and premium care for your vehicle.
              </p>

              <div className="text-white/70 text-lg mb-8">
                {getTimeMessage()}
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="mb-16">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-8">
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
            <div className="mb-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <Car className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-white mb-2">Mobile Service</h4>
                    <p className="text-white/70">We come to you - at home, work, or anywhere convenient</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <Star className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-white mb-2">Premium Quality</h4>
                    <p className="text-white/70">Professional equipment and premium products for exceptional results</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <MapPin className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-white mb-2">South London</h4>
                    <p className="text-white/70">Comprehensive coverage across South London boroughs</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Email Signup */}
            <div className="max-w-md mx-auto">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <Mail className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Get Notified</h3>
                    <p className="text-white/70">
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
                        className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
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
                    <Alert className="mt-4 bg-green-500/20 border-green-500/30">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-300">
                        {submitMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {submitStatus === 'error' && (
                    <Alert className="mt-4 bg-red-500/20 border-red-500/30">
                      <AlertDescription className="text-red-300">
                        {submitMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <p className="text-white/50 text-sm mt-4 text-center">
                    We respect your privacy. No spam, ever.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-white/50 text-sm">
              © 2025 Love4Detailing. Premium mobile car detailing services coming to South London.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}