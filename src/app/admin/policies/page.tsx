'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileText, 
  Save,
  Clock,
  DollarSign,
  AlertCircle,
  Shield,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BusinessPolicy {
  id: string;
  policy_key: string;
  policy_value: any;
  description: string;
}

const policySchema = z.object({
  cancellation_window_hours: z.number().min(0, 'Must be 0 or positive').max(168, 'Maximum 7 days (168 hours)'),
  reschedule_window_hours: z.number().min(0, 'Must be 0 or positive').max(168, 'Maximum 7 days (168 hours)'),
  reschedule_fee_pence: z.number().min(0, 'Fee must be 0 or positive'),
  late_cancellation_fee_pence: z.number().min(0, 'Fee must be 0 or positive'),
  terms_and_conditions: z.string().min(10, 'Terms must be at least 10 characters'),
  cancellation_policy_text: z.string().min(10, 'Policy text must be at least 10 characters'),
});

type PolicyFormData = z.infer<typeof policySchema>;

const DEFAULT_POLICIES = {
  cancellation_window_hours: 24,
  reschedule_window_hours: 12,
  reschedule_fee_pence: 0,
  late_cancellation_fee_pence: 0,
  terms_and_conditions: "By booking with Love4Detailing, you agree to our terms of service and cancellation policy. We reserve the right to cancel or reschedule appointments due to weather conditions or unforeseen circumstances.",
  cancellation_policy_text: "Cancellations must be made at least 24 hours in advance. Late cancellations may incur a fee. Rescheduling is allowed up to 12 hours before your appointment."
};

