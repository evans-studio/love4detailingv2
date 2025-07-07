import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Section Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
        <div className="h-4 w-96 bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Upcoming Bookings Skeleton */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="pt-4 border-t">
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Service History Skeleton */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
} 