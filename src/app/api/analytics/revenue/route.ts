import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsProcedures } from '@/lib/database/procedures'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') as 'week' | 'month' | 'year' || 'month'

    const { data, error } = await AnalyticsProcedures.getRevenueDashboard(period)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}