export default function PolicySettings() {
  const [policies, setPolicies] = useState<BusinessPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClientComponentClient();

  const form = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: DEFAULT_POLICIES,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      // Try to fetch from business_policies table if it exists
      // Otherwise fall back to default values
      try {
        const { data, error } = await supabase
          .from('business_policies')
          .select('*')
          .order('policy_key');

        if (!error && data) {
          setPolicies(data);

          // Set form values from database
          const formData: any = { ...DEFAULT_POLICIES };
          
          data.forEach(policy => {
            const value = policy.policy_value?.value;
            if (value !== undefined) {
              formData[policy.policy_key] = value;
            }
          });

          form.reset(formData);
        } else {
          // Table doesn't exist or error - use defaults
          form.reset(DEFAULT_POLICIES);
        }
      } catch (tableError) {
        // Table doesn't exist - use defaults
        console.log('Business policies table not available, using defaults');
        form.reset(DEFAULT_POLICIES);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      // Fall back to defaults
      form.reset(DEFAULT_POLICIES);
    } finally {
      setLoading(false);
    }
  };

  const savePolicies = async (data: PolicyFormData) => {
    setSaving(true);
    try {
      // Try to save to business_policies table if it exists
      try {
        // Update each policy
        for (const [key, value] of Object.entries(data)) {
          const { error } = await supabase
            .from('business_policies')
            .upsert({
              policy_key: key,
              policy_value: { value },
              description: getPolicyDescription(key),
            }, {
              onConflict: 'policy_key',
            });
          
          if (error) throw error;
        }

        await fetchPolicies();
        alert('Policies updated successfully!');
      } catch (tableError) {
        // Table doesn't exist - just store in memory for this session
        console.log('Business policies table not available, policies stored temporarily');
        alert('Policies updated for this session (note: changes will not persist without database table)');
      }
    } catch (error) {
      console.error('Error saving policies:', error);
      alert('Failed to update policies. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPolicyDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      cancellation_window_hours: 'Hours before booking that cancellation is allowed without penalty',
      reschedule_window_hours: 'Hours before booking that rescheduling is allowed',
      reschedule_fee_pence: 'Fee charged for rescheduling in pence',
      late_cancellation_fee_pence: 'Fee charged for late cancellation in pence',
      terms_and_conditions: 'Terms and conditions text displayed to customers',
      cancellation_policy_text: 'Cancellation policy displayed to customers',
    };
    return descriptions[key] || '';
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all policies to default values?')) {
      form.reset(DEFAULT_POLICIES);
    }
  };

  const previewPolicy = () => {
    const values = form.getValues();
    const preview = `
CANCELLATION POLICY:
${values.cancellation_policy_text}

TERMS & CONDITIONS:
${values.terms_and_conditions}

FEES:
- Reschedule Fee: ${formatCurrency(values.reschedule_fee_pence / 100)}
- Late Cancellation Fee: ${formatCurrency(values.late_cancellation_fee_pence / 100)}

TIME LIMITS:
- Cancellation Window: ${values.cancellation_window_hours} hours
- Reschedule Window: ${values.reschedule_window_hours} hours
    `.trim();

    alert(preview);
  };

  if (loading) {
    return <LoadingState>Loading policy settings...</LoadingState>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Policy Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure cancellation, rescheduling, and business policies
        </p>
      </div>

      <form onSubmit={form.handleSubmit(savePolicies)} className="space-y-8">
        {/* Time Windows */}
        <Card className="p-6">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Time Windows</h2>
              <p className="text-gray-600 mt-1">Set time limits for cancellations and rescheduling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Window (Hours)
              </label>
              <Input
                type="number"
                min="0"
                max="168"
                {...form.register('cancellation_window_hours', {
                  setValueAs: (value) => parseInt(value) || 0,
                })}
                error={!!form.formState.errors.cancellation_window_hours}
              />
              {form.formState.errors.cancellation_window_hours && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.cancellation_window_hours.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Customers can cancel without penalty up to this many hours before their booking
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reschedule Window (Hours)
              </label>
              <Input
                type="number"
                min="0"
                max="168"
                {...form.register('reschedule_window_hours', {
                  setValueAs: (value) => parseInt(value) || 0,
                })}
                error={!!form.formState.errors.reschedule_window_hours}
              />
              {form.formState.errors.reschedule_window_hours && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.reschedule_window_hours.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Customers can reschedule up to this many hours before their booking
              </p>
            </div>
          </div>
        </Card>

        {/* Fees */}
        <Card className="p-6">
          <div className="flex items-center mb-6">
            <DollarSign className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Fees</h2>
              <p className="text-gray-600 mt-1">Set fees for late changes and cancellations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reschedule Fee (£)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-10"
                  {...form.register('reschedule_fee_pence', {
                    setValueAs: (value) => Math.round(parseFloat(value || '0') * 100),
                  })}
                  error={!!form.formState.errors.reschedule_fee_pence}
                  defaultValue={(form.watch('reschedule_fee_pence') || 0) / 100}
                />
              </div>
              {form.formState.errors.reschedule_fee_pence && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.reschedule_fee_pence.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Fee charged when customers reschedule within the time window
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Cancellation Fee (£)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-10"
                  {...form.register('late_cancellation_fee_pence', {
                    setValueAs: (value) => Math.round(parseFloat(value || '0') * 100),
                  })}
                  error={!!form.formState.errors.late_cancellation_fee_pence}
                  defaultValue={(form.watch('late_cancellation_fee_pence') || 0) / 100}
                />
              </div>
              {form.formState.errors.late_cancellation_fee_pence && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.late_cancellation_fee_pence.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Fee charged when customers cancel within the cancellation window
              </p>
            </div>
          </div>
        </Card>

        {/* Policy Text */}
        <Card className="p-6">
          <div className="flex items-center mb-6">
            <FileText className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Policy Text</h2>
              <p className="text-gray-600 mt-1">Customer-facing policy descriptions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Policy Text
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                {...form.register('cancellation_policy_text')}
                placeholder="Enter the cancellation policy that customers will see..."
              />
              {form.formState.errors.cancellation_policy_text && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.cancellation_policy_text.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                This text will be displayed to customers during booking and in confirmations
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions
              </label>
              <textarea
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                {...form.register('terms_and_conditions')}
                placeholder="Enter your terms and conditions..."
              />
              {form.formState.errors.terms_and_conditions && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.terms_and_conditions.message}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                General terms and conditions that customers agree to when booking
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button type="button" variant="outline" onClick={previewPolicy}>
              <Shield className="h-4 w-4 mr-2" />
              Preview Policy
            </Button>
          </div>
          
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Policies'}
          </Button>
        </div>
      </form>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Policy Update Notice</p>
            <p className="text-amber-700 mt-1">
              Policy changes will apply to new bookings immediately. Existing bookings will continue 
              to follow the policies that were in place when they were created. Make sure to communicate 
              any significant policy changes to your customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}