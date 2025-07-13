import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // This is a setup endpoint that should only be used during development/testing
    // In production, admin roles should be managed through proper admin interface
    
    // Get admin emails from environment variables instead of hardcoding
    const adminEmailsEnv = process.env.ADMIN_EMAILS || ''
    const superAdminEmailEnv = process.env.SUPER_ADMIN_EMAIL || ''
    
    if (!adminEmailsEnv && !superAdminEmailEnv) {
      return NextResponse.json(
        { error: 'No admin emails configured in environment variables' },
        { status: 400 }
      )
    }
    
    const adminEmails = []
    
    // Add regular admin emails (comma-separated)
    if (adminEmailsEnv) {
      adminEmailsEnv.split(',').forEach(email => {
        if (email.trim()) {
          adminEmails.push({ email: email.trim(), role: 'admin' as const })
        }
      })
    }
    
    // Add super admin email
    if (superAdminEmailEnv) {
      adminEmails.push({ email: superAdminEmailEnv.trim(), role: 'super_admin' as const })
    }
    
    const results = []
    
    for (const adminUser of adminEmails) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', adminUser.email)
        .single()
      
      if (existingUser) {
        // Update existing user role
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: adminUser.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
        
        if (updateError) {
          results.push({
            email: adminUser.email,
            status: 'error',
            message: `Failed to update role: ${updateError.message}`
          })
        } else {
          results.push({
            email: adminUser.email,
            status: 'updated',
            message: `Role updated to ${adminUser.role}`
          })
        }
      } else {
        // User doesn't exist yet - they need to sign up first
        results.push({
          email: adminUser.email,
          status: 'pending',
          message: 'User needs to sign up first, then role can be assigned'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('Setup admin users error:', error)
    return NextResponse.json(
      { error: 'Failed to setup admin users' },
      { status: 500 }
    )
  }
} 