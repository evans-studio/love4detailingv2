'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/lib/store'
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  onClose: (id: string) => void
}

function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isLeaving, setIsLeaving] = React.useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match exit animation duration
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-l4d-success" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-l4d-warning" />
      case 'info':
        return <Info className="h-5 w-5 text-primary" />
      default:
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  const getStyles = () => {
    const baseStyles = "border-l-4 bg-card border-border shadow-lg"
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-l-l4d-success`
      case 'error':
        return `${baseStyles} border-l-destructive`
      case 'warning':
        return `${baseStyles} border-l-l4d-warning`
      case 'info':
        return `${baseStyles} border-l-primary`
      default:
        return `${baseStyles} border-l-primary`
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-center p-4 mb-3 rounded-lg transition-all duration-300 ease-in-out transform max-w-sm",
        getStyles(),
        isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        isLeaving && "-translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start space-x-3 flex-1">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-5">
            {message}
          </p>
        </div>
      </div>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [mounted, setMounted] = React.useState(false)
  const toasts = useAppStore(state => state.ui.toasts)
  const removeToast = useAppStore(state => state.removeToast)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>,
    document.body
  )
} 