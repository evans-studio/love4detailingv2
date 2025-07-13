import { NextRequest, NextResponse } from 'next/server'
import { BookingProcedures } from '@/lib/database/procedures'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { EmailService, BookingEmailData } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  console.log('🚀 Booking creation API called')
  
  try {
    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    const { bookingData } = body

    if (!bookingData) {
      console.log('❌ No booking data provided')
      return NextResponse.json(
        { error: 'Booking data is required' },
        { status: 400 }
      )
    }

    console.log('📋 Booking data received:', JSON.stringify(bookingData, null, 2))
    
    // Detailed vehicle data inspection
    console.log('🔍 Detailed vehicle data inspection:', {
      'bookingData.vehicle_registration': bookingData.vehicle_registration,
      'bookingData.vehicle_make': bookingData.vehicle_make,
      'bookingData.vehicle_model': bookingData.vehicle_model,
      'typeof vehicle_registration': typeof bookingData.vehicle_registration,
      'typeof vehicle_make': typeof bookingData.vehicle_make,
      'typeof vehicle_model': typeof bookingData.vehicle_model,
      'vehicle_registration length': bookingData.vehicle_registration?.length,
      'vehicle_make length': bookingData.vehicle_make?.length,
      'vehicle_model length': bookingData.vehicle_model?.length
    })

    // Validate required fields
    const required = ['customer_email', 'customer_name', 'slot_id', 'service_id', 'vehicle_size']
    const missing = required.filter(field => !bookingData[field])
    
    if (missing.length > 0) {
      console.log('❌ Missing required fields:', missing)
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('✅ All required fields present')

    // Get user from session (optional for bookings)
    console.log('🔐 Getting user session...')
    const supabase = createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('⚠️  User session error:', userError)
    } else {
      console.log('👤 Current user:', user ? `${user.email} (${user.id})` : 'None')
    }

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

    // Use service role for reliable database access
    console.log('🔑 Creating service role client...')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Vehicle ID will be used across multiple scopes
    let vehicleId: string | null = null

    // Check if booking email matches current user email
    const isBookingForCurrentUser = user && user.email === bookingData.customer_email
    console.log('🔍 Account creation decision analysis:')
    console.log('   Current user session:', user ? `${user.email} (${user.id})` : 'No user session')
    console.log('   Booking email:', bookingData.customer_email)
    console.log('   Emails match:', user ? user.email === bookingData.customer_email : 'N/A')
    console.log('   isBookingForCurrentUser:', isBookingForCurrentUser)
    console.log('   Will create account:', !isBookingForCurrentUser && !!bookingData.customer_email)

    // Only link to current user if email matches
    if (isBookingForCurrentUser) {
      bookingData.user_id = user.id
      console.log('🔗 Linking booking to current user:', user.id)
    } else {
      // Don't link to existing user - this is a new customer or guest booking
      bookingData.user_id = null
      console.log('👥 Creating guest/new customer booking')
    }

    // Try stored procedure first
    let data, error
    
    console.log('🔄 Attempting stored procedure booking creation...')
    try {
      const result = await BookingProcedures.createEnhancedBooking(bookingData)
      data = result.data
      error = result.error
      
      if (error) {
        console.log('❌ Stored procedure error:', error)
      } else if (data && data.success) {
        console.log('✅ Stored procedure success:', data)
      } else {
        console.log('❌ Stored procedure returned unsuccessful result:', data)
        error = data?.message || 'Stored procedure failed'
      }
    } catch (procedureError) {
      console.warn('❌ Stored procedure exception:', procedureError)
      error = procedureError
    }

    // Fallback to direct table access if stored procedure fails
    if (error || !data || !data.success) {
      console.log('🔄 Using fallback direct booking creation')
      
      // Test database connection first
      console.log('🔍 Testing database connection...')
      try {
        const { data: testData, error: testError } = await serviceSupabase
          .from('bookings')
          .select('id')
          .limit(1)
        
        if (testError) {
          console.error('❌ Database connection test failed:', testError)
          return NextResponse.json(
            { error: `Database connection failed: ${testError.message}` },
            { status: 500 }
          )
        }
        
        console.log('✅ Database connection test passed')
      } catch (connectionError) {
        console.error('❌ Database connection exception:', connectionError)
        return NextResponse.json(
          { error: 'Database connection failed' },
          { status: 500 }
        )
      }

      // Generate a booking reference (keep under 20 characters for database constraint)
      const timestamp = Date.now().toString().slice(-8) // Last 8 digits of timestamp
      const randomCode = Math.random().toString(36).substr(2, 4).toUpperCase()
      const bookingReference = `L4D${timestamp}${randomCode}`
      console.log('📋 Generated booking reference:', bookingReference, `(${bookingReference.length} chars)`)

      // IMPORTANT: Create vehicle BEFORE booking to ensure proper relationship
      console.log('🚗 Available vehicle data:', {
        vehicle_registration: bookingData.vehicle_registration,
        vehicle_make: bookingData.vehicle_make,
        vehicle_model: bookingData.vehicle_model,
        vehicle_year: bookingData.vehicle_year,
        vehicle_color: bookingData.vehicle_color,
        vehicle_size: bookingData.vehicle_size,
        vehicle_type: bookingData.vehicle_type,
        vehicle_special_requirements: bookingData.vehicle_special_requirements,
        user_id: bookingData.user_id
      })
      
      console.log('🚗 Vehicle creation condition check:', {
        hasRegistration: !!bookingData.vehicle_registration,
        hasMake: !!bookingData.vehicle_make,
        hasModel: !!bookingData.vehicle_model,
        registrationValue: bookingData.vehicle_registration,
        makeValue: bookingData.vehicle_make,
        modelValue: bookingData.vehicle_model,
        conditionMet: !!(bookingData.vehicle_registration && bookingData.vehicle_make && bookingData.vehicle_model)
      })

      // Create vehicle first if we have vehicle data
      // For guest bookings, we'll create the vehicle without a user_id initially
      if (bookingData.vehicle_registration && bookingData.vehicle_make && bookingData.vehicle_model) {
        console.log('🚗 Creating vehicle before booking...')
        
        try {
          // Check if vehicle exists
          const { data: existingVehicle, error: vehicleSearchError } = await serviceSupabase
            .from('vehicles')
            .select('id')
            .eq('registration', bookingData.vehicle_registration)
            .single()
          
          if (vehicleSearchError && vehicleSearchError.code !== 'PGRST116') {
            console.error('❌ Error searching for vehicle:', vehicleSearchError)
          }
          
          if (existingVehicle) {
            console.log('✅ Found existing vehicle:', existingVehicle.id)
            vehicleId = existingVehicle.id
          } else {
            console.log('🔄 Creating new vehicle record...')
            // Create new vehicle record with only columns that exist in the database
            // For guest bookings, user_id will be null initially and updated later if account is created
            const { data: newVehicle, error: vehicleCreateError } = await serviceSupabase
              .from('vehicles')
              .insert({
                user_id: bookingData.user_id || null, // Use null for guest bookings, will be updated later
                registration: bookingData.vehicle_registration,
                make: bookingData.vehicle_make,
                model: bookingData.vehicle_model,
                year: bookingData.vehicle_year || new Date().getFullYear(),
                color: bookingData.vehicle_color || '',
                size: bookingData.vehicle_size || 'medium',
                is_active: true,
                size_confirmed: true, // Mark as confirmed since it came from booking form
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()
            
            if (vehicleCreateError) {
              console.error('❌ Failed to create vehicle:', vehicleCreateError)
              console.error('Vehicle create error details:', JSON.stringify(vehicleCreateError, null, 2))
            } else {
              console.log('✅ Vehicle created successfully:', newVehicle.id)
              vehicleId = newVehicle.id
            }
          }
        } catch (vehicleError) {
          console.error('❌ Vehicle creation error:', vehicleError)
          // Continue without vehicle - booking should still work but won't have vehicle relationship
        }
      }
      
      // Get vehicle size for pricing calculation
      const vehicleSize = bookingData.vehicle_size || 'medium'
      
      // Prepare booking record with vehicle_id if created
      const bookingRecord = {
        user_id: bookingData.user_id || null,
        vehicle_id: vehicleId, // Now should have a valid vehicle_id
        slot_id: bookingData.slot_id,
        service_id: bookingData.service_id,
        booking_reference: bookingReference,
        customer_name: (bookingData.customer_name || '').substring(0, 100), // Limit to 100 chars
        customer_email: (bookingData.customer_email || '').substring(0, 100), // Limit to 100 chars
        customer_phone: (bookingData.customer_phone || '').substring(0, 20), // Limit to 20 chars
        service_location: (bookingData.service_address || '').substring(0, 255), // Limit to 255 chars
        notes: (bookingData.special_instructions || '').substring(0, 1000), // Limit to 1000 chars
        customer_instructions: (bookingData.special_instructions || '').substring(0, 1000), // Limit to 1000 chars
        payment_method: bookingData.payment_method || 'cash',
        status: 'confirmed',
        service_price_pence: await calculatePrice(vehicleSize, serviceSupabase),
        total_price_pence: await calculatePrice(vehicleSize, serviceSupabase),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('💾 Creating booking record with vehicle_id:', vehicleId)
      console.log('💾 Full booking record:', JSON.stringify(bookingRecord, null, 2))

      // Create booking record directly
      const { data: bookingResult, error: bookingError } = await serviceSupabase
        .from('bookings')
        .insert(bookingRecord)
        .select()
        .single()

      if (bookingError) {
        console.error('❌ Direct booking creation failed:', bookingError)
        return NextResponse.json({ error: bookingError.message }, { status: 500 })
      }
      
      console.log('✅ Booking created successfully:', bookingResult)

      // Update the slot to mark it as booked (simple approach)
      await serviceSupabase
        .from('available_slots')
        .update({ 
          max_bookings: 0,
          is_blocked: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingData.slot_id)

      data = {
        booking_id: bookingResult.id,
        booking_reference: bookingReference,
        status: 'confirmed',
        message: 'Booking created successfully'
      }
    }

    // Handle account creation for new customers
    console.log('🔍 Final account creation check:')
    console.log('   isBookingForCurrentUser:', isBookingForCurrentUser)
    console.log('   customer_email:', bookingData.customer_email)
    console.log('   condition (!isBookingForCurrentUser && bookingData.customer_email):', !isBookingForCurrentUser && bookingData.customer_email)
    
    if (!isBookingForCurrentUser && bookingData.customer_email) {
      console.log('👤 Creating account for new customer:', bookingData.customer_email)
      console.log('👤 Account creation conditions met:', {
        isBookingForCurrentUser: isBookingForCurrentUser,
        hasEmail: !!bookingData.customer_email,
        email: bookingData.customer_email
      })
      
      try {
        // First check if user already exists
        console.log('🔍 Checking if user already exists...')
        const existingUserResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
          }
        })
        
        if (existingUserResponse.ok) {
          const { users } = await existingUserResponse.json()
          const existingUser = users.find((u: any) => u.email === bookingData.customer_email)
          
          if (existingUser) {
            console.log('👤 User already exists:', existingUser.id)
            // Link the booking to the existing user
            const { error: linkError } = await serviceSupabase
              .from('bookings')
              .update({ user_id: existingUser.id })
              .eq('id', data.booking_id)
            
            if (linkError) {
              console.error('❌ Failed to link booking to existing user:', linkError)
            } else {
              console.log('✅ Booking linked to existing user')
              data.user_id = existingUser.id
              data.existing_user_linked = true
              data.message = 'Booking created and linked to existing account'
            }
            
            // Skip account creation since user exists
            throw new Error('USER_EXISTS')
          }
        }
        
        // Create new auth user using REST API (more reliable)
        console.log('🔐 Using REST API to create user...')
        const createUserResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
          },
          body: JSON.stringify({
            email: bookingData.customer_email,
            email_confirm: true, // Confirm email immediately for booking users
            user_metadata: {
              name: bookingData.customer_name,
              phone: bookingData.customer_phone,
              created_via: 'booking_system'
            }
          })
        })
        
        let newAuthUser = null
        let authError = null
        
        if (!createUserResponse.ok) {
          const errorText = await createUserResponse.text()
          console.error('❌ User creation failed:', createUserResponse.status, errorText)
          console.error('❌ Request details:', {
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
            method: 'POST',
            email: bookingData.customer_email
          })
          authError = { message: errorText }
        } else {
          newAuthUser = await createUserResponse.json()
          console.log('✅ User created via REST API:', newAuthUser.id)
          console.log('✅ Created user details:', newAuthUser)
        }
          
          if (authError) {
            console.error('❌ Auth user creation failed:', authError)
          } else if (newAuthUser && newAuthUser.id) {
            console.log('✅ Auth user created:', newAuthUser.id)
            
            // Set account created flag - user can now sign in
            data.account_created = true
            data.user_id = newAuthUser.id
            
            // Create user profile in public.users table
            console.log('📋 Creating user profile in public.users table...')
            const { data: profileData, error: profileError } = await serviceSupabase
              .from('users')
              .insert({
                id: newAuthUser.id,
                email: bookingData.customer_email,
                full_name: bookingData.customer_name,
                phone: bookingData.customer_phone || null,
                role: 'customer',
                is_active: true,
                email_verified_at: new Date().toISOString(), // Set as verified since we confirmed email
                marketing_opt_in: false,
                preferred_communication: 'email',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()
            
            if (profileError) {
              console.error('❌ User profile creation failed:', profileError)
              console.error('❌ Profile error details:', JSON.stringify(profileError, null, 2))
              
              // Even if profile creation fails, auth user exists so set flag
              data.account_created = true
              data.user_id = newAuthUser.id
              data.message = 'Booking created and auth account set up (profile creation failed)'
            } else {
              console.log('✅ User profile created successfully:', profileData?.id || 'no id returned')
              console.log('✅ Profile data:', JSON.stringify(profileData, null, 2))
              
              // Verify the profile was actually created by querying it back
              console.log('🔍 Verifying profile creation...')
              const { data: verifyProfile, error: verifyError } = await serviceSupabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', newAuthUser.id)
                .single()
              
              if (verifyError) {
                console.error('❌ Profile verification failed:', verifyError)
                data.message = 'Booking created and auth account set up (profile verification failed)'
              } else {
                console.log('✅ Profile verification successful:', verifyProfile)
                data.message = 'Booking created and account set up successfully'
              }
              
              // Link the booking to the new user
              console.log('🔗 Linking booking to new user...')
              const { error: linkError } = await serviceSupabase
                .from('bookings')
                .update({ user_id: newAuthUser.id })
                .eq('id', data.booking_id)
              
              if (linkError) {
                console.error('❌ Booking linking failed:', linkError)
              } else {
                console.log('✅ Booking linked to user')
                
                // Also update vehicle ownership if we created a vehicle
                if (vehicleId) {
                  console.log('🔗 Updating vehicle ownership to new user...')
                  const { error: vehicleUpdateError } = await serviceSupabase
                    .from('vehicles')
                    .update({ user_id: newAuthUser.id })
                    .eq('id', vehicleId)
                  
                  if (vehicleUpdateError) {
                    console.error('❌ Vehicle ownership update failed:', vehicleUpdateError)
                  } else {
                    console.log('✅ Vehicle ownership updated to new user')
                  }
                }
                
                // Add account creation info to response
                data.account_created = true
                data.user_id = newAuthUser.id
                data.message = 'Booking created and account set up successfully'
              }
            }
          }
      } catch (accountError: any) {
        if (accountError.message === 'USER_EXISTS') {
          console.log('✅ User already exists - booking linked successfully')
        } else {
          console.error('❌ Account creation error:', accountError)
          // Continue without account creation - booking should still work
        }
      }
    } else {
      console.log('❌ Account creation skipped - conditions not met')
      console.log('❌ Debug values:', {
        isBookingForCurrentUser: isBookingForCurrentUser,
        hasEmail: !!bookingData.customer_email,
        email: bookingData.customer_email,
        conditionMet: !isBookingForCurrentUser && bookingData.customer_email
      })
    }

    // Vehicle creation already handled earlier in the process
    console.log('✅ Vehicle creation completed earlier - vehicle_id:', vehicleId)

    // 5. Award reward points for successful booking
    console.log('\n💰 REWARDING POINTS FOR BOOKING')
    console.log('-' .repeat(30))
    
    const finalUserIdForRewards = data.user_id || bookingData.user_id
    if (finalUserIdForRewards && data.booking_id) {
      try {
        console.log('🎁 Awarding reward points for booking completion')
        
        // Calculate points to award (1 point per £1 spent + 50 bonus points)
        const servicePricePounds = Math.round((await calculatePrice(bookingData.vehicle_size, serviceSupabase)) / 100)
        const pointsFromSpending = servicePricePounds // 1 point per £1
        const completionBonus = 50 // 50 bonus points for booking completion
        const totalPointsToAward = pointsFromSpending + completionBonus
        
        console.log(`💰 Points calculation:`)
        console.log(`   - Service price: £${servicePricePounds}`)
        console.log(`   - Points from spending: ${pointsFromSpending}`)
        console.log(`   - Completion bonus: ${completionBonus}`)
        console.log(`   - Total points to award: ${totalPointsToAward}`)
        
        // Award points directly through database
        // Get or create customer rewards record
        let { data: rewardsData, error: rewardsError } = await serviceSupabase
          .from('customer_rewards')
          .select('*')
          .eq('user_id', finalUserIdForRewards)
          .single()

        if (rewardsError && rewardsError.code === 'PGRST116') {
          // Create rewards record if it doesn't exist
          const { data: newRewards, error: createError } = await serviceSupabase
            .from('customer_rewards')
            .insert([{
              user_id: finalUserIdForRewards,
              customer_email: bookingData.customer_email,
              total_points: 0,
              points_lifetime: 0,
              points_pending: 0,
              current_tier: 'bronze',
              tier_progress: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (createError) {
            console.error('❌ Error creating rewards record:', createError)
            throw createError
          }
          rewardsData = newRewards
        } else if (rewardsError) {
          console.error('❌ Error fetching rewards record:', rewardsError)
          throw rewardsError
        }

        // Calculate new totals
        const currentPoints = rewardsData.total_points || 0
        const newTotal = currentPoints + totalPointsToAward
        const newLifetime = Math.max(rewardsData.points_lifetime || 0, newTotal)
        
        // Calculate new tier
        const newTier = newTotal >= 2000 ? 'platinum' : 
                       newTotal >= 1000 ? 'gold' : 
                       newTotal >= 500 ? 'silver' : 'bronze'
        
        // Update rewards record
        const { error: updateError } = await serviceSupabase
          .from('customer_rewards')
          .update({
            total_points: newTotal,
            points_lifetime: newLifetime,
            current_tier: newTier,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', finalUserIdForRewards)

        if (updateError) {
          console.error('❌ Error updating rewards:', updateError)
          throw updateError
        }

        // Create transaction record
        const { error: transactionError } = await serviceSupabase
          .from('reward_transactions')
          .insert([{
            customer_reward_id: rewardsData.id,
            booking_id: data.booking_id,
            transaction_type: 'earned',
            points_amount: totalPointsToAward,
            description: `Booking completion: ${data.booking_reference}`,
            created_at: new Date().toISOString()
          }])

        if (transactionError) {
          console.error('❌ Error creating transaction:', transactionError)
          // Continue without failing - points were still awarded
        } else {
          console.log('✅ Reward transaction created successfully')
        }

        console.log('✅ Reward points awarded successfully')
        data.points_awarded = totalPointsToAward
        data.new_tier = newTier
        data.message = `${data.message || 'Booking created successfully'} and ${totalPointsToAward} reward points awarded`
        
      } catch (rewardsError) {
        console.error('❌ Error awarding reward points:', rewardsError)
        // Continue without failing - booking is still successful
      }
    } else {
      console.log('❌ Cannot award points - missing user ID or booking ID')
    }

    // Send booking confirmation emails
    console.log('\n📧 SENDING BOOKING CONFIRMATION EMAILS')
    console.log('-'.repeat(40))
    
    if (data?.booking_id && data?.booking_reference) {
      try {
        console.log('📧 Preparing email data for booking:', data.booking_reference)
        
        // Prepare email data from booking information
        const emailData: BookingEmailData = {
          booking_reference: data.booking_reference,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone || 'Not provided',
          service_name: 'Full Car Detailing Service', // TODO: Get from service_id lookup
          service_date: new Date().toISOString().split('T')[0], // TODO: Get from slot_id lookup
          service_time: '10:00', // TODO: Get from slot_id lookup
          service_location: bookingData.service_address || 'Customer address',
          vehicle_make: bookingData.vehicle_make || 'Unknown',
          vehicle_model: bookingData.vehicle_model || 'Vehicle',
          vehicle_registration: bookingData.vehicle_registration || 'Not provided',
          total_price_pence: await calculatePrice(bookingData.vehicle_size, serviceSupabase),
          special_instructions: bookingData.special_instructions,
          admin_phone: '07123 456789', // TODO: Get from settings
          admin_email: 'zell@love4detailing.com'
        }

        console.log('📧 Email data prepared:', {
          reference: emailData.booking_reference,
          customer: emailData.customer_name,
          email: emailData.customer_email,
          vehicle: `${emailData.vehicle_make} ${emailData.vehicle_model}`,
          price: `£${(emailData.total_price_pence / 100).toFixed(2)}`
        })

        // Send confirmation emails (don't wait for completion to avoid blocking)
        EmailService.sendBookingConfirmation(emailData)
          .then(result => {
            if (result.success) {
              console.log('✅ Booking confirmation email sent successfully:', result.messageId)
            } else {
              console.error('❌ Booking confirmation email failed:', result.error)
            }
          })
          .catch(emailError => {
            console.error('❌ Email service error:', emailError)
          })

        console.log('✅ Booking confirmation email triggered (async)')
        data.email_triggered = true
        
      } catch (emailError) {
        console.error('❌ Error preparing booking confirmation email:', emailError)
        data.email_error = 'Failed to prepare email'
        // Don't fail the booking if email preparation fails
      }
    } else {
      console.log('❌ Cannot send emails - missing booking ID or reference')
      data.email_skipped = 'Missing booking data'
    }

    console.log('\n🎉 Booking creation completed successfully')
    console.log('📊 Final response data:', JSON.stringify(data, null, 2))
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('💥 Booking creation error:', error)
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

// Helper function to calculate price based on vehicle size from database
async function calculatePrice(vehicleSize: string, serviceSupabase: any): Promise<number> {
  try {
    const { data: pricing, error } = await serviceSupabase
      .from('service_pricing')
      .select('price_pence')
      .eq('service_id', '6856143e-eb1d-4776-bf6b-3f6149f36901') // Full Valet service
      .eq('vehicle_size', vehicleSize)
      .single()

    if (error || !pricing) {
      console.log(`No pricing found for vehicle size: ${vehicleSize}, using medium as fallback`)
      // Fallback to medium pricing if specific size not found
      const { data: fallbackPricing } = await serviceSupabase
        .from('service_pricing')
        .select('price_pence')
        .eq('service_id', '6856143e-eb1d-4776-bf6b-3f6149f36901')
        .eq('vehicle_size', 'medium')
        .single()
      
      return fallbackPricing?.price_pence || 7500 // Final fallback to £75
    }

    return pricing.price_pence
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return 7500 // Fallback to £75
  }
}