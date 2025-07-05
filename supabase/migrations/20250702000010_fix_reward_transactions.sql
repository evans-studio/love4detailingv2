-- Drop existing trigger first
DROP TRIGGER IF EXISTS create_reward_transaction_trigger ON bookings;

-- Drop existing function
DROP FUNCTION IF EXISTS create_reward_transaction;

-- Modify reward_transactions table to allow NULL user_id
ALTER TABLE reward_transactions
ALTER COLUMN user_id DROP NOT NULL;

-- Recreate function to handle reward transactions
CREATE OR REPLACE FUNCTION create_reward_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reward transaction if the booking has a user_id
    IF NEW.user_id IS NOT NULL THEN
        -- Calculate points (10 points per £1)
        DECLARE
            points_earned INTEGER := (NEW.total_price_pence / 100) * 10;
        BEGIN
            -- Create reward transaction
            INSERT INTO reward_transactions (
                user_id,
                booking_id,
                points,
                type,
                description
            ) VALUES (
                NEW.user_id,
                NEW.id,
                points_earned,
                'earned',
                CONCAT('Points earned from booking ', NEW.booking_reference)
            );

            -- Update user's total points
            INSERT INTO rewards (user_id, points)
            VALUES (NEW.user_id, points_earned)
            ON CONFLICT (user_id)
            DO UPDATE SET points = rewards.points + points_earned;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for reward transactions
CREATE TRIGGER create_reward_transaction_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_reward_transaction(); 