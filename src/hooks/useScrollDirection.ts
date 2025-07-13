'use client'

import { useState, useEffect, useRef } from 'react'

interface UseScrollDirectionOptions {
  threshold?: number
  hideDelay?: number
  initialVisibleDuration?: number
}

interface ScrollState {
  isVisible: boolean
  isAtTop: boolean
  scrollDirection: 'up' | 'down' | null
  scrollY: number
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const {
    threshold = 100,
    hideDelay = 150,
    initialVisibleDuration = 4000
  } = options

  const [scrollState, setScrollState] = useState<ScrollState>({
    isVisible: true,
    isAtTop: true,
    scrollDirection: null,
    scrollY: 0
  })

  const [showInitial, setShowInitial] = useState(true)
  
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const hideTimeout = useRef<NodeJS.Timeout>()

  // Auto-hide initial display
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitial(false)
    }, initialVisibleDuration)
    
    return () => clearTimeout(timer)
  }, [initialVisibleDuration])

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up'
          const scrollDistance = Math.abs(currentScrollY - lastScrollY.current)
          
          // Clear existing hide timeout
          if (hideTimeout.current) {
            clearTimeout(hideTimeout.current)
            hideTimeout.current = undefined
          }
          
          // Determine if at top
          const atTop = currentScrollY < 10
          
          let isVisible = scrollState.isVisible
          
          // Visibility logic
          if (atTop || showInitial) {
            isVisible = true
          } else if (scrollDirection === 'up' && scrollDistance > 10) {
            isVisible = true
          } else if (scrollDirection === 'down' && currentScrollY > threshold) {
            isVisible = false
          } else if (scrollDirection === 'down' && !showInitial) {
            // Delayed hide for small movements
            hideTimeout.current = setTimeout(() => {
              setScrollState(prev => ({ ...prev, isVisible: false }))
            }, hideDelay)
          }
          
          setScrollState({
            isVisible,
            isAtTop: atTop,
            scrollDirection,
            scrollY: currentScrollY
          })
          
          lastScrollY.current = currentScrollY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
      }
    }
  }, [threshold, hideDelay, showInitial, scrollState.isVisible])

  // Mouse proximity activation
  const handleMouseProximity = (clientY: number, activationZone: number = 80) => {
    if (clientY < activationZone && !scrollState.isAtTop) {
      setScrollState(prev => ({ ...prev, isVisible: true }))
    }
  }

  return {
    ...scrollState,
    showInitial,
    shouldShow: showInitial || scrollState.isVisible || scrollState.isAtTop,
    handleMouseProximity
  }
}