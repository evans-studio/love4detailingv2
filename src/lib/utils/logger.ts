// Simple logger stub for deployment compatibility
export const log = {
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, meta)
    }
  },
  error: (message: string, error?: Error, meta?: any) => {
    console.error(message, error, meta)
  },
  warn: (message: string, meta?: any) => {
    console.warn(message, meta)
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, meta)
    }
  },
  health: {
    check: (system: string, status: string, meta?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Health check: ${system} - ${status}`, meta)
      }
    }
  }
}