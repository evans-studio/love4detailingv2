import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Rewards Transactions API Route
 * Handles fetching customer reward transaction history
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First get the customer rewards record
    const { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (rewardsError) {
      console.error('Error fetching customer rewards:', rewardsError)
      return NextResponse.json({
        data: [],
        error: null
      })
    }

    // Get reward transactions for the user
    const { data: transactions, error: transactionsError } = await serviceSupabase
      .from('reward_transactions')
      .select(`
        id,
        transaction_type,
        points_amount,
        description,
        created_at,
        booking_id,
        expires_at
      `)
      .eq('customer_reward_id', rewardsData.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (transactionsError) {
      console.error('Error fetching reward transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch reward transactions' },
        { status: 500 }
      )
    }

    // Format transactions for frontend
    const formattedTransactions = (transactions || []).map((transaction: any) => ({
      id: transaction.id,
      type: transaction.transaction_type,
      points: transaction.points_amount,
      description: transaction.description,
      date: transaction.created_at,
      booking_reference: transaction.booking_id ? `#${transaction.booking_id.slice(-6)}` : undefined
    }))

    return NextResponse.json({
      data: formattedTransactions,
      error: null
    })

  } catch (error) {
    console.error('Error in rewards transactions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}