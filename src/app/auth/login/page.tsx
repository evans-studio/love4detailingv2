import { LoginForm } from '@/components/auth/LoginForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Love4Detailing',
  description: 'Sign in to your Love4Detailing account to manage bookings and vehicle profiles',
}

export default function LoginPage() {
  return <LoginForm />
}