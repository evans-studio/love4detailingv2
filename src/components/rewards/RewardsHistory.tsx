import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface RewardTransaction {
  id: string;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  created_at: string;
}

interface RewardsHistoryProps {
  transactions: RewardTransaction[];
}

export function RewardsHistory({ transactions }: RewardsHistoryProps) {
  return (
    <Card className="divide-y divide-gray-100">
      <div className="p-4">
        <h3 className="text-lg font-semibold">Points History</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {transactions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No transactions yet. Complete a booking to start earning points!
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    transaction.type === 'earned'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {transaction.type === 'earned' ? (
                    <ArrowUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4" />
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
                className={`font-semibold ${
                  transaction.type === 'earned'
                    ? 'text-green-600'
                    : 'text-amber-600'
                }`}
              >
                {transaction.type === 'earned' ? '+' : '-'}
                {transaction.points}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
} 