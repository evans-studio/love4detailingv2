import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'

interface BookingConfirmationPageProps {
  params: {
    reference: string
  }
}

export default async function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const supabase = createClient()
  
  // Fetch booking details
  const { data: booking, error } = await supabase
    .from('booking_summaries')
    .select('*')
    .eq('booking_reference', params.reference)
    .single()

  if (error || !booking) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#141414]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <BookingConfirmation booking={booking} />
      </div>
    </main>
  )
}