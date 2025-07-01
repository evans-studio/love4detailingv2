import type { Booking } from '@/types';
import { PAYMENT_CONFIG, PAYMENT_MESSAGES } from '@/lib/constants/payment';
import { FEATURES, isFeatureEnabled } from '@/lib/constants/features';

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string): Promise<string>;
  confirmPayment(paymentIntentId: string): Promise<boolean>;
  refundPayment(paymentIntentId: string): Promise<boolean>;
}

export interface PaymentDetails {
  provider: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  metadata?: Record<string, string>;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

/**
 * Mock payment provider for development
 * This will be replaced with Stripe implementation when STRIPE_ENABLED feature is true
 */
class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(amount: number, currency: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `mock_payment_${Date.now()}`;
  }

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  async refundPayment(paymentIntentId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
}

/**
 * Payment service handling all payment-related operations
 * Supports both mock payments and future Stripe integration
 */
export class PaymentService {
  private provider: PaymentProvider;
  private isStripeEnabled: boolean;

  constructor(provider: PaymentProvider = new MockPaymentProvider()) {
    this.provider = provider;
    this.isStripeEnabled = FEATURES.STRIPE_PAYMENTS;
  }

  /**
   * Initialize payment for a booking
   * @param booking - The booking to create payment for
   * @param amount - The amount to charge in pence/cents
   * @returns PaymentDetails object with status and tracking info
   * @throws Error if payment initialization fails
   */
  async initializePayment(
    booking: Booking,
    amount: number
  ): Promise<PaymentDetails> {
    try {
      const paymentIntentId = await this.provider.createPaymentIntent(
        amount,
        PAYMENT_CONFIG.CURRENCY
      );

      return {
        provider: isFeatureEnabled('PAYMENTS.STRIPE_ENABLED') 
          ? PAYMENT_CONFIG.PROVIDER.STRIPE 
          : PAYMENT_CONFIG.PROVIDER.MOCK,
        paymentIntentId,
        amount,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `Booking for ${booking.size} vehicle`,
      };
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      throw new Error(PAYMENT_MESSAGES.INITIALIZATION_FAILED);
    }
  }

  /**
   * Confirm a payment
   * @param paymentDetails - The payment details to confirm
   * @returns Updated PaymentDetails with new status
   */
  async confirmPayment(paymentDetails: PaymentDetails): Promise<PaymentDetails> {
    try {
      if (!paymentDetails.paymentIntentId) {
        throw new Error(PAYMENT_MESSAGES.INVALID_PAYMENT_INTENT);
      }

      const success = await this.provider.confirmPayment(
        paymentDetails.paymentIntentId
      );

      return {
        ...paymentDetails,
        status: success ? 'succeeded' : 'failed',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      return {
        ...paymentDetails,
        status: 'failed',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Process a refund
   * @param paymentDetails - The payment details to refund
   * @returns Updated PaymentDetails with refund status
   * @throws Error if refund processing fails
   */
  async processRefund(paymentDetails: PaymentDetails): Promise<PaymentDetails> {
    try {
      if (!paymentDetails.paymentIntentId) {
        throw new Error(PAYMENT_MESSAGES.INVALID_PAYMENT_INTENT);
      }

      const success = await this.provider.refundPayment(
        paymentDetails.paymentIntentId
      );

      return {
        ...paymentDetails,
        status: success ? 'refunded' : 'failed',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw new Error(PAYMENT_MESSAGES.REFUND_FAILED);
    }
  }

  /**
   * Calculate booking price based on vehicle size
   * @param booking - The booking to calculate price for
   * @returns Total price in pence/cents
   */
  calculateBookingPrice(booking: Booking): number {
    const multiplier = PAYMENT_CONFIG.SIZE_MULTIPLIERS[booking.size];
    return Math.round(PAYMENT_CONFIG.BASE_PRICE * multiplier);
  }

  async processPayment(details: PaymentDetails): Promise<PaymentResult> {
    if (this.isStripeEnabled) {
      return this.processStripePayment(details);
    }
    
    // Default to cash payment
    return {
      success: true,
      transactionId: `CASH-${Date.now()}`,
    };
  }

  private async processStripePayment(details: PaymentDetails): Promise<PaymentResult> {
    try {
      // This is a placeholder for Stripe integration
      // In production, this would:
      // 1. Create a Stripe payment intent
      // 2. Return client secret for frontend confirmation
      // 3. Handle webhooks for payment status updates
      
      console.log('Stripe payment placeholder:', details);
      
      return {
        success: true,
        transactionId: `STRIPE-${Date.now()}`,
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  getPaymentMethods(): string[] {
    return this.isStripeEnabled ? ['card', 'cash'] : ['cash'];
  }

  calculatePrice(size: keyof typeof PAYMENT_CONFIG.SIZE_MULTIPLIERS): number {
    const multiplier = PAYMENT_CONFIG.SIZE_MULTIPLIERS[size];
    return Math.round(PAYMENT_CONFIG.BASE_PRICE * multiplier);
  }
}

/**
 * Future Stripe implementation example:
 * 
 * class StripePaymentProvider implements PaymentProvider {
 *   private stripe: Stripe;
 * 
 *   constructor(apiKey: string) {
 *     this.stripe = new Stripe(apiKey, {
 *       apiVersion: '2023-10-16',
 *     });
 *   }
 * 
 *   async createPaymentIntent(amount: number, currency: string): Promise<string> {
 *     const intent = await this.stripe.paymentIntents.create({
 *       amount,
 *       currency,
 *       automatic_payment_methods: {
 *         enabled: true,
 *       },
 *     });
 *     return intent.id;
 *   }
 * 
 *   async confirmPayment(paymentIntentId: string): Promise<boolean> {
 *     const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
 *     return intent.status === 'succeeded';
 *   }
 * 
 *   async refundPayment(paymentIntentId: string): Promise<boolean> {
 *     const refund = await this.stripe.refunds.create({
 *       payment_intent: paymentIntentId,
 *     });
 *     return refund.status === 'succeeded';
 *   }
 * }
 */ 