import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetDatabase() {
  try {
    console.log('Starting database reset...')

    // Delete data from tables in correct order
    console.log('Deleting existing data...')
    
    // Delete reward transactions first (they depend on bookings)
    const { error: rewardTxError } = await supabase.from('reward_transactions').delete().gt('created_at', '1900-01-01')
    if (rewardTxError) throw rewardTxError
    
    // Delete rewards (they depend on users)
    const { error: rewardsError } = await supabase.from('rewards').delete().gt('created_at', '1900-01-01')
    if (rewardsError) throw rewardsError
    
    // Delete bookings (they depend on time_slots)
    const { error: bookingsError } = await supabase.from('bookings').delete().gt('created_at', '1900-01-01')
    if (bookingsError) throw bookingsError

    // Delete time slots
    const { error: timeSlotsError } = await supabase.from('time_slots').delete().gt('created_at', '1900-01-01')
    if (timeSlotsError) throw timeSlotsError

    // Delete vehicles
    const { error: vehiclesError } = await supabase.from('vehicles').delete().gt('created_at', '1900-01-01')
    if (vehiclesError) throw vehiclesError

    // Delete users
    const { error: usersError } = await supabase.from('users').delete().gt('created_at', '1900-01-01')
    if (usersError) throw usersError

    // Delete all auth users
    console.log('Deleting auth users...')
    const { data: users, error: authUsersError } = await supabase.auth.admin.listUsers()
    if (authUsersError) throw authUsersError

    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) throw deleteError
    }

    // Generate time slots for next 14 days
    console.log('Generating new time slots...')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
    
    const timeSlots = []
    const times = ['10:00:00', '11:30:00', '13:00:00', '14:30:00', '16:00:00']
    
    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() + i)
      
      // Skip Sundays
      if (currentDate.getDay() === 0) continue
      
      for (const time of times) {
        timeSlots.push({
          slot_date: currentDate.toISOString().split('T')[0],
          slot_time: time,
          is_booked: false
        })
      }
    }

    // Use upsert to handle existing time slots
    const { error: upsertError } = await supabase
      .from('time_slots')
      .upsert(timeSlots, {
        onConflict: 'slot_date,slot_time',
        ignoreDuplicates: false
      })

    if (upsertError) throw upsertError

    // Verify results
    console.log('Database reset successful!')
    
    // Check time slots
    const { data: timeSlotsCount, error: timeSlotsCountError } = await supabase
      .from('time_slots')
      .select('*', { count: 'exact' })
    if (timeSlotsCountError) throw timeSlotsCountError
    console.log('Time slots created:', timeSlotsCount.length)
    
    // Check reward transactions
    const { count: rewardTxCount, error: rewardTxCountError } = await supabase
      .from('reward_transactions')
      .select('*', { count: 'exact', head: true })
    if (rewardTxCountError) throw rewardTxCountError
    console.log('Reward transactions remaining:', rewardTxCount)
    
    // Check rewards
    const { count: rewardsCount, error: rewardsCountError } = await supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
    if (rewardsCountError) throw rewardsCountError
    console.log('Rewards records remaining:', rewardsCount)
    
    // Check auth users
    const { data: remainingUsers, error: remainingUsersError } = await supabase.auth.admin.listUsers()
    if (remainingUsersError) throw remainingUsersError
    console.log('Auth users remaining:', remainingUsers.users.length)
    
    // Show sample time slots
    console.log('Sample time slots:')
    console.log(JSON.stringify(timeSlotsCount.slice(0, 5), null, 2))

    console.log('\nIMPORTANT: Please clear your browser local storage and refresh the page to complete the reset.')

  } catch (error) {
    console.error('Error resetting database:', error)
    process.exit(1)
  }
}

resetDatabase() 