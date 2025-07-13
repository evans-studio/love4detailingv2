# Supabase Setup Guide for Rewards System

## Step 1: Create Types
```sql
-- Create reward-related types if not exists
CREATE TYPE user_role AS ENUM ('customer', 'admin'); -- already exists
```

## Step 2: Create Rewards Tables

### Rewards Table
```sql
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id),
    points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
); -- Success
```

### Reward Transactions Table
```sql
CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id),
    bookingId UUID REFERENCES bookings(id),
    points INTEGER NOT NULL,
    type TEXT CHECK (type IN ('earned', 'redeemed')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
); -- Scuess
```

## Step 3: Create Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(userId);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(userId);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_booking_id ON reward_transactions(bookingId); -- Success
```

## Step 4: Enable RLS and Create Policies
```sql
-- Enable RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY; -- Sucess
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY; -- Success

-- Create policies
CREATE POLICY "Users can view their own rewards" ON rewards
    FOR SELECT USING (auth.uid() = userId); -- Success

CREATE POLICY "Users can view their own reward transactions" ON reward_transactions
    FOR SELECT USING (auth.uid() = userId); -- Success

CREATE POLICY "System can insert reward transactions" ON reward_transactions
    FOR INSERT WITH CHECK (true); -- Success

CREATE POLICY "System can update rewards" ON rewards
    FOR ALL USING (true); -- Success
```

## Step 5: Create Functions
```sql
-- Updated timestamp function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; -- Success

-- Function to calculate tier based on points
CREATE OR REPLACE FUNCTION calculate_reward_tier(points INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF points >= 1000 THEN
        RETURN 'gold';
    ELSIF points >= 500 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF; -- Success
END;
$$ LANGUAGE plpgsql;

-- Function to update tier when points change
CREATE OR REPLACE FUNCTION update_reward_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tier = calculate_reward_tier(NEW.points);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; -- Success
```

## Step 6: Create Triggers
```sql
-- Update timestamps
CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); -- Success

-- Update tier when points change
CREATE TRIGGER update_reward_tier_trigger
    BEFORE INSERT OR UPDATE OF points ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_tier(); -- Success
```

## Important Notes:
1. This guide only includes the rewards system tables and components
2. Make sure the referenced tables (users, bookings) exist before creating these tables
3. Execute these steps in order (Types → Tables → Indexes → RLS → Functions → Triggers)
4. Each section can be copy-pasted directly into the Supabase SQL editor
5. If you encounter any errors, check the error message and ensure all previous steps completed successfully 