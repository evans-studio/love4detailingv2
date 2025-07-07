'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PaymentFormData, PaymentResult } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { PAYMENT_MESSAGES } from '@/lib/constants/payment';
import { FEATURES, isFeatureEnabled } from '@/lib/constants/features';

const paymentSchema = z.object({
  cardNumber: z.string()
    .min(16, PAYMENT_MESSAGES.CARD_VALIDATION.NUMBER_LENGTH)
    .max(19, PAYMENT_MESSAGES.CARD_VALIDATION.NUMBER_LENGTH)
    .regex(/^[0-9]+$/, PAYMENT_MESSAGES.CARD_VALIDATION.NUMBER_FORMAT),
  expiryMonth: z.string()
    .length(2, PAYMENT_MESSAGES.CARD_VALIDATION.EXPIRY_MONTH)
    .regex(/^(0[1-9]|1[0-2])$/, PAYMENT_MESSAGES.CARD_VALIDATION.EXPIRY_MONTH),
  expiryYear: z.string()
    .length(2, PAYMENT_MESSAGES.CARD_VALIDATION.EXPIRY_YEAR)
    .regex(/^[0-9]{2}$/, PAYMENT_MESSAGES.CARD_VALIDATION.EXPIRY_YEAR),
  cvc: z.string()
    .length(3, PAYMENT_MESSAGES.CARD_VALIDATION.CVC_LENGTH)
    .regex(/^[0-9]+$/, PAYMENT_MESSAGES.CARD_VALIDATION.CVC_FORMAT),
  name: z.string().min(1, PAYMENT_MESSAGES.CARD_VALIDATION.NAME_REQUIRED),
  email: z.string().email(PAYMENT_MESSAGES.CARD_VALIDATION.EMAIL_INVALID),
});

interface PaymentStepProps {
  amount: number;
  onPaymentComplete: (result: PaymentResult) => void;
  onBack: () => void;
}

export function PaymentStep({ amount, onPaymentComplete, onBack }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!isFeatureEnabled('PAYMENTS.STRIPE_ENABLED')) {
        // Mock payment flow
        await new Promise(resolve => setTimeout(resolve, 2000));

        onPaymentComplete({
          success: true,
          paymentIntent: {
            id: `mock_payment_${Date.now()}`,
            amount,
            currency: 'GBP',
            status: 'paid',
            clientSecret: 'mock_secret',
          },
        });
      } else {
        // Real Stripe integration will go here
        throw new Error('Stripe integration not yet implemented');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : PAYMENT_MESSAGES.PROCESSING_FAILED;
      setError(errorMessage);
      onPaymentComplete({
        success: false,
        error: {
          code: 'payment_failed',
          message: errorMessage,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Payment Details</h2>
          <p className="text-gray-600 mt-2">
            Total amount: {formatPrice(amount)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Card Number
              </label>
              <Input
                {...register('cardNumber')}
                placeholder="1234 5678 9012 3456"
                error={!!errors.cardNumber}
                helperText={errors.cardNumber?.message}
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Month
                </label>
                <Input
                  {...register('expiryMonth')}
                  placeholder="MM"
                  error={!!errors.expiryMonth}
                  helperText={errors.expiryMonth?.message}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <Input
                  {...register('expiryYear')}
                  placeholder="YY"
                  error={!!errors.expiryYear}
                  helperText={errors.expiryYear?.message}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  CVC
                </label>
                <Input
                  {...register('cvc')}
                  placeholder="123"
                  error={!!errors.cvc}
                  helperText={errors.cvc?.message}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Name on Card
              </label>
              <Input
                {...register('name')}
                placeholder="John Smith"
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                {...register('email')}
                placeholder="john@example.com"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isProcessing}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm mt-2">
              {error}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className={isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isProcessing ? 'Processing...' : `Pay ${formatPrice(amount)}`}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
} 