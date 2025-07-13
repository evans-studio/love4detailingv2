'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle } from 'lucide-react'

// Error types for different scenarios
export interface AppError extends Error {
  code?: string
  context?: any
  recoverable?: boolean
  userMessage?: string
}

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean // Whether to isolate errors to this boundary
}

// Error fallback component props
interface ErrorFallbackProps {
  error: AppError
  resetErrorBoundary: () => void
  errorInfo?: ErrorInfo
}

// Custom error classes for different scenarios
export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR'
  recoverable = true
  userMessage = 'Network connection issue. Please check your internet connection and try again.'

  constructor(message?: string) {
    super(message || 'Network error occurred')
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTH_ERROR'
  recoverable = true
  userMessage = 'Authentication failed. Please log in again.'

  constructor(message?: string) {
    super(message || 'Authentication error')
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR'
  recoverable = true
  userMessage = 'Please check your input and try again.'

  constructor(message?: string, public field?: string) {
    super(message || 'Validation error')
    this.name = 'ValidationError'
  }
}

export class ServerError extends Error implements AppError {
  code = 'SERVER_ERROR'
  recoverable = true
  userMessage = 'Server error occurred. Please try again in a few moments.'

  constructor(message?: string, public status?: number) {
    super(message || 'Server error')
    this.name = 'ServerError'
  }
}

export class CriticalError extends Error implements AppError {
  code = 'CRITICAL_ERROR'
  recoverable = false
  userMessage = 'A critical error occurred. Please refresh the page or contact support.'

  constructor(message?: string) {
    super(message || 'Critical error')
    this.name = 'CriticalError'
  }
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary, errorInfo }: ErrorFallbackProps) {
  const [copied, setCopied] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)

  // Get user-friendly error message
  const getUserMessage = (error: AppError): string => {
    if (error.userMessage) return error.userMessage
    
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.'
      case 'AUTH_ERROR':
        return 'Your session has expired. Please log in again.'
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.'
      case 'SERVER_ERROR':
        return 'Server error occurred. Our team has been notified.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  // Get recovery suggestions
  const getRecoverySuggestions = (error: AppError): string[] => {
    const suggestions: string[] = []
    
    switch (error.code) {
      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection')
        suggestions.push('Try refreshing the page')
        suggestions.push('Wait a moment and try again')
        break
      case 'AUTH_ERROR':
        suggestions.push('Log out and log back in')
        suggestions.push('Clear your browser cache')
        suggestions.push('Check if your session expired')
        break
      case 'VALIDATION_ERROR':
        suggestions.push('Review your input for errors')
        suggestions.push('Make sure all required fields are filled')
        suggestions.push('Check for special character restrictions')
        break
      case 'SERVER_ERROR':
        suggestions.push('Wait a few minutes and try again')
        suggestions.push('Check our status page for known issues')
        suggestions.push('Contact support if the problem persists')
        break
      default:
        suggestions.push('Refresh the page')
        suggestions.push('Try the action again')
        suggestions.push('Contact support if the issue continues')
    }
    
    return suggestions
  }

  // Copy error details to clipboard
  const copyErrorDetails = async () => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack: errorInfo?.componentStack,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  // Handle different recovery actions
  const handleRecovery = (action: string) => {
    switch (action) {
      case 'retry':
        resetErrorBoundary()
        break
      case 'refresh':
        window.location.reload()
        break
      case 'home':
        window.location.href = '/'
        break
      case 'logout':
        try {
          // Clear local storage
          localStorage.clear()
          sessionStorage.clear()
          window.location.href = '/auth/login'
        } catch (err) {
          console.error('Logout failed:', err)
          window.location.href = '/auth/login'
        }
        break
      default:
        resetErrorBoundary()
    }
  }

  const userMessage = getUserMessage(error)
  const suggestions = getRecoverySuggestions(error)
  const isRecoverable = error.recoverable !== false

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            {error.code === 'CRITICAL_ERROR' ? 'Critical Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {userMessage}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Recovery suggestions */}
          {suggestions.length > 0 && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="font-medium text-primary mb-2">Try these solutions:</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isRecoverable && (
              <Button
                onClick={() => handleRecovery('retry')}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => handleRecovery('refresh')}
              className="flex-1 border-border text-foreground hover:bg-primary/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleRecovery('home')}
              className="flex-1 border-border text-foreground hover:bg-primary/10"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Authentication error specific action */}
          {error.code === 'AUTH_ERROR' && (
            <Button
              variant="outline"
              onClick={() => handleRecovery('logout')}
              className="w-full border-border text-foreground hover:bg-primary/10"
            >
              Log Out & Try Again
            </Button>
          )}

          {/* Error details toggle */}
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Error Details
            </Button>

            {showDetails && (
              <div className="mt-4 space-y-3">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Error Details</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyErrorDetails}
                      className="h-8 px-2"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-l4d-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Error:</strong> {error.message}</div>
                    <div><strong>Code:</strong> {error.code || 'Unknown'}</div>
                    <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-foreground">Stack Trace</summary>
                        <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  If this error persists, please copy the error details and contact our support team.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main error boundary component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error for monitoring
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <ErrorFallback
          error={this.state.error as AppError}
          resetErrorBoundary={this.resetErrorBoundary}
          errorInfo={this.state.errorInfo || undefined}
        />
      )
    }

    return this.props.children
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />
}

// Hook for throwing errors from components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error | string, context?: any) => {
    let errorObj: AppError

    if (typeof error === 'string') {
      errorObj = new Error(error) as AppError
    } else {
      errorObj = error as AppError
    }

    if (context) {
      errorObj.context = context
    }

    // Log error for now (could show toast if store is available)
    console.error('Error handled:', errorObj)

    // Throw error to be caught by error boundary
    throw errorObj
  }, [])

  return { handleError }
}

// Utility functions for creating specific error types
export const createNetworkError = (message?: string) => new NetworkError(message)
export const createAuthError = (message?: string) => new AuthenticationError(message)
export const createValidationError = (message?: string, field?: string) => new ValidationError(message, field)
export const createServerError = (message?: string, status?: number) => new ServerError(message, status)
export const createCriticalError = (message?: string) => new CriticalError(message)

// Error boundary for specific components
export function ScheduleErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolate={true}
      fallback={
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Schedule Error</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load schedule data. Please refresh the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function BookingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolate={true}
      fallback={
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Booking Error</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load booking data. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
} 