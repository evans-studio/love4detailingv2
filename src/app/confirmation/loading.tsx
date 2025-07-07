import { Card } from '@/components/ui/card';

export default function ConfirmationLoading() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12 animate-pulse">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-200" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
        <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto" />
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-8 p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <div className="h-10 bg-gray-200 rounded w-full sm:w-40" />
        <div className="h-10 bg-gray-200 rounded w-full sm:w-40" />
      </div>
    </div>
  );
} 