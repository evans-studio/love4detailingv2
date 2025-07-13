// Simple audit logger stub for deployment compatibility
export const auditLogger = {
  log: (action: string, details: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Audit: ${action}`, details)
    }
  },
  logUserActivity: (userId: string, action: string, details: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`User Activity: ${userId} - ${action}`, details)
    }
  }
}