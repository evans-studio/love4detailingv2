import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
        <div className="h-4 w-96 bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Current Status Skeleton */}
      <Card className="mb-8 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
            <div>
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </Card>

      {/* Membership Tiers Skeleton */}
      <section className="mb-12">
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-6 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Coming Soon Skeleton */}
      <Card className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse mx-auto mb-4" />
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mx-auto mb-2" />
        <div className="h-4 w-96 bg-gray-200 animate-pulse rounded mx-auto mb-4" />
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded mx-auto" />
      </Card>
    </div>
  );
} 