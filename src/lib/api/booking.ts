import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type { Booking } from '@/lib/validation/booking';

export class BookingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BookingError';
  }
}

interface AnonymousBookingData {
  vehicle_id: string;
  time_slot_id: string;
  vehicle_size_id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface CreateUserResponse {
  user_id: string;
  error?: string;
}

export class BookingService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private supabaseAdmin: ReturnType<typeof createClient<Database>>;

  constructor() {
    // Regular client for public operations
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Admin client for user creation
    this.supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  private async createUserAccount(email: string, full_name: string, phone: string): Promise<CreateUserResponse> {
    try {
      // Create auth user with admin API
      const { data: authUser, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
          phone
        }
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error('No user returned from creation');

      // Create public user profile
      const { error: profileError } = await this.supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: authUser.user.email,
          full_name,
          phone,
          role: 'customer'
        });

      if (profileError) {
        // Cleanup auth user if profile creation fails
        await this.supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw profileError;
      }

      // Create initial rewards record
      await this.supabaseAdmin
        .from('rewards')
        .insert({
          user_id: authUser.user.id,
          points: 0,
          tier: 'bronze'
        });

      return { user_id: authUser.user.id };
    } catch (error) {
      console.error('Error creating user account:', error);
      return { user_id: '', error: 'Failed to create user account' };
    }
  }

  async createAnonymousBooking(data: AnonymousBookingData): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    password_reset_link?: string;
  }> {
    try {
      // Create the booking first
      const { data: booking, error: bookingError } = await this.supabase
        .rpc('create_anonymous_booking', {
          p_time_slot_id: data.time_slot_id,
          p_vehicle_id: data.vehicle_id,
          p_vehicle_size_id: data.vehicle_size_id,
          p_email: data.email,
          p_full_name: data.full_name,
          p_phone: data.phone
        });

      if (bookingError) throw bookingError;

      // Create user account
      const { user_id, error: userError } = await this.createUserAccount(
        data.email,
        data.full_name,
        data.phone
      );

      if (userError) {
        console.error('User creation failed but booking was created:', userError);
        return { success: true, booking };
      }

      // Associate booking with new user
      const { error: updateError } = await this.supabaseAdmin
        .from('bookings')
        .update({ user_id })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Failed to associate booking with user:', updateError);
      }

      // Generate password reset link for the user
      const { data: resetData, error: resetError } = await this.supabaseAdmin.auth.admin
        .generateLink({
          type: 'recovery',
          email: data.email
        });

      if (resetError) {
        console.error('Failed to generate password reset link:', resetError);
        return { success: true, booking };
      }

      return {
        success: true,
        booking,
        password_reset_link: resetData?.properties?.action_link
      };
    } catch (error) {
      console.error('Error in createAnonymousBooking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking'
      };
    }
  }
}

export async function createBooking(bookingData: {
  vehicle_id: string;
  time_slot_id: string;
  vehicle_size_id: string;
  email: string;
  full_name: string;
  phone: string;
}): Promise<{
  success: boolean;
  booking?: Booking;
  error?: string;
  password_reset_link?: string;
}> {
  const bookingService = new BookingService();
  return bookingService.createAnonymousBooking(bookingData);
} 