'use client'

import { ReactNode, useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface PortalDropdownProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement>
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  offset?: { x: number; y: number }
  className?: string
}

export default function PortalDropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
  align = 'right',
  offset,
  className = ''
}: PortalDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  
  // Stable offset default to prevent infinite re-renders
  const stableOffset = useMemo(() => offset || { x: 0, y: 12 }, [offset])

  // Ensure we're mounted before creating portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate dropdown position
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !mounted) return

    const calculatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect()
      const dropdownElement = dropdownRef.current
      
      if (!dropdownElement) return

      const dropdownRect = dropdownElement.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top = triggerRect.bottom + stableOffset.y
      let left = triggerRect.left + stableOffset.x

      // Align dropdown based on align prop
      switch (align) {
        case 'right':
          left = triggerRect.right - dropdownRect.width + stableOffset.x
          break
        case 'center':
          left = triggerRect.left + (triggerRect.width / 2) - (dropdownRect.width / 2) + stableOffset.x
          break
        case 'left':
        default:
          left = triggerRect.left + stableOffset.x
          break
      }

      // Ensure dropdown stays within viewport
      if (left + dropdownRect.width > viewportWidth) {
        left = viewportWidth - dropdownRect.width - 8
      }
      if (left < 8) {
        left = 8
      }

      // If dropdown would go below viewport, show above trigger
      if (top + dropdownRect.height > viewportHeight) {
        top = triggerRect.top - dropdownRect.height - stableOffset.y
      }

      // Ensure dropdown doesn't go above viewport
      if (top < 8) {
        top = 8
      }

      setPosition({ top, left })
    }

    // Use a timeout to avoid immediate re-renders
    const timeoutId = setTimeout(calculatePosition, 0)

    // Recalculate on window resize
    const handleResize = () => calculatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
    }
  }, [isOpen, align, stableOffset, mounted]) // Use stable offset

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Don't close if clicking on trigger or dropdown
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      
      onClose()
    }

    // Handle escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, triggerRef])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      ref={dropdownRef}
      className={`fixed bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-xl dropdown-enter ${className}`}
      style={{
        top: position.top,
        left: position.left,
        zIndex: 99999 // Guaranteed highest z-index
      }}
      role="menu"
      aria-label="Dropdown menu"
    >
      {children}
    </div>,
    document.body
  )
}