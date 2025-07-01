# Rewards System Setup Guide

This guide contains only the scripts needed to add the rewards system to your existing database.

## 1. Rewards Tables

### Rewards Table
```sql
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Reward Transactions Table
```sql
CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    points INTEGER NOT NULL,
    type TEXT CHECK (type IN ('earned', 'redeemed')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

## 2. Rewards Indexes
```sql
-- Rewards indexes
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_booking_id ON reward_transactions(booking_id);
```

## 3. Enable RLS for Rewards Tables
```sql
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
```

## 4. RLS Policies for Rewards
```sql
-- Rewards policies
CREATE POLICY "Users can view their own rewards" ON rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update rewards" ON rewards
    FOR ALL USING (true);

-- Reward transactions policies
CREATE POLICY "Users can view their own reward transactions" ON reward_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert reward transactions" ON reward_transactions
    FOR INSERT WITH CHECK (true);
```

## 5. Rewards Functions
```sql
-- Rewards tier calculation function
CREATE OR REPLACE FUNCTION calculate_reward_tier(points INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF points >= 1000 THEN
        RETURN 'gold';
    ELSIF points >= 500 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Rewards tier update function
CREATE OR REPLACE FUNCTION update_reward_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tier = calculate_reward_tier(NEW.points);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 6. Rewards Triggers
```sql
-- Updated timestamp trigger for rewards
CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rewards tier trigger
CREATE TRIGGER update_reward_tier_trigger
    BEFORE INSERT OR UPDATE OF points ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_tier();
```

## Important Notes:
1. Execute these scripts in order (Tables → Indexes → RLS → Policies → Functions → Triggers)
2. The `update_updated_at_column()` function should already exist in your database from previous setup
3. These scripts are idempotent and use `IF NOT EXISTS`, so they're safe to run multiple times
4. Make sure the referenced tables (`users` and `bookings`) exist before running these scripts 