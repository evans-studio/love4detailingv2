export const PAYMENT_CONFIG = {
  BASE_PRICE: 5000, // £50.00 in pence
  CURRENCY: 'GBP',
  SIZE_MULTIPLIERS: {
    small: 1,
    medium: 1.2,
    large: 1.5,
  },
  PROVIDER: {
    MOCK: 'mock',
    STRIPE: 'stripe',
  },
} as const;

export const PAYMENT_MESSAGES = {
  INITIALIZATION_FAILED: 'Unable to initialize payment. Please try again.',
  PROCESSING_FAILED: 'Payment processing failed. Please try again.',
  REFUND_FAILED: 'Unable to process refund. Please contact support.',
  INVALID_PAYMENT_INTENT: 'No payment intent ID provided.',
  CARD_VALIDATION: {
    NUMBER_LENGTH: 'Card number must be between 16 and 19 digits',
    NUMBER_FORMAT: 'Card number must contain only digits',
    EXPIRY_MONTH: 'Invalid expiry month',
    EXPIRY_YEAR: 'Invalid expiry year',
    CVC_LENGTH: 'CVC must be 3 digits',
    CVC_FORMAT: 'CVC must contain only digits',
    NAME_REQUIRED: 'Name on card is required',
    EMAIL_INVALID: 'Invalid email address',
  },
} as const; 