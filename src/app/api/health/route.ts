import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check that doesn't require authentication
    // Just returns OK to indicate the API is running
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'System is healthy'
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'System error'
      },
      { status: 500 }
    )
  }
}