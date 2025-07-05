-- Fix the reward transaction trigger to handle constraint violations gracefully
DROP TRIGGER IF EXISTS create_reward_transaction_trigger ON bookings;

-- Create improved function to handle reward transactions with error handling
CREATE OR REPLACE FUNCTION create_reward_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reward transaction if the booking has a user_id
    IF NEW.user_id IS NOT NULL THEN
        -- Calculate points (10 points per £1)
        DECLARE
            points_earned INTEGER := (NEW.total_price_pence / 100) * 10;
        BEGIN
            -- Try to create reward transaction, ignore if it already exists
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
            )
            ON CONFLICT (booking_id) DO NOTHING;

            -- Update user's total points (handle existing rewards gracefully)
            INSERT INTO rewards (user_id, points)
            VALUES (NEW.user_id, points_earned)
            ON CONFLICT (user_id)
            DO UPDATE SET points = rewards.points + points_earned;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the booking creation
                RAISE WARNING 'Failed to create reward transaction for booking %: %', NEW.id, SQLERRM;
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