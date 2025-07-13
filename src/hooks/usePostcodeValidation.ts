'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  checkPostcodeServiceArea, 
  PostcodeValidationResult, 
  debounce,
  isValidUKPostcode 
} from '@/lib/utils/postcode-distance'

interface UsePostcodeValidationOptions {
  autoValidate?: boolean
  debounceDelay?: number
  onValidationComplete?: (result: PostcodeValidationResult) => void
}

export function usePostcodeValidation(options: UsePostcodeValidationOptions = {}) {
  const { 
    autoValidate = true, 
    debounceDelay = 500,
    onValidationComplete 
  } = options
  
  const [postcode, setPostcode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PostcodeValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Validate postcode function
  const validatePostcode = useCallback(async (postcodeToValidate: string) => {
    if (!postcodeToValidate.trim()) {
      setResult(null)
      setError(null)
      return
    }
    
    // Basic format validation first
    if (!isValidUKPostcode(postcodeToValidate)) {
      const invalidResult: PostcodeValidationResult = {
        valid: false,
        serviceAvailable: false,
        message: 'Please enter a valid UK postcode'
      }
      setResult(invalidResult)
      setError('Invalid postcode format')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const validationResult = await checkPostcodeServiceArea(postcodeToValidate)
      setResult(validationResult)
      
      if (onValidationComplete) {
        onValidationComplete(validationResult)
      }
      
      if (!validationResult.valid) {
        setError(validationResult.message)
      }
    } catch (err) {
      const errorResult: PostcodeValidationResult = {
        valid: false,
        serviceAvailable: false,
        message: 'Unable to validate postcode. Please try again.'
      }
      setResult(errorResult)
      setError('Validation failed')
    } finally {
      setIsLoading(false)
    }
  }, [onValidationComplete])
  
  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(validatePostcode, debounceDelay),
    [validatePostcode, debounceDelay]
  )
  
  // Auto-validate when postcode changes
  useEffect(() => {
    if (autoValidate && postcode.trim()) {
      debouncedValidate(postcode)
    }
  }, [postcode, autoValidate, debouncedValidate])
  
  // Manual validation trigger
  const validate = useCallback(() => {
    if (postcode.trim()) {
      validatePostcode(postcode)
    }
  }, [postcode, validatePostcode])
  
  // Reset validation state
  const reset = useCallback(() => {
    setPostcode('')
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])
  
  // Update postcode value
  const updatePostcode = useCallback((newPostcode: string) => {
    setPostcode(newPostcode)
    if (!newPostcode.trim()) {
      setResult(null)
      setError(null)
    }
  }, [])
  
  return {
    postcode,
    setPostcode: updatePostcode,
    isLoading,
    result,
    error,
    validate,
    validatePostcode, // Expose the direct validation function
    reset,
    
    // Helper getters
    isValid: result?.valid || false,
    serviceAvailable: result?.serviceAvailable || false,
    serviceArea: result?.serviceArea,
    travelCharge: result?.travelCharge || 0,
    distance: result?.distance,
    message: result?.message || '',
    
    // Status helpers
    isStandardArea: result?.serviceArea === 'standard',
    isExtendedArea: result?.serviceArea === 'extended',
    isOutsideArea: result?.serviceArea === 'outside',
    
    // Pricing helpers
    hasTravelCharge: (result?.travelCharge || 0) > 0,
    formattedDistance: result?.distance ? `${result.distance} miles` : '',
    formattedTravelCharge: result?.travelCharge ? `£${result.travelCharge}` : '',
  }
}