'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardTransaction {
  id: string;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  created_at: string;
}

export function RewardsHistory() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial mount, render a simplified version
  if (!mounted) {
    return (
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Points History</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Points History</h2>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-full',
                  transaction.type === 'earned'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                )}
              >
                {transaction.type === 'earned' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <div
              className={cn(
                'font-medium',
                transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {transaction.type === 'earned' ? '+' : '-'}
              {transaction.points} points
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
} 