import { RegisterForm } from '@/components/auth/RegisterForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account | Love4Detailing',
  description: 'Create your Love4Detailing account to book premium car care services',
}

export default function RegisterPage() {
  return <RegisterForm />
}