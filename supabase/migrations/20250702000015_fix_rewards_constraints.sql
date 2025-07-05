-- Add unique constraint on user_id in rewards table
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS unique_user_rewards;
ALTER TABLE rewards ADD CONSTRAINT unique_user_rewards UNIQUE (user_id);

-- Add type column to reward_transactions if it doesn't exist
ALTER TABLE reward_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'earned';

-- Remove duplicate reward transactions
WITH duplicates AS (
  SELECT booking_id, id as keep_id
  FROM reward_transactions rt1
  WHERE booking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM reward_transactions rt2
    WHERE rt2.booking_id = rt1.booking_id
    AND rt2.id < rt1.id
  )
)
DELETE FROM reward_transactions rt
USING duplicates d
WHERE rt.booking_id = d.booking_id
AND rt.id != d.keep_id;

-- Add unique constraint on booking_id in reward_transactions table
ALTER TABLE reward_transactions DROP CONSTRAINT IF EXISTS unique_booking_transaction;
ALTER TABLE reward_transactions ADD CONSTRAINT unique_booking_transaction UNIQUE (booking_id); 