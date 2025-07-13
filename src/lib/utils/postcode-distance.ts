export interface PostcodeValidationResult {
  valid: boolean
  serviceAvailable: boolean
  postcode?: string
  distance?: number
  serviceArea?: 'standard' | 'extended' | 'outside'
  travelCharge?: number
  message: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  serviceConfig?: {
    baseLocation: string
    standardRadius: number
    maxServiceRadius: number
  }
}

export interface PostcodeCheckOptions {
  includeCoordinates?: boolean
  timeout?: number
}

/**
 * Check service availability and calculate travel charges for a postcode
 */
export async function checkPostcodeServiceArea(
  postcode: string,
  options: PostcodeCheckOptions = {}
): Promise<PostcodeValidationResult> {
  const { timeout = 5000 } = options
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch('/api/postcode-distance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postcode }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json()
      return {
        valid: false,
        serviceAvailable: false,
        message: errorData.message || 'Unable to validate postcode'
      }
    }
    
    const result = await response.json()
    return result
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valid: false,
        serviceAvailable: false,
        message: 'Request timed out. Please try again.'
      }
    }
    
    console.error('Postcode validation error:', error)
    return {
      valid: false,
      serviceAvailable: false,
      message: 'Unable to check service area. Please try again later.'
    }
  }
}

/**
 * Format UK postcode consistently
 */
export function formatPostcode(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  if (cleaned.length <= 4) return cleaned
  
  const outcode = cleaned.slice(0, -3)
  const incode = cleaned.slice(-3)
  return `${outcode} ${incode}`
}

/**
 * Validate UK postcode format
 */
export function isValidUKPostcode(postcode: string): boolean {
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i
  return ukPostcodeRegex.test(postcode.replace(/\s/g, ''))
}

/**
 * Get service area status message with appropriate styling
 */
export function getServiceAreaMessage(result: PostcodeValidationResult): {
  message: string
  type: 'success' | 'warning' | 'error'
  icon: string
} {
  if (!result.valid) {
    return {
      message: result.message,
      type: 'error',
      icon: '❌'
    }
  }
  
  if (!result.serviceAvailable) {
    return {
      message: result.message,
      type: 'error',
      icon: '❌'
    }
  }
  
  if (result.serviceArea === 'standard') {
    return {
      message: result.message,
      type: 'success',
      icon: '✅'
    }
  }
  
  if (result.serviceArea === 'extended') {
    return {
      message: result.message,
      type: 'warning',
      icon: '⚠️'
    }
  }
  
  return {
    message: result.message,
    type: 'error',
    icon: '❌'
  }
}

/**
 * Calculate total booking price including travel charges
 */
export function calculateTotalWithTravelCharge(
  basePrice: number,
  travelCharge: number = 0
): {
  basePrice: number
  travelCharge: number
  total: number
  breakdown: string[]
} {
  const total = basePrice + travelCharge
  const breakdown = [
    `Service: £${basePrice.toFixed(2)}`
  ]
  
  if (travelCharge > 0) {
    breakdown.push(`Travel charge: £${travelCharge.toFixed(2)}`)
  }
  
  return {
    basePrice,
    travelCharge,
    total,
    breakdown
  }
}

/**
 * Debounce function for postcode input
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}