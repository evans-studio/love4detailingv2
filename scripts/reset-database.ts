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
    
    // Delete reward transactions first (they depend on customer_rewards)
    const { error: rewardTxError } = await supabase.from('reward_transactions').delete().gt('created_at', '1900-01-01')
    if (rewardTxError) throw rewardTxError
    
    // Delete customer rewards (they depend on users)
    const { error: rewardsError } = await supabase.from('customer_rewards').delete().gt('created_at', '1900-01-01')
    if (rewardsError) throw rewardsError
    
    // Delete booking notes
    const { error: notesError } = await supabase.from('booking_notes').delete().gt('created_at', '1900-01-01')
    if (notesError) throw notesError
    
    // Delete bookings (they depend on available_slots)
    const { error: bookingsError } = await supabase.from('bookings').delete().gt('created_at', '1900-01-01')
    if (bookingsError) throw bookingsError

    // Delete booking locks
    const { error: locksError } = await supabase.from('booking_locks').delete().gt('created_at', '1900-01-01')
    if (locksError) throw locksError

    // Delete available slots
    const { error: availableSlotsError } = await supabase.from('available_slots').delete().gt('created_at', '1900-01-01')
    if (availableSlotsError) throw availableSlotsError

    // Delete schedule slots
    const { error: scheduleSlotsError } = await supabase.from('schedule_slots').delete().gt('created_at', '1900-01-01')
    if (scheduleSlotsError) throw scheduleSlotsError

    // Delete schedule templates
    const { error: templatesError } = await supabase.from('schedule_templates').delete().gt('created_at', '1900-01-01')
    if (templatesError) throw templatesError

    // Delete vehicle photos
    const { error: photosError } = await supabase.from('vehicle_photos').delete().gt('created_at', '1900-01-01')
    if (photosError) throw photosError

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

    // Generate available slots using the new template system
    console.log('Generating new available slots...')
    
    // First, ensure we have a default template (should be created by migration)
    const { data: defaultTemplate } = await supabase
      .from('schedule_templates')
      .select('id')
      .eq('name', 'Default Weekly Schedule')
      .single()

    if (defaultTemplate) {
      // Generate slots for the next 30 days using the template
      const { error: generateError } = await supabase.rpc('generate_slots_from_template', {
        template_id: defaultTemplate.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

      if (generateError) throw generateError
    }

    // Verify results
    console.log('Database reset successful!')
    
    // Check available slots
    const { data: availableSlotsCount, error: availableSlotsCountError } = await supabase
      .from('available_slots')
      .select('*', { count: 'exact' })
    if (availableSlotsCountError) throw availableSlotsCountError
    console.log('Available slots created:', availableSlotsCount.length)
    
    // Check reward transactions
    const { count: rewardTxCount, error: rewardTxCountError } = await supabase
      .from('reward_transactions')
      .select('*', { count: 'exact', head: true })
    if (rewardTxCountError) throw rewardTxCountError
    console.log('Reward transactions remaining:', rewardTxCount)
    
    // Check customer rewards
    const { count: rewardsCount, error: rewardsCountError } = await supabase
      .from('customer_rewards')
      .select('*', { count: 'exact', head: true })
    if (rewardsCountError) throw rewardsCountError
    console.log('Customer rewards records remaining:', rewardsCount)
    
    // Check auth users
    const { data: remainingUsers, error: remainingUsersError } = await supabase.auth.admin.listUsers()
    if (remainingUsersError) throw remainingUsersError
    console.log('Auth users remaining:', remainingUsers.users.length)
    
    // Show sample available slots
    console.log('Sample available slots:')
    console.log(JSON.stringify(availableSlotsCount.slice(0, 5), null, 2))

    console.log('\nIMPORTANT: Please clear your browser local storage and refresh the page to complete the reset.')

  } catch (error) {
    console.error('Error resetting database:', error)
    process.exit(1)
  }
}

resetDatabase() 