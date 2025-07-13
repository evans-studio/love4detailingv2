'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { 
  Menu, 
  X, 
  User, 
  Calendar, 
  Car, 
  Settings, 
  LogOut,
  ChevronDown,
  Sparkles,
  Users,
  BarChart3,
  Clock,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'

interface DynamicHeaderProps {
  className?: string
}

export default function DynamicHeader({ className = '' }: DynamicHeaderProps) {
  const router = useRouter()
  
  // Safely get auth context
  let user = null
  let profile = null
  let signOut = async () => {}
  
  try {
    const auth = useAuth()
    user = auth.user
    profile = auth.profile
    signOut = auth.signOut
  } catch (error) {
    console.warn('DynamicHeader: Auth context not available, rendering anonymous navigation')
  }
  
  // Header visibility and scroll state
  const [isVisible, setIsVisible] = useState(true)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showInitialHeader, setShowInitialHeader] = useState(true)
  
  // Scroll tracking
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const hideTimeout = useRef<NodeJS.Timeout>()
  
  // Auto-hide header after initial display
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialHeader(false)
    }, 4000) // Hide after 4 seconds
    
    return () => clearTimeout(timer)
  }, [])

  // Scroll detection and header visibility logic
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up'
          const scrollDistance = Math.abs(currentScrollY - lastScrollY.current)
          
          // Clear any existing hide timeout
          if (hideTimeout.current) {
            clearTimeout(hideTimeout.current)
            hideTimeout.current = undefined
          }
          
          // Determine if at top of page
          const atTop = currentScrollY < 10
          setIsAtTop(atTop)
          
          // Header visibility logic
          if (atTop) {
            // Always show when at top
            setIsVisible(true)
          } else if (scrollDirection === 'up' && scrollDistance > 10) {
            // Show immediately on scroll up
            setIsVisible(true)
          } else if (scrollDirection === 'down' && currentScrollY > 100) {
            // Hide on scroll down after threshold
            setIsVisible(false)
          } else if (scrollDirection === 'down' && !showInitialHeader) {
            // Set delayed hide for small scroll movements
            hideTimeout.current = setTimeout(() => {
              setIsVisible(false)
            }, 150)
          }
          
          lastScrollY.current = currentScrollY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    // Mouse proximity detection for header activation
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80 && !isAtTop) {
        setIsVisible(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
      }
    }
  }, [isAtTop, showInitialHeader])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut()
      setIsMobileMenuOpen(false)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsMobileMenuOpen(false)
    }

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  // Get navigation items based on user role
  const getNavigationItems = () => {
    if (!user) {
      // Anonymous user navigation
      return [
        { label: 'Services', href: '#services', icon: Sparkles },
        { label: 'About', href: '#about', icon: Users },
        { label: 'Contact', href: '#contact', icon: Phone }
      ]
    }

    if (profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'super_admin') {
      // Admin navigation
      return [
        { label: 'Dashboard', href: '/admin', icon: BarChart3 },
        { label: 'Schedule', href: '/admin/schedule', icon: Clock },
        { label: 'Customers', href: '/admin/customers', icon: Users },
        { label: 'Bookings', href: '/admin/bookings', icon: Calendar }
      ]
    }

    // Customer navigation
    return [
      { label: 'Dashboard', href: '/dashboard', icon: User },
      { label: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
      { label: 'New Booking', href: '/booking', icon: Sparkles },
      { label: 'My Vehicles', href: '/dashboard/vehicles', icon: Car }
    ]
  }

  const navigationItems = getNavigationItems()

  // Determine header visibility
  const shouldShowHeader = showInitialHeader || isVisible || isAtTop

  return (
    <>
      {/* Dynamic Header */}
      <header 
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out
          ${shouldShowHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
          ${isAtTop ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-md border-b border-white/10'}
          ${className}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-3 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 backdrop-blur-sm group-hover:from-purple-600/30 group-hover:to-purple-700/30 transition-all duration-200">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Love4Detailing
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                  >
                    <Icon className="h-4 w-4 group-hover:text-purple-400 transition-colors" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {!user ? (
                <>
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-white/80 hover:text-white transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/booking"
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-purple-500/25"
                  >
                    Book Now
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">Profile</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-red-500/20 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMobileMenuOpen(!isMobileMenuOpen)
              }}
              className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute top-16 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10">
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Navigation Items */}
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <Icon className="h-5 w-5 text-purple-400" />
                    <span className="font-medium text-lg">{item.label}</span>
                  </Link>
                )
              })}

              {/* Mobile Action Buttons */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                {!user ? (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-4 py-3 text-center text-white/80 hover:text-white border border-white/20 rounded-lg font-medium transition-all duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/booking"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-4 py-3 text-center bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold transition-all duration-200"
                    >
                      Book Now
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <User className="h-5 w-5 text-purple-400" />
                      <span className="font-medium text-lg">Profile</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-red-500/20 transition-all duration-200"
                    >
                      <LogOut className="h-5 w-5 text-red-400" />
                      <span className="font-medium text-lg">Sign Out</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}