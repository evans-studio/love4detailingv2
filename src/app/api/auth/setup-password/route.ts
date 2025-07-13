import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('🔐 Password setup API called')
  
  try {
    console.log('📝 Reading request body...')
    const body = await request.json()
    console.log('📝 Request body received:', body)
    
    const { email, password } = body
    
    if (!email || !password) {
      console.log('❌ Missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    console.log('✅ Email and password provided')
    
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables')
      console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    console.log('✅ Environment variables verified')
    
    // Use service role for reliable database access
    console.log('🔑 Creating service role client...')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('✅ Service client created')
    
    // Test the admin API availability
    console.log('🧪 Testing admin API availability...')
    console.log('Admin API exists:', !!serviceSupabase.auth.admin)
    console.log('listUsers method exists:', !!serviceSupabase.auth.admin?.listUsers)
    
    console.log('📧 Setting password for user:', email)
    
    // Try the admin API approach first
    console.log('🔄 Using admin API to update password...')
    
    try {
      // Check if admin API is available
      if (!serviceSupabase.auth.admin || !serviceSupabase.auth.admin.listUsers) {
        console.error('❌ Admin API not available, falling back to REST API')
        throw new Error('Admin API not available')
      }
      
      // Get user by email using admin API
      const { data: allUsers, error: getUserError } = await serviceSupabase.auth.admin.listUsers()
      const userData = allUsers?.users?.find(u => u.email === email)
      
      if (getUserError) {
        console.error('❌ Error getting user:', getUserError)
        throw getUserError
      }
      
      if (!userData) {
        console.error('❌ User not found:', email)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      console.log('👤 Found user:', userData.id)
      
      // Update user password and confirm email
      const { data: updateData, error: updateError } = await serviceSupabase.auth.admin.updateUserById(
        userData.id,
        {
          password: password,
          email_confirm: true
        }
      )
      
      if (updateError) {
        console.error('❌ Error updating user:', updateError)
        throw updateError
      }
      
      console.log('✅ Password and email confirmation updated successfully')
      console.log('📊 Update result:', updateData)
      
    } catch (adminError) {
      console.error('❌ Admin API failed, trying REST API fallback:', adminError)
      
      // Fallback to REST API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
          }
        })
        
        if (!response.ok) {
          console.error('❌ Failed to fetch users:', response.status, response.statusText)
          return NextResponse.json(
            { error: `Failed to fetch users: ${response.statusText}` },
            { status: 500 }
          )
        }
        
        const { users } = await response.json()
        const user = users.find((u: any) => u.email === email)
        
        if (!user) {
          console.error('❌ User not found:', email)
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }
        
        console.log('👤 Found user via REST API:', user.id)
        
        // Update the user's password and confirm email
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
          },
          body: JSON.stringify({
            password: password,
            email_confirmed_at: new Date().toISOString()
          })
        })
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error('❌ Failed to update password:', updateResponse.status, errorText)
          return NextResponse.json(
            { error: `Failed to update password: ${errorText}` },
            { status: 500 }
          )
        }
        
        const updateResult = await updateResponse.json()
        console.log('✅ Password updated successfully via REST API')
        console.log('📊 Update response:', updateResult)
        
      } catch (restError) {
        console.error('❌ REST API also failed:', restError)
        return NextResponse.json(
          { error: `Both admin API and REST API failed: ${restError instanceof Error ? restError.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password set successfully' 
    })
    
  } catch (error) {
    console.error('💥 Password setup error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}