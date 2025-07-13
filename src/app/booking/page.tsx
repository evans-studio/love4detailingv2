import { BookingFlow } from '@/components/booking/BookingFlow'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Service | Love4Detailing',
  description: 'Book your premium mobile car detailing service with Love4Detailing',
}

export default function BookingPage() {
  return <BookingFlow />
}