'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/loadingState'

interface ContactData {
  name?: string
  email?: string
  phone?: string
}

interface ContactDetailsProps {
  contactData?: ContactData
  onSubmit: (data: { name: string; email: string; phone: string }) => void
  onBack: () => void
  loading?: boolean
}

export function ContactDetails({
  contactData,
  onSubmit,
  onBack,
  loading = false
}: ContactDetailsProps) {
  const [name, setName] = useState(contactData?.name || '')
  const [email, setEmail] = useState(contactData?.email || '')
  const [phone, setPhone] = useState(contactData?.phone || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone validation (UK format)
    const phoneRegex = /^(?:(?:\+44)|(?:0))?\s?(?:(?:1\d{8,9})|(?:2\d{8,9})|(?:3\d{8,9})|(?:7\d{8,9})|(?:8\d{8,9}))$/
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid UK phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim()
    })
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters except +
    const cleaned = value.replace(/[^\d+]/g, '')
    
    // Format UK numbers
    if (cleaned.startsWith('44')) {
      return '+44 ' + cleaned.slice(2).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
    } else if (cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{5})(\d{3})(\d{3})/, '$1 $2 $3')
    }
    
    return cleaned
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingState>Loading contact form...</LoadingState>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Contact Details</h2>
        <p className="text-gray-600 mb-6">
          Provide your contact information so we can confirm your booking and keep you updated
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="block text-sm font-medium mb-2">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className={errors.name ? 'border-red-500' : ''}
            required
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className={errors.email ? 'border-red-500' : ''}
            required
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            We'll send your booking confirmation to this email address
          </p>
        </div>

        <div>
          <Label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="Enter your phone number"
            className={errors.phone ? 'border-red-500' : ''}
            required
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            We may contact you to confirm your appointment or provide updates
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Your Privacy Matters
            </h4>
            <p className="text-sm text-gray-600">
              We only use your contact information to manage your booking and provide our services. 
              We never share your details with third parties and you can unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Marketing Consent */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="marketing-consent"
            className="mt-0.5 mr-3 h-4 w-4 text-[#9146FF] border-gray-300 rounded focus:ring-[#9146FF]"
          />
          <div>
            <label htmlFor="marketing-consent" className="text-sm font-medium text-blue-900 cursor-pointer">
              Keep me informed about special offers and new services
            </label>
            <p className="text-sm text-blue-700 mt-1">
              Receive occasional emails about promotions, new services, and detailing tips. 
              You can unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
        >
          Back to Date & Time
        </Button>
        <Button 
          type="submit"
          className="flex-1 bg-[#9146FF] hover:bg-[#7c3aed] text-white"
          disabled={!name || !email || !phone}
        >
          Continue to Payment
        </Button>
      </div>
    </form>
  )
}