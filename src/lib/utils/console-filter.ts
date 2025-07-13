/**
 * Console Filter Utility
 * Suppresses common development warnings and errors that don't affect functionality
 */

// Store original console methods
const originalError = console.error
const originalWarn = console.warn

// List of messages to suppress
const suppressedMessages = [
  '__cf_bm',
  'Cloudflare',
  'has been rejected for invalid domain',
  'Cookie',
  'rejected'
]

// Enhanced console.error that filters out Cloudflare warnings
console.error = (...args: any[]) => {
  const message = args.join(' ')
  
  // Check if this is a Cloudflare cookie warning
  const shouldSuppress = suppressedMessages.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  )
  
  if (!shouldSuppress) {
    originalError.apply(console, args)
  }
}

// Enhanced console.warn that filters out Cloudflare warnings  
console.warn = (...args: any[]) => {
  const message = args.join(' ')
  
  // Check if this is a Cloudflare cookie warning
  const shouldSuppress = suppressedMessages.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  )
  
  if (!shouldSuppress) {
    originalWarn.apply(console, args)
  }
}

// Export utility functions
export const enableConsoleFiltering = () => {
  console.log('🔇 Console filtering enabled - Cloudflare warnings suppressed')
}

export const disableConsoleFiltering = () => {
  console.error = originalError
  console.warn = originalWarn
  console.log('🔊 Console filtering disabled - All messages will show')
}

export const isCloudflareCookieError = (message: string): boolean => {
  return message.includes('__cf_bm') && message.includes('rejected for invalid domain')
}