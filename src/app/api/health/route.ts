import { NextRequest, NextResponse } from 'next/server'
import { withLogging } from '@/lib/middleware/logging'
import { log } from '@/lib/utils/logger'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: HealthServiceStatus
    email: HealthServiceStatus
    filesystem: HealthServiceStatus
    memory: HealthServiceStatus
    external: HealthServiceStatus
  }
  metadata: {
    nodeVersion: string
    platform: string
    requestId: string
  }
}

interface HealthServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  details?: string
  lastChecked: string
}

// Database health check
async function checkDatabaseHealth(): Promise<HealthServiceStatus> {
  const startTime = Date.now()
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const response = await fetch(`${supabaseUrl}/rest/v1/services?select=count&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: responseTime < 1000 ? 'Database connection is fast' : 'Database connection is slow',
        lastChecked: new Date().toISOString()
      }
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        details: `Database connection failed: ${response.status}`,
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
  }
}

// Email service health check
async function checkEmailHealth(): Promise<HealthServiceStatus> {
  const startTime = Date.now()
  
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      return {
        status: 'unhealthy',
        details: 'Resend API key not configured',
        lastChecked: new Date().toISOString()
      }
    }
    
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
      }
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: responseTime < 2000 ? 'Email service is responding well' : 'Email service is slow',
        lastChecked: new Date().toISOString()
      }
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        details: `Email service error: ${response.status}`,
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: `Email service connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
  }
}

// Filesystem health check (disabled for Vercel compatibility)
async function checkFilesystemHealth(): Promise<HealthServiceStatus> {
  return {
    status: 'healthy',
    details: 'Filesystem check disabled for Vercel compatibility',
    lastChecked: new Date().toISOString()
  }
}

// Memory health check
async function checkMemoryHealth(): Promise<HealthServiceStatus> {
  const startTime = Date.now()
  
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage()
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
      const memoryUtilization = (memoryUsedMB / memoryTotalMB) * 100
      
      const responseTime = Date.now() - startTime
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      let details = `Memory usage: ${memoryUsedMB}MB / ${memoryTotalMB}MB (${memoryUtilization.toFixed(1)}%)`
      
      if (memoryUtilization > 90) {
        status = 'unhealthy'
        details = `High memory usage: ${details}`
      } else if (memoryUtilization > 75) {
        status = 'degraded'
        details = `Elevated memory usage: ${details}`
      }
      
      return {
        status,
        responseTime,
        details,
        lastChecked: new Date().toISOString()
      }
    } else {
      return {
        status: 'degraded',
        details: 'Memory monitoring not available in this environment',
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: `Memory check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
  }
}

// External services health check
async function checkExternalHealth(): Promise<HealthServiceStatus> {
  const startTime = Date.now()
  
  try {
    const response = await fetch('https://api.vercel.com/v1/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'Love4Detailing-HealthCheck/1.0'
      }
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.status === 401 || response.status === 403 || response.ok) {
      return {
        status: responseTime < 3000 ? 'healthy' : 'degraded',
        responseTime,
        details: responseTime < 3000 ? 'External connectivity is good' : 'External connectivity is slow',
        lastChecked: new Date().toISOString()
      }
    } else {
      return {
        status: 'degraded',
        responseTime,
        details: `External service unexpected response: ${response.status}`,
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: `External connectivity error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
  }
}

// Get overall system status
function getOverallStatus(services: HealthCheckResult['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status)
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy'
  } else if (statuses.includes('degraded')) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

// Main health check handler
async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = request.headers.get('x-request-id') || `health_${Date.now()}`
  
  log.info('Health check requested', {
    component: 'health-check',
    requestId,
    metadata: {
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    }
  })
  
  try {
    // Run all health checks in parallel
    const [database, email, filesystem, memory, external] = await Promise.all([
      checkDatabaseHealth(),
      checkEmailHealth(),
      checkFilesystemHealth(),
      checkMemoryHealth(),
      checkExternalHealth()
    ])
    
    const services = {
      database,
      email,
      filesystem,
      memory,
      external
    }
    
    const overallStatus = getOverallStatus(services)
    const totalTime = Date.now() - startTime
    
    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metadata: {
        nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
        platform: typeof process !== 'undefined' ? process.platform : 'unknown',
        requestId
      }
    }
    
    // Log the health check result
    log.health.check('system', overallStatus, {
      totalResponseTime: totalTime,
      services: Object.fromEntries(
        Object.entries(services).map(([key, service]) => [key, service.status])
      ),
      requestId
    })
    
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthResult, { status: httpStatus })
    
  } catch (error) {
    log.error('Health check failed', error as Error, {
      component: 'health-check',
      requestId,
      metadata: {
        totalTime: Date.now() - startTime
      }
    })
    
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '0.1.0',
      environment: 'unknown',
      services: {
        database: { status: 'unhealthy', details: 'Health check failed', lastChecked: new Date().toISOString() },
        email: { status: 'unhealthy', details: 'Health check failed', lastChecked: new Date().toISOString() },
        filesystem: { status: 'unhealthy', details: 'Health check failed', lastChecked: new Date().toISOString() },
        memory: { status: 'unhealthy', details: 'Health check failed', lastChecked: new Date().toISOString() },
        external: { status: 'unhealthy', details: 'Health check failed', lastChecked: new Date().toISOString() }
      },
      metadata: {
        nodeVersion: 'unknown',
        platform: 'unknown',
        requestId
      }
    }
    
    return NextResponse.json(errorResult, { status: 503 })
  }
}

export { GET }