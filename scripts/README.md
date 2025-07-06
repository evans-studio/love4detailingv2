# End-to-End Testing Scripts

## Booking Flow Test

The `test-booking-flow.ts` script performs a complete end-to-end test of the booking system, including:
- User creation
- Vehicle registration
- Time slot selection
- Booking creation
- Rewards processing

### Prerequisites

1. Ensure your database has the required tables and initial data:

```sql
-- Required vehicle sizes
INSERT INTO vehicle_sizes (label, price_pence)
VALUES 
    ('Small', 4999),
    ('Medium', 5999),
    ('Large', 7999),
    ('Extra Large', 9999)
ON CONFLICT (label) 
DO UPDATE SET 
    price_pence = EXCLUDED.price_pence,
    updated_at = TIMEZONE('utc', NOW());
```

2. Environment variables in `.env`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Running the Test

```bash
# Install dependencies if needed
npm install

# Run the test
npx ts-node scripts/test-booking-flow.ts
```

### Test Flow

1. **User Creation**
   - Creates a new test user with email and profile data
   - Verifies user creation in the database

2. **Vehicle Creation**
   - Registers a test vehicle (BMW M3)
   - Tests vehicle size mapping
   - Logs unmatched vehicles if needed

3. **Time Slot Creation**
   - Creates a slot for tomorrow at 10 AM
   - Verifies slot availability

4. **Booking Creation**
   - Creates a booking linking user, vehicle, and time slot
   - Verifies all relationships and data integrity
   - Checks booking reference format

5. **Rewards Processing**
   - Calculates and adds reward points
   - Creates reward transaction record
   - Updates user's reward tier

### Test Output

The script provides detailed logging for each step:
```
-----------------------------------
Step: Create Test User
Status: ✅ Success
Data: { user data... }
-----------------------------------

[Additional steps...]

Final Booking Structure:
{
  "id": "...",
  "user": { ... },
  "vehicle": { ... },
  "time_slot": { ... },
  "reward_transactions": [ ... ]
}
```

### Troubleshooting

If the test fails:

1. Check Supabase connection:
   - Verify environment variables
   - Test database access

2. Check table structure:
   - Ensure all required tables exist
   - Verify column names match the script

3. Check RLS policies:
   - Ensure test user has required permissions
   - Verify policy definitions

4. Common errors:
   - "Column not found": Check table schema
   - "Foreign key violation": Check related records exist
   - "Invalid enum value": Check enum definitions 